/**
 * Pacing maths. No DB, no network — run with `npx tsx scripts/outreach-pacing-test.ts`.
 *
 * Every case below is anchored to a number measured on 2026-10-02, the day both pacing bugs
 * were live, so a regression reads as "we are back to that day" rather than an abstract failure.
 */
import { computeCapacity, type PacingInput } from "../lib/outreach/pacing";

let pass = 0;
let fail = 0;

function check(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    pass++;
  } else {
    fail++;
    console.log(`  FAIL  ${name} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}

function assert(name: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const base: PacingInput = {
  dailyTarget: 77310,
  quotaHeadroom: 83900,
  sentToday: 0,
  minutesLeft: 24*60,
  tickIntervalMinutes: 15,
  capacityFactor: 1,
  chunkLimit: 2400,
};

// --- the rate the user actually asked for: quota * 0.9 / 24 per hour ---------------------
{
  const p = computeCapacity(base);
  check("start of day: per-tick is the hourly rate / ticks", p.perTick, Math.ceil(77310 / 96));
  assert("start of day: hourly rate is ~3,221, not ~9,600",
    Math.abs(p.capacity * 4 - 3221) <= 8, `got ${p.capacity * 4}/hr`);
}

// --- bug 2 regression: dividing by hours and spending per tick ran 4x fast ----------------
{
  const p = computeCapacity(base);
  const buggyPerTick = Math.ceil(77310 / 24); // the old formula
  assert("does not spend the hourly allowance every tick",
    p.perTick < buggyPerTick, `perTick ${p.perTick} vs old ${buggyPerTick}`);
}

// --- a full day at a steady rate spends the budget and does not overshoot -----------------
{
  let sent = 0;
  for (let m = 24 * 60; m > 0; m -= 15) {
    sent += computeCapacity({ ...base, sentToday: sent, minutesLeft: m }).capacity;
  }
  assert("a full day lands on the target", Math.abs(sent - 77310) <= 96, `sent ${sent}`);
  assert("a full day never overshoots the target", sent <= 77310, `sent ${sent}`);
}

// --- bug 1 regression: a warn must halve the rate, not end the day ------------------------
{
  // Replay 2026-10-02: the warn fired at 11:46 IST with ~26,750 already sent.
  let sent = 26750;
  let headroom = 83900 - sent;
  let ticks = 0;
  for (let m = 12 * 60; m > 0; m -= 15) {
    const c = computeCapacity({
      ...base, sentToday: sent, minutesLeft: m, quotaHeadroom: headroom, capacityFactor: 0.5,
    }).capacity;
    sent += c;
    headroom -= c;
    if (c > 0) ticks++;
  }
  assert("a warn does not strangle the day to zero", sent > 35000, `day ended at ${sent}`);
  assert("a warn keeps sending to the end of the window", ticks >= 40, `only ${ticks} live ticks`);
}

// --- capacityFactor applies to the tick, at the stated ratio ------------------------------
{
  const full = computeCapacity({ ...base, minutesLeft: 60 }).capacity;
  const warned = computeCapacity({ ...base, minutesLeft: 60, capacityFactor: 0.5 }).capacity;
  assert("warn is half of full", Math.abs(warned * 2 - full) <= 1, `${warned} vs ${full}`);
  check("blocked sends nothing", computeCapacity({ ...base, capacityFactor: 0 }).capacity, 0);
}

// --- the chunk ceiling still binds, and the day cannot go negative -------------------------
{
  check("chunk ceiling binds at the window edge",
    computeCapacity({ ...base, minutesLeft: 60, sentToday: 0 }).capacity, 2400);
  check("overspent day yields zero, not negative",
    computeCapacity({ ...base, sentToday: 99999 }).capacity, 0);
  check("quota headroom caps a larger daily target",
    computeCapacity({ ...base, dailyTarget: 500000 }).dailyBudget, 83900);
  check("null daily target falls back to headroom",
    computeCapacity({ ...base, dailyTarget: null }).dailyBudget, 83900);
}

// --- a blocked morning is absorbed by the rest of the day, not lost ------------------------
{
  const afterStall = computeCapacity({ ...base, sentToday: 0, minutesLeft: 602 });
  assert("a lost morning raises the remaining per-tick rate",
    afterStall.perTick > computeCapacity(base).perTick,
    `${afterStall.perTick} vs ${computeCapacity(base).perTick}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
