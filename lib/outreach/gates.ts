import {
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
  GetAccountSendingEnabledCommand,
} from "@aws-sdk/client-ses";
import { ses } from "@/lib/ses";
import { sql } from "@/lib/db";

/**
 * Pre-send safety gates. Every one of these runs before a tick sends anything, in code, with no
 * flag to skip them.
 *
 * This exists because the account has already been shut down once: on 2026-09-20 a batch went out
 * against a pattern-guessed list, the bounce rate reached 15.85%, and AWS paused sending. Nothing
 * in the pipeline noticed before AWS did. These gates are the part that notices first.
 *
 * AWS's published thresholds: a bounce rate over 5% puts the account under review and over 10%
 * pauses it; a complaint rate over 0.1% triggers review and over 0.5% pauses. Our limits sit well
 * below all four on purpose — by the time AWS acts, recovery is a support case, not a code change.
 *
 * Deliberately built on @aws-sdk/client-ses, which the app already depends on, rather than
 * CloudWatch. GetSendStatistics returns 15-minute buckets for the last two weeks, which is a
 * fresher and more granular read than the Reputation.* metrics, and it avoids adding a dependency
 * (and an IAM permission) to a deploy whose whole job is to be boring.
 */

export const LIMITS = {
  /** Warn: halve the day's capacity. */
  bounceWarn: 0.02,
  /** Stop. AWS reviews at 0.05 and pauses at 0.10. */
  bounceStop: 0.03,
  complaintWarn: 0.0005,
  /** Stop. AWS reviews at 0.001 and pauses at 0.005. */
  complaintStop: 0.001,
  /** Never consume the whole quota — transactional mail (sign-in codes) shares this account. */
  quotaUtilisation: 0.7,
  /** Reserved headroom for transactional mail, subtracted before any campaign capacity. */
  transactionalReserve: 2000,
  /** Our own bounce rate, over our own send history, excluding validation suppressions. */
  selfBounceStop: 0.04,
  selfBounceMinSample: 200,
} as const;

export type GateVerdict = {
  ok: boolean;
  blockedBy: string | null;
  reason: string | null;
  /** Multiplier applied to planned capacity: 1 normally, 0.5 in a warn state, 0 when blocked. */
  capacityFactor: number;
  metrics: {
    sendingEnabled: boolean;
    max24Hour: number;
    sentLast24Hours: number;
    maxSendRate: number;
    quotaHeadroom: number;
    bounceRate: number | null;
    complaintRate: number | null;
    selfBounceRate: number | null;
    selfSample: number;
  };
};

/**
 * Recent account-wide bounce/complaint rates from SES's own statistics.
 *
 * Windowed to the last 24h of 15-minute buckets rather than the full two weeks SES returns: a
 * two-week average hides a problem that started this morning, which is exactly the problem a
 * pre-send gate exists to catch.
 */
async function recentRates(): Promise<{ bounceRate: number | null; complaintRate: number | null }> {
  try {
    const stats = await ses.send(new GetSendStatisticsCommand({}));
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let attempts = 0, bounces = 0, complaints = 0;
    for (const p of stats.SendDataPoints ?? []) {
      if (!p.Timestamp || p.Timestamp.getTime() < cutoff) continue;
      attempts += p.DeliveryAttempts ?? 0;
      bounces += p.Bounces ?? 0;
      complaints += p.Complaints ?? 0;
    }
    if (attempts === 0) return { bounceRate: null, complaintRate: null };
    return { bounceRate: bounces / attempts, complaintRate: complaints / attempts };
  } catch {
    // A gate that cannot read its own metric must not silently pass. The caller treats null as
    // "unknown" and refuses to raise capacity on it.
    return { bounceRate: null, complaintRate: null };
  }
}

/**
 * Our own bounce rate for this campaign, from our own records.
 *
 * Counts only bounces that say something about list quality. Validation suppressions are excluded
 * because SES stopped those before delivery was attempted — they are a cost, not a reputation
 * signal, and folding them in would make a clean list read as 50% rotten and trip this gate for
 * the wrong reason.
 */
async function selfBounceRate(campaignId: string): Promise<{ rate: number | null; sample: number }> {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE touch_count > 0)::int AS attempted,
      count(*) FILTER (WHERE bounce_kind IN ('hard_mta', 'mailbox_full', 'transient'))::int AS bad
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
  `;
  const r = rows[0] as { attempted: number; bad: number } | undefined;
  if (!r || r.attempted < LIMITS.selfBounceMinSample) return { rate: null, sample: r?.attempted ?? 0 };
  return { rate: r.bad / r.attempted, sample: r.attempted };
}

export async function checkGates(campaignId: string): Promise<GateVerdict> {
  const blocked = (blockedBy: string, reason: string, m: GateVerdict["metrics"]): GateVerdict => ({
    ok: false, blockedBy, reason, capacityFactor: 0, metrics: m,
  });

  const [quota, sendingEnabledRes, rates, self] = await Promise.all([
    ses.send(new GetSendQuotaCommand({})),
    ses.send(new GetAccountSendingEnabledCommand({})).catch(() => ({ Enabled: true })),
    recentRates(),
    selfBounceRate(campaignId),
  ]);

  const max24Hour = quota.Max24HourSend ?? 0;
  const sentLast24Hours = quota.SentLast24Hours ?? 0;
  const rawHeadroom = Math.max(0, Math.floor(max24Hour * LIMITS.quotaUtilisation) - sentLast24Hours);
  const quotaHeadroom = Math.max(0, rawHeadroom - LIMITS.transactionalReserve);

  const metrics: GateVerdict["metrics"] = {
    sendingEnabled: sendingEnabledRes.Enabled !== false,
    max24Hour,
    sentLast24Hours,
    maxSendRate: quota.MaxSendRate ?? 0,
    quotaHeadroom,
    bounceRate: rates.bounceRate,
    complaintRate: rates.complaintRate,
    selfBounceRate: self.rate,
    selfSample: self.sample,
  };

  // Gate 1 — account enforcement. Not a rate limit: it does not clear on its own, and every send
  // until a human resolves it with AWS will fail identically.
  if (!metrics.sendingEnabled) {
    return blocked("account_paused", "SES account sending is disabled — resolve with AWS before retrying", metrics);
  }

  // Gate 2 — account complaint rate. Checked before bounce because its budget is ~50x tighter:
  // 0.1% is one complaint per thousand sends.
  if (rates.complaintRate !== null && rates.complaintRate >= LIMITS.complaintStop) {
    return blocked("complaint_rate", `complaint rate ${(rates.complaintRate * 100).toFixed(3)}% >= ${(LIMITS.complaintStop * 100).toFixed(3)}%`, metrics);
  }

  // Gate 3 — account bounce rate.
  if (rates.bounceRate !== null && rates.bounceRate >= LIMITS.bounceStop) {
    return blocked("bounce_rate", `bounce rate ${(rates.bounceRate * 100).toFixed(2)}% >= ${(LIMITS.bounceStop * 100).toFixed(2)}%`, metrics);
  }

  // Gate 4 — this campaign's own record. Catches a bad list before it moves the account-wide
  // number, which is a trailing average over everything the account sends.
  if (self.rate !== null && self.rate >= LIMITS.selfBounceStop) {
    return blocked("self_bounce_rate", `campaign bounce rate ${(self.rate * 100).toFixed(1)}% over ${self.sample} sends`, metrics);
  }

  // Gate 5 — quota.
  if (quotaHeadroom <= 0) {
    return blocked("quota", `no headroom: ${sentLast24Hours}/${max24Hour} used, ${LIMITS.transactionalReserve} reserved for transactional`, metrics);
  }

  // Warn states halve capacity rather than stopping. Sending less is itself a corrective action:
  // the rates are ratios, so a smaller denominator with the same list makes things worse, but a
  // smaller batch limits how much new damage one tick can do while the cause is investigated.
  let capacityFactor = 1;
  let reason: string | null = null;
  if (rates.complaintRate !== null && rates.complaintRate >= LIMITS.complaintWarn) {
    capacityFactor = 0.5;
    reason = `complaint rate ${(rates.complaintRate * 100).toFixed(3)}% in warn band — capacity halved`;
  } else if (rates.bounceRate !== null && rates.bounceRate >= LIMITS.bounceWarn) {
    capacityFactor = 0.5;
    reason = `bounce rate ${(rates.bounceRate * 100).toFixed(2)}% in warn band — capacity halved`;
  } else if (rates.bounceRate === null) {
    // Unknown is not good news. Run, but do not run at full size on a metric we could not read.
    capacityFactor = 0.5;
    reason = "SES send statistics unavailable — capacity halved";
  }

  return { ok: true, blockedBy: null, reason, capacityFactor, metrics };
}
