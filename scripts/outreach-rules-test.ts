/**
 * Rule-engine coverage, with no database and no sending.
 *
 * These are the rules that cannot be tested by actually sending mail: "five touches, never
 * opened" takes a fortnight of real calendar time to reach, and "opened but never clicked" needs
 * a human who cooperates by half-engaging on schedule. Driving the pure decision functions
 * directly is the only way to cover every branch, including the ones that are rare in production
 * and therefore most likely to be wrong.
 *
 *   npx tsx scripts/outreach-rules-test.ts
 */
import { decideNextStep, allocate, trackFor } from "../lib/outreach/planner";
import { classifyBounce, isTerminalBounce, countsAsBounceRate } from "../lib/outreach/events";

let pass = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}
function eq<T>(name: string, got: T, want: T) {
  check(name, Object.is(got, want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const step = (o: Partial<Parameters<typeof decideNextStep>[1][number]> & { step_key: string; step_order: number }) => ({
  send_offset_minutes: 0, gap_minutes: 2880, requires_state: "any", is_last_chance: false,
  subject: "s", html: "h", text: "t", ...o,
});

const STEPS = [
  step({ step_key: "t1_intro", step_order: 1, gap_minutes: 1440 }),
  step({ step_key: "t2_warm", step_order: 2, requires_state: "warm", gap_minutes: 2880 }),
  step({ step_key: "t2_cold", step_order: 2, requires_state: "cold", gap_minutes: 2880 }),
  step({ step_key: "t3_hot", step_order: 3, requires_state: "hot", gap_minutes: 10080 }),
  step({ step_key: "t4_any", step_order: 4, gap_minutes: 4320 }),
  step({ step_key: "t5_last_chance", step_order: 5, is_last_chance: true, gap_minutes: 10080 }),
];

const lead = (o: Partial<Parameters<typeof decideNextStep>[0]> = {}) => ({
  id: "r1", email: "a@b.com", values: {}, touch_count: 0,
  opened_distinct: 0, clicked_distinct: 0, verification_status: "unverified", ...o,
});

// --- Track classification -------------------------------------------------
eq("track: nothing -> cold", trackFor(0, 0), "cold");
eq("track: opened -> warm", trackFor(3, 0), "warm");
eq("track: clicked beats opened -> hot", trackFor(9, 1), "hot");

// --- Rule 1: the hard cap, which nothing may bypass -----------------------
{
  const d = decideNextStep(lead({ touch_count: 5 }), STEPS, new Set(), 5);
  eq("cap: 5 touches stalls", d.action, "stall");
  if (d.action === "stall") eq("cap: reason names no-open", d.reason, "max_touches_no_open");
}
{
  // The dangerous case: engaged AND at the cap. Engagement must not buy a sixth email.
  const d = decideNextStep(lead({ touch_count: 5, opened_distinct: 4, clicked_distinct: 2 }), STEPS, new Set(), 5);
  eq("cap: engaged lead still stalls at cap", d.action, "stall");
}
{
  // The specific bug in the proposed design: "5 opens + no click -> send free credits" would be
  // a SIXTH mail. It must not fire once the cap is reached.
  const d = decideNextStep(lead({ touch_count: 5, opened_distinct: 5, clicked_distinct: 0 }), STEPS, new Set(), 5);
  eq("cap: opened-5-no-click does NOT get a 6th mail", d.action, "stall");
  if (d.action === "stall") eq("cap: reason distinguishes opened-no-click", d.reason, "max_touches_opened_no_click");
}

// --- Rules 3/4: branch on behaviour ---------------------------------------
{
  const d = decideNextStep(lead({ touch_count: 1, opened_distinct: 0 }), STEPS, new Set(["t1_intro"]), 5);
  check("cold lead gets the cold step", d.action === "send" && d.step.step_key === "t2_cold");
  check("cold lead stays on cold track", d.action === "send" && d.track === "cold");
}
{
  const d = decideNextStep(lead({ touch_count: 1, opened_distinct: 1 }), STEPS, new Set(["t1_intro"]), 5);
  check("opened lead escalates to the warm step", d.action === "send" && d.step.step_key === "t2_warm");
}
{
  const d = decideNextStep(lead({ touch_count: 1, opened_distinct: 2, clicked_distinct: 1 }), STEPS, new Set(["t1_intro"]), 5);
  check("clicked lead escalates to the hot step", d.action === "send" && d.step.step_key === "t3_hot");
  check("hot step carries the slower gap", d.action === "send" && d.gapMinutes === 10080);
}

// --- Rule 5: the last-chance offer IS the final touch ---------------------
{
  const sent = new Set(["t1_intro", "t2_warm", "t4_any"]);
  const d = decideNextStep(lead({ touch_count: 4, opened_distinct: 3, clicked_distinct: 0 }), STEPS, sent, 5);
  check("final touch for opened-never-clicked is the last-chance offer",
    d.action === "send" && d.step.step_key === "t5_last_chance");
}
{
  // Someone who clicked does not get the consolation offer — they get the engaged track.
  const sent = new Set(["t1_intro", "t2_warm"]);
  const d = decideNextStep(lead({ touch_count: 4, opened_distinct: 3, clicked_distinct: 2 }), STEPS, sent, 5);
  check("clicked lead does not get the last-chance offer",
    d.action === "send" && d.step.step_key !== "t5_last_chance");
}
{
  // Not the final touch yet: no early consolation offer.
  const d = decideNextStep(lead({ touch_count: 2, opened_distinct: 2, clicked_distinct: 0 }), STEPS, new Set(["t1_intro", "t2_warm"]), 5);
  check("last-chance does not fire early", d.action === "send" && d.step.step_key !== "t5_last_chance");
}
{
  const d = decideNextStep(lead({ touch_count: 2 }), STEPS, new Set(["t1_intro", "t2_cold", "t4_any"]), 5);
  eq("no step left for this track stalls", d.action, "stall");
}

// --- Daily allocation -----------------------------------------------------
{
  const a = allocate(1000, 400, 5000, 0.3, 0.2);
  eq("normal day: all due follow-ups go", a.followups, 400);
  eq("normal day: rest goes to new, within capacity", a.newOnes, 600);
}
{
  // The question that prompted this: no new leads at all.
  const a = allocate(1000, 400, 0, 0.3, 0.2);
  eq("no new leads: follow-ups are NOT padded to fill capacity", a.followups, 400);
  eq("no new leads: nothing invented", a.newOnes, 0);
}
{
  // Follow-ups alone exceed capacity: the new-contact floor is still protected, so the funnel
  // never stops filling even on a heavy follow-up day.
  const a = allocate(1000, 5000, 5000, 0.3, 0.2);
  eq("overflow day: follow-ups capped by the new floor", a.followups, 800);
  eq("overflow day: floor honoured", a.newOnes, 200);
  check("overflow day: never exceeds capacity", a.followups + a.newOnes <= 1000);
}
{
  const a = allocate(1000, 0, 5000, 0.3, 0.2);
  eq("no follow-ups due: new takes the whole day", a.newOnes, 1000);
}
{
  const a = allocate(0, 500, 500, 0.3, 0.2);
  check("zero capacity sends nothing", a.followups === 0 && a.newOnes === 0);
}

// --- Bounce classification (the measured discriminator) -------------------
eq("AV suppression is its own kind", classifyBounce("Permanent", "EmailValidationSuppressed"), "validation_suppressed");
eq("real hard bounce", classifyBounce("Permanent", "General"), "hard_mta");
eq("own suppression list", classifyBounce("Permanent", "OnAccountSuppressionList"), "on_suppression_list");
eq("content rejected is transient-class", classifyBounce("Transient", "ContentRejected"), "content_rejected");
eq("mailbox full", classifyBounce("Transient", "MailboxFull"), "mailbox_full");
eq("undetermined falls back to transient", classifyBounce("Undetermined", "Undetermined"), "transient");

check("AV suppression is terminal for sending", isTerminalBounce("validation_suppressed"));
check("hard bounce is terminal", isTerminalBounce("hard_mta"));
check("content rejection is NOT terminal", !isTerminalBounce("content_rejected"));
check("mailbox full is NOT terminal", !isTerminalBounce("mailbox_full"));

// The reason the distinction exists at all: half of all "bounces" on this account are AV
// suppressions, and counting them as list rot would trip our own safety gate for the wrong reason.
check("AV suppression does NOT count toward our bounce rate", !countsAsBounceRate("validation_suppressed"));
check("hard bounce DOES count", countsAsBounceRate("hard_mta"));
check("content rejection does not count (message problem, not list)", !countsAsBounceRate("content_rejected"));

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL  ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
