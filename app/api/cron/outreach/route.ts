import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendBulkEmail, fillTemplate } from "@/lib/email/send-bulk";
import { recordCronRun } from "@/lib/cron-runs";
import { reduceOutreachEvents, syncConversions } from "@/lib/outreach/events";
import { checkGates } from "@/lib/outreach/gates";
import { planCampaign, recordTouch, stallRecipients, recordSendFailure, isPermanentSendFailure, retireRecipient } from "@/lib/outreach/planner";
import { computeCapacity } from "@/lib/outreach/pacing";

/**
 * The engagement-driven outreach tick.
 *
 * Separate from /api/cron/campaign-email on purpose. That one advances campaigns purely on time
 * (batch start + a fixed offset) and a number of live campaigns depend on exactly that behaviour;
 * breaking it to add branching would put existing sequences at risk for no gain. This route is
 * the behaviour-driven path: what a recipient gets next depends on what they did, and nothing is
 * sent without the safety gates passing first.
 *
 * Order within a tick matters and is not arbitrary:
 *   1. Ingest events, so every decision below is made on the freshest state (a bounce that
 *      arrived overnight must suppress the address BEFORE this tick considers mailing it again).
 *   2. Sync conversions, so a signup that happened outside the mail stream removes that person
 *      from every sequence immediately.
 *   3. Gates, which can stop the tick entirely.
 *   4. Plan, then send.
 *
 * Idempotent throughout: sendBulkEmail claims (recipient, campaign, step) via a unique index
 * before sending, so a tick that dies partway is resumed by the next one rather than re-sending.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** ~204s of sending at the interval below, inside maxDuration with room for the gate queries. */
const CHUNK_LIMIT = 2400;
/** EventBridge rule `mantis-outreach-daily` fires every 15 minutes (confirmed from the run log:
 *  ticks land on :01, :16, :31, :46). The pacing maths divides the day's remaining budget by the
 *  ticks left, so this must match the rule's schedule — change one and the day either
 *  front-loads or underspends. */
const TICK_INTERVAL_MINUTES = 15;
/** ~11.8/sec, under the account's confirmed 14/sec cap with headroom for transactional mail
 *  sharing the same rate limit. Pacing is not politeness: Microsoft's 554 5.7.7 policy block
 *  triggers on burst PATTERN rather than daily volume. */
const SEND_INTERVAL_MS = 85;

type CampaignRow = {
  id: string;
  cooldown_days: number;
  daily_target: number | null;
  send_window_start_hour: number;
  send_window_end_hour: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const fromVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (!fromVercelCron && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const onlyCampaign = req.nextUrl.searchParams.get("campaign");
  /** Ignores the send window. For a deliberate operator-triggered run, not for the schedule. */
  const force = req.nextUrl.searchParams.get("force") === "1";
  const startedAt = new Date();

  // Only one dispatcher run at a time, ever.
  //
  // EventBridge API destinations give up waiting well before this route finishes and treat that
  // as a failure, so a single scheduled tick became six overlapping runs in seven minutes. No
  // duplicate mail went out — sendBulkEmail claims (recipient, campaign, step) on a unique index
  // first — but each run took its own slice of the day's budget, which is exactly the burst the
  // pacing exists to prevent.
  //
  // A lock ROW, not pg_advisory_lock. Advisory locks are scoped to a session, and lib/db.ts is a
  // connection pool (max: 10): the lock and the unlock can land on different connections, so the
  // unlock silently does nothing and the lock is held until that connection is recycled. That is
  // not theoretical — it happened here and wedged the dispatcher shut until the backend was
  // killed by hand. A row with a timestamp is pool-safe, and a stale one expires on its own so a
  // crashed run cannot block the schedule forever.
  const LOCK = "outreach_dispatcher";
  const STALE_MINUTES = 10;
  const claimed = await sql`
    INSERT INTO outreach_event_cursor (name, last_created_at, updated_at)
    VALUES (${LOCK}, now(), now())
    ON CONFLICT (name) DO UPDATE SET updated_at = now()
      WHERE outreach_event_cursor.updated_at < now() - (${STALE_MINUTES} || ' minutes')::interval
    RETURNING name
  `;
  if (claimed.length === 0) {
    return NextResponse.json({ skipped: "another dispatcher run is already in progress" });
  }

  // Acknowledge now, send afterwards.
  //
  // A full tick takes ~20 seconds (gates make several AWS calls, then sends are paced). An
  // EventBridge API destination stops waiting long before that and records a FailedInvocation —
  // measured today: the rule fired on schedule every time, and the invocations at 11:38, 12:08
  // and 12:23 all failed on timeout, so with retries off those ticks were simply lost and
  // sending stalled for forty minutes while everything looked healthy.
  //
  // Returning first and continuing in the background fixes the symptom at its cause. App Runner
  // is a long-lived server, not a per-request lambda, so the promise keeps running after the
  // response is flushed. Overlap is already impossible (the lock above), and if the instance is
  // recycled mid-run the lock row goes stale on its own and the next tick picks the work up —
  // every send is idempotent per (recipient, campaign, step), so nothing is sent twice.
  //
  // A dry run stays synchronous: its entire purpose is to return what it found.
  if (!dryRun) {
    void run().catch((err) => console.error("outreach dispatcher failed", err));
    return NextResponse.json({ accepted: true, startedAt: startedAt.toISOString() }, { status: 202 });
  }
  return run();

  async function run(): Promise<Response> {

  try {

  // 1 + 2 — bring state up to date before anything is decided on it.
  const events = await reduceOutreachEvents();
  const converted = await syncConversions();

  const campaignRows = await sql`
    SELECT id, cooldown_days, daily_target, send_window_start_hour, send_window_end_hour FROM campaigns
    WHERE status = 'active' AND config_set_unverified IS NOT NULL
      ${onlyCampaign ? sql`AND id = ${onlyCampaign}` : sql``}
    ORDER BY created_at ASC
  `;

  const perCampaign: Record<string, unknown>[] = [];
  let totalSent = 0, totalFailed = 0;

  for (const row of campaignRows as unknown as CampaignRow[]) {
    const campaignId = row.id;

    // Pacing. A tick that empties its whole allowance in one burst is the worst possible shape
    // for deliverability: Microsoft's 554 5.7.7 policy block triggers on burst PATTERN rather
    // than daily volume. The day's budget is spread evenly across the window instead.
    //
    // Deliberately remaining/hoursLeft rather than a fixed per-hour constant: if a tick is
    // skipped (gate trip, deploy, window edge), the rest of the day absorbs the shortfall
    // instead of silently losing it, and a day can never overshoot its budget either.
    const istParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const istHour = Number(istParts.find((p) => p.type === "hour")!.value);
    const istMinute = Number(istParts.find((p) => p.type === "minute")!.value);
    const inWindow = istHour >= row.send_window_start_hour && istHour < row.send_window_end_hour;
    if (!inWindow && !force) {
      perCampaign.push({ campaignId, skipped: `outside send window (IST ${istHour}:00, window ${row.send_window_start_hour}-${row.send_window_end_hour})` });
      continue;
    }
    const minutesLeft = Math.max(1, (row.send_window_end_hour - istHour) * 60 - istMinute);

    // 3 — gates. Checked per campaign, because a campaign's own list quality can be bad while the
    // account is still healthy, and that is precisely the case worth catching early.
    const gate = await checkGates(campaignId);
    const runRows = await sql`
      INSERT INTO outreach_runs (campaign_id, blocked_by, bounce_rate, complaint_rate, quota_headroom, notes)
      VALUES (${campaignId}, ${gate.blockedBy}, ${gate.metrics.bounceRate}, ${gate.metrics.complaintRate},
              ${gate.metrics.quotaHeadroom}, ${sql.json({ reason: gate.reason, events, converted, dryRun })}::jsonb)
      RETURNING id
    `;
    const runId = (runRows[0] as { id: string }).id;

    if (!gate.ok) {
      await sql`UPDATE outreach_runs SET finished_at = now() WHERE id = ${runId}`;
      perCampaign.push({ campaignId, blocked: gate.blockedBy, reason: gate.reason });
      continue;
    }

    // Today's remaining allowance, divided by the hours left in the window. Sent-so-far comes
    // from outreach_runs rather than a counter, so a restart or a second manual run cannot double
    // the day's volume.
    const todayRows = await sql`
      SELECT coalesce(sum(sent), 0)::int AS sent_today FROM outreach_runs
      WHERE campaign_id = ${campaignId}
        AND started_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
    `;
    const sentToday = (todayRows[0] as { sent_today: number }).sent_today;
    // No warm-up ramp: this account is already an established sender, with 35,000-55,513
    // delivered per day as recently as 2026-09-28. Ramping an account that has already proved
    // the volume just leaves quota unused. The gates above are the safety net instead, and they
    // are the ones that matter: a rate check catches a bad list on the day, where a volume ramp
    // only ever delays it.
    const pace = computeCapacity({
      dailyTarget: row.daily_target,
      quotaHeadroom: gate.metrics.quotaHeadroom,
      sentToday,
      minutesLeft,
      tickIntervalMinutes: TICK_INTERVAL_MINUTES,
      capacityFactor: gate.capacityFactor,
      chunkLimit: CHUNK_LIMIT,
    });
    const { dailyBudget, perTick, capacity } = pace;
    const plan = await planCampaign(campaignId, capacity);

    await sql`
      UPDATE outreach_runs
      SET capacity = ${capacity}, planned_new = ${plan.counts.plannedNew}, planned_followup = ${plan.counts.plannedFollowups},
          notes = notes || ${sql.json({ istHour, istMinute, minutesLeft, ticksLeft: pace.ticksLeft, sentToday, dailyBudget, perTick, capacityFactor: gate.capacityFactor })}::jsonb
      WHERE id = ${runId}
    `;

    if (dryRun) {
      await sql`UPDATE outreach_runs SET finished_at = now() WHERE id = ${runId}`;
      perCampaign.push({
        campaignId, capacity, ...plan.counts,
        stalls: plan.stalls.length,
        sample: plan.sends.slice(0, 5).map((s) => ({ to: s.email, step: s.stepKey, track: s.track, touch: s.touchNo, configSet: s.configSet })),
      });
      continue;
    }

    // Stalls are applied even when nothing sends — a finished journey should leave the active
    // pool immediately, not linger until the next tick happens to have capacity.
    for (const reason of new Set(plan.stalls.map((s) => s.reason))) {
      await stallRecipients(plan.stalls.filter((s) => s.reason === reason).map((s) => s.id), reason, row.cooldown_days);
    }

    let sent = 0, failed = 0, skipped = 0, aborted: string | null = null;

    for (let i = 0; i < plan.sends.length; i++) {
      const item = plan.sends[i];

      // The canary checkpoint that used to sit here was removed on 2026-10-04. It could not do
      // its job, for two reasons, and it cost 31,324 sends in one day proving it:
      //
      //   1. It ran ~5 seconds after the first 50 sends, but bounce feedback arrives through
      //      SNS minutes later. Nothing it was looking for could have arrived yet.
      //   2. So what it actually read was cr.bounce_kind — the recipient's state from some
      //      EARLIER send — and counted 'transient' (out-of-office, greylisting) as a failure.
      //      It was answering "how many of these 50 people have ever soft-bounced", not "did
      //      this batch just bounce".
      //
      // Measured that day: real hard-bounce rate 0.25% over 42,220 sends, while the canary read
      // 4-12% and aborted 15 of 58 ticks. The account-level gates in checkGates are the real
      // protection and they work on adequate samples: Reputation.BounceRate halves capacity at
      // 2% and stops at 4%, there is a daily bounce budget, and the campaign's own 3-day rate
      // throttles separately. A guard that fires on noise is worse than no guard, because it
      // trains you to ignore it.

      try {
        const result = await sendBulkEmail({
          to: item.email,
          subject: fillTemplate(item.subject, item.values),
          html: fillTemplate(item.html, item.values),
          text: fillTemplate(item.text, item.values),
          campaignId: item.campaignId,
          stepKey: item.stepKey,
          template: item.stepKey,
          stream: item.stream,
          sender: item.sender,
          configSet: item.configSet,
          touchNo: item.touchNo,
        });
        if (result.sent) {
          await recordTouch(item.recipientId, item.gapMinutes);
          sent++;
        } else {
          skipped++;
          // A skip is as permanent as a rejection, and leaves the row just as untouched: the
          // same recipient is planned, skipped and re-planned by every tick from their due date
          // onward. 40 unsubscribed rows were sitting in exactly that state on 2026-10-03,
          // waiting for their follow-up date to start the loop.
          if (result.reason === "unsubscribed") {
            await retireRecipient(item.recipientId, "unsubscribed");
          } else if (result.reason === "already sent") {
            // The send exists; only the touch was lost (a crash between the two). Recording it
            // moves the recipient on to the next step rather than re-attempting this one.
            await recordTouch(item.recipientId, item.gapMinutes);
          }
        }
      } catch (err) {
        failed++;
        const text = err instanceof Error ? err.message : String(err);
        // An account-level pause is not a per-recipient problem: every remaining send in this
        // tick will fail the same way. Stopping immediately is the difference between losing a
        // tick and burning a whole queue against a wall.
        if (text.includes("Sending paused") || text.includes("AccountSuspended")) {
          aborted = "account_paused_mid_tick";
          break;
        }
        await recordSendFailure(item.recipientId, isPermanentSendFailure(text));
        console.error("outreach send failed", campaignId, item.stepKey, item.email, err);
      }
      await sleep(SEND_INTERVAL_MS);
    }

    await sql`
      UPDATE outreach_runs
      SET sent = ${sent}, failed = ${failed}, finished_at = now(),
          blocked_by = ${aborted}, notes = notes || ${sql.json({ skipped, aborted })}::jsonb
      WHERE id = ${runId}
    `;
    totalSent += sent;
    totalFailed += failed;
    perCampaign.push({ campaignId, capacity, ...plan.counts, sent, failed, skipped, aborted, stalls: plan.stalls.length });
  }

  await recordCronRun("outreach", startedAt, true, { events, converted, sent: totalSent, failed: totalFailed });
  return NextResponse.json({ dryRun, events, converted, campaigns: perCampaign, sent: totalSent, failed: totalFailed });

  } finally {
    // Release by ageing the row out, so the next tick's conditional UPDATE can take it.
    await sql`
      UPDATE outreach_event_cursor
      SET updated_at = now() - (${STALE_MINUTES} || ' minutes')::interval
      WHERE name = ${LOCK}
    `;
  }
  }
}
