import { sql } from "@/lib/db";

/**
 * Turns the raw SES event stream (email_events) into per-recipient journey state.
 *
 * email_events is append-only, shared with every other sender in the app, and fed by SNS, which
 * delivers at least once. So this reducer has to be safe to run repeatedly and safe to run on a
 * stream that repeats itself. Two mechanisms do that:
 *
 *   1. outreach_event_cursor — walks forward by created_at/id and remembers where it stopped, so
 *      a normal tick only looks at what is new.
 *   2. outreach_applied_events — one row per (ses_message_id, event_type) that was actually
 *      applied. Counters move only when that insert is new. A redelivered Open therefore cannot
 *      increment opened_distinct a second time, which matters because every engagement rule here
 *      is a threshold on a counter: a duplicated event is not noise, it changes a decision.
 *
 * That second table is also what makes opened_distinct mean distinct MESSAGES rather than Open
 * events. One message routinely emits many Opens (the reader reopening it, an image cache miss,
 * Apple Mail Privacy Protection prefetching on the recipient's behalf). Counting raw events would
 * let "opened 5 times" fire on a single email.
 */

/** Measured on this database 2026-10-02 across 84,998 Bounce events. */
export type BounceKind =
  | "validation_suppressed" // Permanent/EmailValidationSuppressed — 43,134 (51%)
  | "hard_mta" //              Permanent/General and other Permanent — 15,544
  | "on_suppression_list" //   Permanent/OnAccountSuppressionList — 171
  | "content_rejected" //      Transient/ContentRejected — 11,722
  | "mailbox_full" //          Transient/MailboxFull — 813
  | "transient"; //            Transient/General, Undetermined

/**
 * SES reports Auto Validation refusals as Bounce/Permanent, exactly like a real dead mailbox.
 * The only field that separates them is bounceSubType. diagnosticCode is NOT a discriminator —
 * it is populated on both (verified 2026-10-02; an earlier guess that it was turned out wrong).
 *
 * The distinction is worth this much care because it decides what the number means. Of all
 * "bounces" on this account, half never reached a mail server at all: SES declined to send them.
 * Rolling those into a hard-bounce figure overstates list rot by ~3x and would sunset addresses
 * that were never proven bad.
 */
export function classifyBounce(bounceType: string | null, bounceSubType: string | null): BounceKind {
  if (bounceSubType === "EmailValidationSuppressed") return "validation_suppressed";
  if (bounceSubType === "OnAccountSuppressionList") return "on_suppression_list";
  if (bounceSubType === "ContentRejected") return "content_rejected";
  if (bounceSubType === "MailboxFull") return "mailbox_full";
  if (bounceType === "Permanent") return "hard_mta";
  return "transient";
}

/** A bounce kind that means this address must never be sent to again. */
export function isTerminalBounce(kind: BounceKind): boolean {
  return kind === "hard_mta" || kind === "validation_suppressed" || kind === "on_suppression_list";
}

/**
 * Whether this bounce should count toward the bounce rate WE report to ourselves.
 *
 * Deliberately excludes validation_suppressed: those sends were stopped by SES before delivery
 * was attempted, so counting them as list quality failures makes a clean list look rotten and
 * would trip our own safety gate for the wrong reason. (They are not free — AWS still charges
 * the send and the validation, and they still consume quota — but that is a cost problem, which
 * the planner reports separately, not a reputation problem.)
 */
export function countsAsBounceRate(kind: BounceKind): boolean {
  return kind === "hard_mta" || kind === "mailbox_full" || kind === "transient";
}

const CURSOR = "outreach_journey";
const TRANSIENT_SUPPRESS_AFTER = 2;

export type ReduceResult = {
  scanned: number;
  applied: number;
  verified: number;
  opened: number;
  clicked: number;
  bounced: Record<string, number>;
  complained: number;
  suppressed: number;
};

type EventRow = {
  id: string;
  created_at: string;
  event_type: string;
  ses_message_id: string;
  recipient: string | null;
  raw: Record<string, unknown> | null;
};

function bounceFields(raw: Record<string, unknown> | null) {
  const bounce = (raw?.bounce ?? {}) as Record<string, unknown>;
  return {
    type: (bounce.bounceType as string) ?? null,
    subType: (bounce.bounceSubType as string) ?? null,
  };
}

/**
 * Advances the journey state by whatever SES events have arrived since the last run.
 *
 * `limit` bounds one tick's work so a backlog (a webhook outage, a first run over historical
 * events) is drained across several ticks instead of one unbounded transaction.
 */
export async function reduceOutreachEvents(limit = 5000): Promise<ReduceResult> {
  const cursorRows = await sql`
    SELECT last_created_at FROM outreach_event_cursor WHERE name = ${CURSOR}
  `;
  const since = (cursorRows[0] as { last_created_at: string | null } | undefined)?.last_created_at ?? null;

  // Only events that belong to one of OUR sends matter — email_events also carries sign-in codes
  // and lifecycle mail. The join to email_sends is what scopes it, and it also hands us the
  // recipient and campaign without trusting the event's own destination field.
  const events = (await sql`
    SELECT ee.id, ee.created_at, ee.event_type, ee.ses_message_id, es.recipient, ee.raw
    FROM email_events ee
    JOIN email_sends es ON es.ses_message_id = ee.ses_message_id
    WHERE ee.ses_message_id IS NOT NULL
      ${since ? sql`AND ee.created_at > ${since}` : sql``}
    ORDER BY ee.created_at ASC, ee.id ASC
    LIMIT ${limit}
  `) as unknown as EventRow[];

  const result: ReduceResult = {
    scanned: events.length,
    applied: 0,
    verified: 0,
    opened: 0,
    clicked: 0,
    bounced: {},
    complained: 0,
    suppressed: 0,
  };
  if (events.length === 0) return result;

  for (const ev of events) {
    const recipient = ev.recipient;
    if (!recipient) continue;

    // The idempotency gate. Nothing below this line runs twice for the same (message, type).
    const claim = await sql`
      INSERT INTO outreach_applied_events (ses_message_id, event_type)
      VALUES (${ev.ses_message_id}, ${ev.event_type})
      ON CONFLICT DO NOTHING
      RETURNING ses_message_id
    `;
    if (claim.length === 0) continue;
    result.applied++;

    switch (ev.event_type) {
      case "Delivery": {
        // Delivery is what proves an address real. Auto Validation passing it only means SES was
        // willing to try; a mail server accepting it is the actual verification.
        const rows = await sql`
          UPDATE campaign_recipients
          SET delivered_count = delivered_count + 1,
              last_event_at = ${ev.created_at},
              verification_status = CASE WHEN verification_status = 'unverified' THEN 'verified' ELSE verification_status END,
              verified_at = CASE WHEN verification_status = 'unverified' THEN ${ev.created_at}::timestamptz ELSE verified_at END,
              state = CASE WHEN state = 'new' THEN 'active' ELSE state END
          WHERE email = ${recipient} AND verification_status <> 'invalid'
          RETURNING verified_at
        `;
        if (rows.length > 0) result.verified++;
        break;
      }

      case "Open": {
        // Does not change cadence. An open is a weak signal — Apple Mail Privacy Protection opens
        // mail the recipient never looked at — so it moves the lead to the 'warm' content track
        // but never pulls it out of the sequence or speeds it up.
        await sql`
          UPDATE campaign_recipients
          SET opened_distinct = opened_distinct + 1,
              last_event_at = ${ev.created_at},
              state = CASE WHEN state IN ('new', 'active') THEN 'warm' ELSE state END,
              state_changed_at = CASE WHEN state IN ('new', 'active') THEN ${ev.created_at}::timestamptz ELSE state_changed_at END
          WHERE email = ${recipient} AND state NOT IN ('suppressed', 'converted')
        `;
        result.opened++;
        break;
      }

      case "Click": {
        // The real intent signal, and the only engagement event a privacy proxy does not fake.
        await sql`
          UPDATE campaign_recipients
          SET clicked_distinct = clicked_distinct + 1,
              last_event_at = ${ev.created_at},
              last_meaningful_response = ${ev.created_at},
              state = CASE WHEN state IN ('new', 'active', 'warm') THEN 'hot' ELSE state END,
              state_changed_at = CASE WHEN state IN ('new', 'active', 'warm') THEN ${ev.created_at}::timestamptz ELSE state_changed_at END
          WHERE email = ${recipient} AND state NOT IN ('suppressed', 'converted')
        `;
        result.clicked++;
        break;
      }

      case "Bounce": {
        const { type, subType } = bounceFields(ev.raw);
        const kind = classifyBounce(type, subType);
        result.bounced[kind] = (result.bounced[kind] ?? 0) + 1;

        if (isTerminalBounce(kind)) {
          // The row stays. Only the eligibility goes. Re-sending to an address SES has suppressed
          // produces another counted Bounce (measured 2026-10-02), so this flag is what stops a
          // retained record turning into a slow reputation leak.
          await sql`
            UPDATE campaign_recipients
            SET verification_status = 'invalid',
                bounce_kind = ${kind},
                do_not_send = true,
                do_not_send_reason = ${kind},
                state = 'suppressed',
                state_changed_at = ${ev.created_at},
                last_event_at = ${ev.created_at},
                next_due_at = NULL
            WHERE email = ${recipient}
          `;
          result.suppressed++;
        } else {
          // Soft failure. Retried, but not forever: the same address soft-bouncing on touch after
          // touch is how a list quietly accumulates addresses that will never accept mail.
          // content_rejected is kept separate because it is a message problem, not an address
          // problem — the planner surfaces it rather than blaming the recipient.
          await sql`
            UPDATE campaign_recipients
            SET transient_bounces = transient_bounces + 1,
                bounce_kind = ${kind},
                last_event_at = ${ev.created_at},
                do_not_send = CASE WHEN transient_bounces + 1 >= ${TRANSIENT_SUPPRESS_AFTER} AND ${kind} <> 'content_rejected'
                                   THEN true ELSE do_not_send END,
                do_not_send_reason = CASE WHEN transient_bounces + 1 >= ${TRANSIENT_SUPPRESS_AFTER} AND ${kind} <> 'content_rejected'
                                   THEN 'transient_repeat' ELSE do_not_send_reason END
            WHERE email = ${recipient}
          `;
        }
        break;
      }

      case "Complaint": {
        // The most expensive event there is: AWS reviews an account at 0.1% and pauses it at 0.5%,
        // so one complaint costs roughly a thousand clean sends' worth of headroom.
        await sql`
          UPDATE campaign_recipients
          SET state = 'suppressed',
              state_changed_at = ${ev.created_at},
              do_not_send = true,
              do_not_send_reason = 'complaint',
              last_event_at = ${ev.created_at},
              next_due_at = NULL
          WHERE email = ${recipient}
        `;
        await sql`
          INSERT INTO email_unsubscribes (email, stream, source)
          VALUES (${recipient}, 'all', 'complaint')
          ON CONFLICT (email, stream) DO NOTHING
        `;
        result.complained++;
        result.suppressed++;
        break;
      }

      default:
        break; // Send, DeliveryDelay, RenderingFailure — recorded, no state change
    }
  }

  const last = events[events.length - 1];
  await sql`
    INSERT INTO outreach_event_cursor (name, last_event_id, last_created_at, updated_at)
    VALUES (${CURSOR}, ${last.id}, ${last.created_at}, now())
    ON CONFLICT (name) DO UPDATE
      SET last_event_id = EXCLUDED.last_event_id,
          last_created_at = EXCLUDED.last_created_at,
          updated_at = now()
  `;

  return result;
}

/**
 * Marks people who signed up as converted, across every campaign at once.
 *
 * A registered user is a customer, not a prospect, and must drop out of cold sequences
 * immediately — including sequences they were never the target of. There is no SES event for
 * this: SESv2 publishes ten event types and "signed up" is not one of them, so it can only come
 * from our own user table.
 */
export async function syncConversions(): Promise<number> {
  const rows = await sql`
    UPDATE campaign_recipients cr
    SET state = 'converted',
        state_changed_at = now(),
        last_meaningful_response = now(),
        do_not_send = true,
        do_not_send_reason = 'registered',
        next_due_at = NULL
    FROM user_profiles u
    WHERE u.email = cr.email
      AND cr.state NOT IN ('converted', 'suppressed')
    RETURNING cr.email
  `;
  return rows.length;
}
