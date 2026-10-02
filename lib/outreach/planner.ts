import { sql } from "@/lib/db";

/**
 * Decides who gets mailed today and which touch they get.
 *
 * Two jobs that are easy to conflate and must not be:
 *
 *   1. The rule engine — for ONE recipient, what is the next right message, or is there none?
 *      Driven by what they did (clicked > opened > nothing), not by how long it has been.
 *   2. The planner — given today's safe capacity, which of the eligible people actually go out
 *      today, and how is the day split between chasing existing conversations and starting new
 *      ones.
 *
 * The single most important rule here is that capacity is a CEILING, not a target. If only 200
 * follow-ups are genuinely due, 200 go out — not 5,000 padded with touches sent early to fill the
 * day. Sending a follow-up before its gap has elapsed breaks the cadence that makes a sequence
 * read as a person following up rather than a machine draining a list.
 */

export type Track = "cold" | "warm" | "hot";

export type PlannedSend = {
  recipientId: string;
  email: string;
  campaignId: string;
  sender: string;
  stream: string;
  stepKey: string;
  subject: string;
  html: string;
  text: string;
  values: Record<string, string>;
  touchNo: number;
  track: Track;
  isNew: boolean;
  configSet: string | null;
  gapMinutes: number;
};

type RecipientRow = {
  id: string;
  email: string;
  values: Record<string, string>;
  touch_count: number;
  opened_distinct: number;
  clicked_distinct: number;
  verification_status: string;
};

type StepRow = {
  step_key: string;
  step_order: number;
  send_offset_minutes: number;
  gap_minutes: number | null;
  requires_state: string;
  is_last_chance: boolean;
  subject: string;
  html: string;
  text: string;
};

type CampaignRow = {
  id: string;
  sender: string;
  stream: string;
  max_touches: number;
  new_ratio: string;
  new_floor_ratio: string;
  daily_cap: number | null;
  config_set_unverified: string | null;
  config_set_verified: string | null;
};

/**
 * Which content track a recipient is on.
 *
 * Click beats open, and open is deliberately weak. Apple Mail Privacy Protection opens mail on
 * the recipient's behalf whether or not they read it, so an open means "this address is live and
 * the subject did not repel them" — enough to change what we say next, not enough to treat the
 * person as interested.
 */
export function trackFor(openedDistinct: number, clickedDistinct: number): Track {
  if (clickedDistinct > 0) return "hot";
  if (openedDistinct > 0) return "warm";
  return "cold";
}

/**
 * How long to wait after sending this step before the recipient's next touch is allowed.
 *
 * A cooldown rather than a position in a schedule. Once steps branch on behaviour, there is no
 * such thing as "the time step 4 goes out" — which step is fourth depends on what the recipient
 * did. The only thing knowable at send time is how long to wait before asking again.
 *
 * Falls back to the spacing between consecutive absolute offsets, so campaigns authored before
 * branching existed keep exactly the cadence they already had.
 */
function gapFor(step: StepRow, next: StepRow | undefined): number {
  if (step.gap_minutes !== null) return step.gap_minutes;
  if (!next) return Math.max(0, step.send_offset_minutes);
  return Math.max(0, next.send_offset_minutes - step.send_offset_minutes);
}

export type RuleDecision =
  | { action: "send"; step: StepRow; track: Track; gapMinutes: number }
  | { action: "stall"; reason: string };

/**
 * The rule engine, for one recipient.
 *
 * Order matters: the hard cap is checked before anything else, so no branch below can talk its
 * way past it.
 */
export function decideNextStep(
  r: RecipientRow,
  steps: StepRow[],
  alreadySent: Set<string>,
  maxTouches: number
): RuleDecision {
  // Rule 1 — hard cap per person, across every branch. Nobody gets a sixth email because a
  // sub-rule thought it had a good reason.
  if (r.touch_count >= maxTouches) {
    return {
      action: "stall",
      reason: r.clicked_distinct > 0 ? "max_touches_engaged" : r.opened_distinct > 0 ? "max_touches_opened_no_click" : "max_touches_no_open",
    };
  }

  const track = trackFor(r.opened_distinct, r.clicked_distinct);
  const ordered = [...steps].sort((a, b) => a.step_order - b.step_order);

  // Rule 5 — the last-chance offer. It is the FINAL touch, not an extra one: someone who keeps
  // opening but never clicks gets one different ask instead of one more of the same. Putting it
  // inside the cap is what stops "opened 5 times, send free credits" from quietly becoming a
  // sixth email.
  const isFinalTouch = r.touch_count === maxTouches - 1;
  if (isFinalTouch && track === "warm" && r.clicked_distinct === 0) {
    const lastChance = ordered.find((s) => s.is_last_chance && !alreadySent.has(s.step_key));
    if (lastChance) {
      const idx = ordered.indexOf(lastChance);
      return { action: "send", step: lastChance, track, gapMinutes: gapFor(lastChance, ordered[idx + 1]) };
    }
  }

  // Rules 3 and 4 — escalate by behaviour. A step marked for a track is only for that track;
  // 'any' steps work everywhere, which is what keeps pre-existing campaigns behaving identically.
  const candidates = ordered.filter(
    (s) => !s.is_last_chance && !alreadySent.has(s.step_key) && (s.requires_state === "any" || s.requires_state === track)
  );
  if (candidates.length === 0) {
    return { action: "stall", reason: `no_step_left_for_${track}` };
  }

  const next = candidates[0];
  const idx = ordered.indexOf(next);
  return { action: "send", step: next, track, gapMinutes: gapFor(next, ordered[idx + 1]) };
}

/**
 * Splits one day's capacity between follow-ups and new contacts.
 *
 * Asymmetric on purpose. A follow-up has a time it is supposed to go out; delaying it degrades the
 * sequence. A new contact has no such constraint — tomorrow is as good as today. So follow-ups may
 * overflow their share, but never past the floor reserved for new contacts, because a pipeline
 * that spends every day finishing existing conversations stops having new ones and quietly runs
 * dry a fortnight later.
 */
export function allocate(
  capacity: number,
  dueFollowups: number,
  availableNew: number,
  newRatio: number,
  newFloorRatio: number
): { followups: number; newOnes: number } {
  if (capacity <= 0) return { followups: 0, newOnes: 0 };

  const newFloor = Math.min(availableNew, Math.floor(capacity * newFloorRatio));
  const newTarget = Math.min(availableNew, Math.floor(capacity * newRatio));

  // Follow-ups first, but never into the floor.
  const followups = Math.min(dueFollowups, capacity - newFloor);
  // Whatever follow-ups did not use goes to new contacts, up to what exists.
  const newOnes = Math.min(availableNew, Math.max(newTarget, capacity - followups));

  return { followups, newOnes: Math.min(newOnes, capacity - followups) };
}

/** Everything the dispatcher needs for one campaign's tick. */
export async function planCampaign(campaignId: string, capacity: number): Promise<{
  sends: PlannedSend[];
  stalls: { id: string; reason: string }[];
  counts: { dueFollowups: number; availableNew: number; plannedFollowups: number; plannedNew: number };
}> {
  const campaignRows = await sql`
    SELECT id, sender, stream, max_touches, new_ratio, new_floor_ratio, daily_cap,
           config_set_unverified, config_set_verified
    FROM campaigns WHERE id = ${campaignId} AND status = 'active'
  `;
  const campaign = campaignRows[0] as CampaignRow | undefined;
  if (!campaign) return { sends: [], stalls: [], counts: { dueFollowups: 0, availableNew: 0, plannedFollowups: 0, plannedNew: 0 } };

  const effectiveCapacity = campaign.daily_cap ? Math.min(capacity, campaign.daily_cap) : capacity;

  const steps = (await sql`
    SELECT step_key, step_order, send_offset_minutes, gap_minutes, requires_state, is_last_chance,
           subject, html, text
    FROM campaign_steps WHERE campaign_id = ${campaignId} ORDER BY step_order
  `) as unknown as StepRow[];
  if (steps.length === 0) return { sends: [], stalls: [], counts: { dueFollowups: 0, availableNew: 0, plannedFollowups: 0, plannedNew: 0 } };

  // Recipients who have hit the cap must be retired explicitly.
  //
  // They are excluded by the `touch_count < max_touches` predicate below, which means the rule
  // engine never sees them and never returns a stall for them. Without this query they stay
  // 'active'/'warm' forever: still counted as live in the funnel, never given a
  // recycle_eligible_at, and re-examined by every future tick for a decision that can only ever
  // be "no". Caught by scripts/outreach-plan-test.ts, which asserted the stall count and found
  // zero.
  const cappedRows = (await sql`
    SELECT id, email, values, touch_count, opened_distinct, clicked_distinct, verification_status
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
      AND do_not_send = false
      AND state NOT IN ('suppressed', 'converted', 'stalled')
      AND touch_count >= ${campaign.max_touches}
    LIMIT 5000
  `) as unknown as RecipientRow[];

  // Eligibility is one predicate, applied identically to both pools, so a suppressed or converted
  // person cannot slip in through whichever pool happens to have room.
  const dueFollowupsRows = (await sql`
    SELECT id, email, values, touch_count, opened_distinct, clicked_distinct, verification_status
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
      AND do_not_send = false
      AND state NOT IN ('suppressed', 'converted', 'stalled')
      AND touch_count > 0
      AND touch_count < ${campaign.max_touches}
      AND next_due_at IS NOT NULL AND next_due_at <= now()
    ORDER BY next_due_at ASC
    LIMIT ${effectiveCapacity}
  `) as unknown as RecipientRow[];

  const newRows = (await sql`
    SELECT id, email, values, touch_count, opened_distinct, clicked_distinct, verification_status
    FROM campaign_recipients
    WHERE campaign_id = ${campaignId}
      AND do_not_send = false
      AND state NOT IN ('suppressed', 'converted', 'stalled')
      AND touch_count = 0
    ORDER BY imported_at ASC
    LIMIT ${effectiveCapacity}
  `) as unknown as RecipientRow[];

  const split = allocate(
    effectiveCapacity,
    dueFollowupsRows.length,
    newRows.length,
    Number(campaign.new_ratio),
    Number(campaign.new_floor_ratio)
  );

  const chosen = [
    ...dueFollowupsRows.slice(0, split.followups).map((r) => ({ r, isNew: false })),
    ...newRows.slice(0, split.newOnes).map((r) => ({ r, isNew: true })),
  ];

  // What each chosen recipient has already had, so a step is never repeated. email_sends is the
  // source of truth for this rather than a counter, because it is also what enforces idempotency
  // at send time — one fact, not two that can disagree.
  const emails = chosen.map((c) => c.r.email);
  const sentRows = emails.length
    ? ((await sql`
        SELECT recipient, step_key FROM email_sends
        WHERE campaign_id = ${campaignId} AND recipient = ANY(${emails})
      `) as unknown as { recipient: string; step_key: string }[])
    : [];
  const sentByEmail = new Map<string, Set<string>>();
  for (const row of sentRows) {
    if (!sentByEmail.has(row.recipient)) sentByEmail.set(row.recipient, new Set());
    sentByEmail.get(row.recipient)!.add(row.step_key);
  }

  const sends: PlannedSend[] = [];
  // Capped recipients are retired regardless of capacity — a finished journey should leave the
  // active pool immediately, not wait for a day with room to spare.
  const stalls: { id: string; reason: string }[] = cappedRows.map((r) => {
    const d = decideNextStep(r, steps, new Set(), campaign.max_touches);
    return { id: r.id, reason: d.action === "stall" ? d.reason : "max_touches" };
  });

  for (const { r, isNew } of chosen) {
    const decision = decideNextStep(r, steps, sentByEmail.get(r.email) ?? new Set(), campaign.max_touches);
    if (decision.action === "stall") {
      stalls.push({ id: r.id, reason: decision.reason });
      continue;
    }
    // Unverified addresses go through the Auto-Validation config set so SES screens them before
    // delivery is attempted; verified ones do not, because re-validating a known-good address on
    // every follow-up pays the validation fee for an answer we already have.
    const configSet = r.verification_status === "verified"
      ? campaign.config_set_verified
      : campaign.config_set_unverified;

    sends.push({
      recipientId: r.id,
      email: r.email,
      campaignId,
      sender: campaign.sender,
      stream: campaign.stream,
      stepKey: decision.step.step_key,
      subject: decision.step.subject,
      html: decision.step.html,
      text: decision.step.text,
      values: r.values ?? {},
      touchNo: r.touch_count + 1,
      track: decision.track,
      isNew,
      configSet,
      gapMinutes: decision.gapMinutes,
    });
  }

  return {
    sends,
    stalls,
    counts: {
      dueFollowups: dueFollowupsRows.length,
      availableNew: newRows.length,
      plannedFollowups: split.followups,
      plannedNew: split.newOnes,
    },
  };
}

/** Marks a recipient as finished with this sequence, and when it may re-enter with a new angle. */
export async function stallRecipients(ids: string[], reason: string, cooldownDays: number): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE campaign_recipients
    SET state = 'stalled',
        state_changed_at = now(),
        stalled_at = now(),
        stalled_reason = ${reason},
        next_due_at = NULL,
        recycle_eligible_at = now() + (${cooldownDays} || ' days')::interval
    WHERE id = ANY(${ids})
  `;
}

/** Records a successful send against the journey, and schedules the next touch. */
export async function recordTouch(recipientId: string, gapMinutesToNext: number): Promise<void> {
  await sql`
    UPDATE campaign_recipients
    SET touch_count = touch_count + 1,
        next_due_at = now() + (${gapMinutesToNext} || ' minutes')::interval,
        state = CASE WHEN state = 'new' THEN 'active' ELSE state END
    WHERE id = ${recipientId}
  `;
}
