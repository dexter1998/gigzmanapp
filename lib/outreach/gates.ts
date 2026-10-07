import {
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
  GetAccountSendingEnabledCommand,
} from "@aws-sdk/client-ses";
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { ses } from "@/lib/ses";
import { sql } from "@/lib/db";

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION ?? "ap-south-1" });

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
 * STOPPING is decided on Reputation.BounceRate and Reputation.ComplaintRate — the metrics AWS
 * itself reviews and suspends on. An earlier version computed its own ratio from
 * GetSendStatistics over 24h and halted the campaign four separate times on days AWS had no
 * objection to: measured 2026-10-02, that ratio read 3.49% and 44.83% at moments when the real
 * figure was 1.046%. A short window has too few sends to average over, so one bad address, or a
 * handful of deliberate test bounces, reads as a catastrophe.
 *
 * The ratio is still read, but only to throttle. A gate that stops sending is answering "will
 * AWS act", and only AWS's own number answers that.
 *
 * Alongside the rates there is an absolute budget: a percentage of the day's quota, in bounces.
 * A rate says nothing early in a day — two bounces out of ten is 20% — whereas "47 of a 2,577
 * bounce budget used" is meaningful from the first send.
 */

export const LIMITS = {
  /** Warn: halve the day's capacity. Read from the 24h ratio, which runs hot at low volume. */
  bounceWarn: 0.02,
  /** Stop, on AWS's own Reputation.BounceRate. AWS reviews at 0.05 and pauses at 0.10. */
  reputationBounceStop: 0.04,
  /**
   * Stop, on AWS's own Reputation.ComplaintRate. AWS reviews at 0.001 and pauses at 0.005.
   *
   * The same deadlock has now happened three times, at 0.0008 (2026-10-04), 0.0009 (2026-10-06)
   * and again on 2026-10-07. The metric is complaints divided by sends over a window far longer
   * than a day, so stopping freezes it: on 2026-10-07 it held 0.0010845986984815619 — identical
   * to sixteen decimal places — across fourteen hours and 48 blocked ticks, while 19,008
   * recipients aged past their scheduled touch. A stop keyed on a ratio that only improves by
   * sending cannot release itself, and each time it has been "fixed" by nudging the number up a
   * notch, which buys a day.
   *
   * 0.0025 is set deliberately above AWS's 0.001 review line and still 2x below the 0.005 pause
   * line. That is a real trade: above the review line AWS may look at the account. The case for
   * it is that what AWS would find is good — 7 complaints against 60,860 sends in the 24h to
   * 2026-10-07, 0.0115% — because this metric is a long trailing average dominated by older
   * volume, not a description of what is being sent now.
   *
   * The structural half of the fix is below: warn states and campaign-local bounce now throttle
   * NEW contacts only, never follow-ups.
   */
  reputationComplaintStop: 0.0025,
  /**
   * The day's bounce allowance, as a share of the daily sending quota.
   *
   * Absolute rather than a ratio, because a ratio is meaningless until the denominator is large
   * and most dangerous exactly when it is small. At an 85,900 quota this is 2,577 bounces — the
   * number that would put the account at 3% if the whole quota were used, comfortably under AWS's
   * 5% review line, and it reads the same at send 10 as at send 10,000.
   */
  dailyBouncePct: 0.03,
  complaintWarn: 0.0005,
  /** Share of the daily quota outreach may use. The rest is not spare: sign-in codes, password
   *  resets and lifecycle mail share this account, and a prospecting campaign that eats the whole
   *  quota locks real customers out of their own logins. */
  quotaUtilisation: 0.9,
  /** Hard floor kept back for transactional mail on top of the utilisation cap. */
  transactionalReserve: 2000,
  /**
   * Our own bounce rate, over our own sends, excluding validation suppressions.
   *
   * Two levels, because one was wrong in both directions. A campaign-local rate is an early
   * warning, not the number AWS enforces on: measured 2026-10-02, this campaign sat at 4.30%
   * while AWS's own Reputation.BounceRate never moved off 1.046%, because a few thousand sends
   * barely register against the account's rolling denominator. Stopping there halts a campaign
   * nobody is complaining about.
   *
   * It cannot be ignored either, because the account metric LAGS — on 2026-09-20 the real rate
   * reached 45.7% and nothing noticed until AWS suspended the account. So the local number
   * throttles early and stops only when it is unambiguously bad; the account-level gates stay
   * the hard line.
   */
  selfBounceWarn: 0.04,
  selfBounceStop: 0.1,
  selfBounceMinSample: 200,
  /**
   * How far back the campaign's own bounce rate looks.
   *
   * Lifetime was wrong, and wrong in the direction that hides itself: a bad stretch can only be
   * diluted by sending more good mail, but the warn it triggers halves capacity, so the mail that
   * would clear it arrives at half speed. The gate feeds itself. Measured 2026-10-02, the campaign
   * sat at 5.2% over 28,049 lifetime sends and needed ~8,400 further perfect sends to fall under
   * the 4% warn — at half rate, days of throttling over bounces nothing can now change.
   *
   * Three days rather than 24h because bounces arrive asynchronously: a send late in the day is
   * still bouncing the next morning, and a 24h window would keep re-scoring the same batch as its
   * failures trickle in. This is the "is the list we are mailing RIGHT NOW bad" question, which is
   * what a throttle should act on. The account-level reputation gates remain the hard line.
   */
  selfBounceWindowDays: 3,
  /**
   * Attempts needed in the 24h window before the account rate is allowed to block anything.
   *
   * Without this the gate reads noise as catastrophe. Measured 2026-10-02: a 100-message
   * capability test (deliberately including simulator bounce addresses) left the window at 26
   * bounces over 58 attempts — 44.8% — and blocked the campaign, while the metric AWS actually
   * enforces on, Reputation.BounceRate, sat at 1.05%. Any low-volume day has the same shape: a
   * handful of sends and one dead address reads as a disaster.
   *
   * 500 is roughly where one bounce stops moving the rate by more than a fifth of a percent.
   */
  rateMinSample: 500,
} as const;

export type GateVerdict = {
  ok: boolean;
  blockedBy: string | null;
  reason: string | null;
  /** Multiplier applied to planned capacity: 1 normally, 0 when blocked. */
  capacityFactor: number;
  /**
   * Extra multiplier applied to NEW contacts only, on top of capacityFactor.
   *
   * Every rate this module watches is driven by first contacts. A follow-up goes to an address
   * that has already accepted mail from us, so it cannot produce the hard bounce the warn is
   * reacting to; throttling follow-ups to fix a bounce rate only ages the sequence while doing
   * nothing to the number. So a warn now halves (or zeroes) new contacts and lets the follow-up
   * backlog drain at full speed.
   */
  newCapacityFactor: number;
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
    /** AWS's own figures — the ones reviews and suspensions key off. */
    reputationBounceRate: number | null;
    reputationComplaintRate: number | null;
    bounceBudget: number;
    bouncesToday: number;
  };
};

/**
 * AWS's own reputation figures, the ones it reviews and suspends on.
 *
 * Averaged over a rolling window far longer than a day, which is exactly why they are the right
 * basis for stopping: they do not lurch on a quiet morning or a test batch. Returns null on
 * failure, and the caller refuses to raise capacity on a metric it could not read rather than
 * assuming the best.
 */
/**
 * How long a reputation reading is reused.
 *
 * AWS publishes these as a long trailing average and they move in hourly steps at best — on
 * 2026-10-07 the complaint figure was byte-identical for fourteen consecutive hours. Reading it
 * every 15-minute tick spends four CloudWatch calls an hour to watch a number that cannot have
 * changed, and makes every tick's decision depend on a network call that can fail.
 */
const REPUTATION_TTL_MS = 60 * 60 * 1000;
let reputationCache: { at: number; bounce: number | null; complaint: number | null } | null = null;

/** Clears the hourly reputation cache. For tests, and for a manual run that must not reuse it. */
export function clearReputationCache(): void {
  reputationCache = null;
}

async function reputationRates(): Promise<{ bounce: number | null; complaint: number | null }> {
  if (reputationCache && Date.now() - reputationCache.at < REPUTATION_TTL_MS) {
    return { bounce: reputationCache.bounce, complaint: reputationCache.complaint };
  }
  const now = new Date();
  const read = async (metric: string): Promise<number | null> => {
    try {
      const out = await cloudwatch.send(new GetMetricStatisticsCommand({
        Namespace: "AWS/SES",
        MetricName: metric,
        StartTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        EndTime: now,
        Period: 3600,
        Statistics: ["Maximum"],
      }));
      const points = (out.Datapoints ?? []).sort(
        (a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0)
      );
      return points.length ? points[points.length - 1].Maximum ?? null : null;
    } catch {
      return null;
    }
  };
  const [bounce, complaint] = await Promise.all([
    read("Reputation.BounceRate"),
    read("Reputation.ComplaintRate"),
  ]);
  // A failed read is not cached: an hour of assuming the best on a metric we could not fetch is
  // exactly the hour in which something goes wrong unnoticed.
  if (bounce !== null || complaint !== null) {
    reputationCache = { at: Date.now(), bounce, complaint };
  }
  return { bounce, complaint };
}

/** Real hard bounces this campaign has produced today — the budget's consumption. */
async function bouncesToday(campaignId: string): Promise<number> {
  const rows = await sql`
    SELECT count(DISTINCT es.recipient)::int AS n
    FROM email_sends es
    JOIN campaign_recipients cr ON cr.email = es.recipient AND cr.campaign_id = es.campaign_id
    WHERE es.campaign_id = ${campaignId}
      AND es.ses_message_id IS NOT NULL
      AND es.sent_at >= date_trunc('day', now())
      AND cr.bounce_kind = 'hard_mta'
  `;
  return (rows[0] as { n: number }).n;
}

/**
 * Recent account-wide bounce/complaint rates from SES's own statistics.
 *
 * Windowed to the last 24h of 15-minute buckets rather than the full two weeks SES returns: a
 * two-week average hides a problem that started this morning, which is exactly the problem a
 * pre-send gate exists to catch.
 */
async function recentRates(): Promise<{ bounceRate: number | null; complaintRate: number | null; attempts: number }> {
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
    // Below the minimum sample the rate is not a measurement, so it is reported as unknown
    // rather than as a number the caller will act on.
    if (attempts < LIMITS.rateMinSample) return { bounceRate: null, complaintRate: null, attempts };
    return { bounceRate: bounces / attempts, complaintRate: complaints / attempts, attempts };
  } catch {
    // A gate that cannot read its own metric must not silently pass. The caller treats null as
    // "unknown" and refuses to raise capacity on it.
    return { bounceRate: null, complaintRate: null, attempts: 0 };
  }
}

/**
 * This campaign's own bounce rate, over sends this pipeline actually made.
 *
 * Counts only bounces that say something about list quality. Validation suppressions are excluded
 * because SES stopped those before delivery was attempted — they are a cost, not a reputation
 * signal, and folding them in would make a clean list read as 50% rotten and trip this gate for
 * the wrong reason.
 */
async function selfBounceRate(campaignId: string): Promise<{ rate: number | null; sample: number }> {
  // Counted over sends THIS pipeline actually made, inside selfBounceWindowDays, not over the
  // imported backlog.
  //
  // Imported leads carry the bounce history of the campaigns they came from — 4,112 hard bounces
  // from sends made months ago with Auto Validation switched off. Those addresses are already
  // do_not_send and can never be mailed again, so charging them against today's health blocks
  // every future run on a number nothing can improve. A synthetic email_sends row (one written
  // to record a touch that happened before this campaign existed) has a NULL ses_message_id; a
  // real send always has one, because sendBulkEmail writes it back from the SES response.
  const rows = await sql`
    SELECT
      count(DISTINCT es.recipient)::int AS attempted,
      count(DISTINCT es.recipient) FILTER (
        WHERE cr.bounce_kind IN ('hard_mta', 'mailbox_full', 'transient')
      )::int AS bad
    FROM email_sends es
    JOIN campaign_recipients cr ON cr.email = es.recipient AND cr.campaign_id = es.campaign_id
    WHERE es.campaign_id = ${campaignId} AND es.ses_message_id IS NOT NULL
      AND es.sent_at > now() - (${LIMITS.selfBounceWindowDays} || ' days')::interval
  `;
  const r = rows[0] as { attempted: number; bad: number } | undefined;
  if (!r || r.attempted < LIMITS.selfBounceMinSample) return { rate: null, sample: r?.attempted ?? 0 };
  return { rate: r.bad / r.attempted, sample: r.attempted };
}

export async function checkGates(campaignId: string): Promise<GateVerdict> {
  const blocked = (blockedBy: string, reason: string, m: GateVerdict["metrics"]): GateVerdict => ({
    ok: false, blockedBy, reason, capacityFactor: 0, newCapacityFactor: 0, metrics: m,
  });

  const [quota, sendingEnabledRes, rates, self, rep, todaysBounces] = await Promise.all([
    ses.send(new GetSendQuotaCommand({})),
    ses.send(new GetAccountSendingEnabledCommand({})).catch(() => ({ Enabled: true })),
    recentRates(),
    selfBounceRate(campaignId),
    reputationRates(),
    bouncesToday(campaignId),
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
    reputationBounceRate: rep.bounce,
    reputationComplaintRate: rep.complaint,
    bounceBudget: Math.floor(max24Hour * LIMITS.dailyBouncePct),
    bouncesToday: todaysBounces,
  };

  // Gate 1 — account enforcement. Not a rate limit: it does not clear on its own, and every send
  // until a human resolves it with AWS will fail identically.
  if (!metrics.sendingEnabled) {
    return blocked("account_paused", "SES account sending is disabled — resolve with AWS before retrying", metrics);
  }

  // Gate 2 — AWS's own complaint rate. Checked before bounce because its budget is ~50x tighter:
  // 0.1% is one complaint per thousand sends, and a complaint cannot be taken back.
  if (rep.complaint !== null && rep.complaint >= LIMITS.reputationComplaintStop) {
    return blocked("complaint_rate",
      `AWS Reputation.ComplaintRate ${(rep.complaint * 100).toFixed(4)}% >= ${(LIMITS.reputationComplaintStop * 100).toFixed(4)}%`, metrics);
  }

  // Gate 3 — AWS's own bounce rate. This is the number that gets accounts reviewed and suspended,
  // so it is the one worth stopping on. The 24h ratio read below only throttles.
  if (rep.bounce !== null && rep.bounce >= LIMITS.reputationBounceStop) {
    return blocked("bounce_rate",
      `AWS Reputation.BounceRate ${(rep.bounce * 100).toFixed(3)}% >= ${(LIMITS.reputationBounceStop * 100).toFixed(3)}%`, metrics);
  }

  // Gates 1-3 and 5 are the only ones that can stop a tick, and all four read AWS's own figures:
  // sending-enabled, Reputation.ComplaintRate, Reputation.BounceRate and the send quota. Those
  // are the numbers AWS reviews and suspends on.
  //
  // The two gates that used to stop here -- the day's bounce budget and this campaign's own
  // 3-day bounce rate -- are computed by us from our own event stream, and both stopped
  // everything including follow-ups. They now throttle new contacts instead, below. The risk
  // they exist to catch is entirely in first contacts: a follow-up goes to an address that has
  // already accepted mail, so it cannot contribute the hard bounce either number is made of.

  // Gate 5 — quota.
  if (quotaHeadroom <= 0) {
    return blocked("quota", `no headroom: ${sentLast24Hours}/${max24Hour} used, ${LIMITS.transactionalReserve} reserved for transactional`, metrics);
  }

  // Warn states throttle NEW contacts and leave follow-ups alone.
  //
  // Sending fewer first contacts is a real corrective action: it is where every one of these
  // numbers comes from. Sending fewer follow-ups is not — it cannot change a bounce rate, because
  // the addresses have already accepted mail, and it quietly costs the sequence. On 2026-10-06
  // throttling both halved the whole tick over a bounce rate that first contacts had caused, and
  // the follow-up backlog grew to 19,008.
  let newCapacityFactor = 1;
  let reason: string | null = null;
  if (self.rate !== null && self.rate >= LIMITS.selfBounceStop) {
    // Was a full stop. Unambiguously bad list quality, so stop feeding it new addresses — but the
    // conversations already started are not the problem and keep running.
    newCapacityFactor = 0;
    reason = `campaign bounce rate ${(self.rate * 100).toFixed(1)}% over ${self.sample} sends in ${LIMITS.selfBounceWindowDays}d — new contacts paused, follow-ups continue`;
  } else if (metrics.bounceBudget > 0 && todaysBounces >= metrics.bounceBudget) {
    newCapacityFactor = 0;
    reason = `${todaysBounces} hard bounces today against a budget of ${metrics.bounceBudget} — new contacts paused, follow-ups continue`;
  } else if (self.rate !== null && self.rate >= LIMITS.selfBounceWarn) {
    newCapacityFactor = 0.5;
    reason = `campaign bounce rate ${(self.rate * 100).toFixed(1)}% over ${self.sample} sends in ${LIMITS.selfBounceWindowDays}d — new contacts halved`;
  } else if (rates.complaintRate !== null && rates.complaintRate >= LIMITS.complaintWarn) {
    newCapacityFactor = 0.5;
    reason = `complaint rate ${(rates.complaintRate * 100).toFixed(3)}% in warn band — new contacts halved`;
  } else if (rates.bounceRate !== null && rates.bounceRate >= LIMITS.bounceWarn) {
    newCapacityFactor = 0.5;
    reason = `bounce rate ${(rates.bounceRate * 100).toFixed(2)}% in warn band — new contacts halved`;
  } else if (rates.bounceRate === null) {
    // Unknown is not good news for a fresh list. Follow-ups are unaffected: they do not depend on
    // a rate we could not read.
    newCapacityFactor = 0.5;
    reason = `bounce rate unknown (${rates.attempts} attempts in 24h, need ${LIMITS.rateMinSample}) — new contacts halved`;
  }

  return { ok: true, blockedBy: null, reason, capacityFactor: 1, newCapacityFactor, metrics };
}
