/**
 * The rule that a warn state throttles new contacts and never follow-ups.
 *
 *   npx tsx scripts/outreach-newcap-test.ts
 *
 * This is the behaviour that cost 19,008 missed touches on 2026-10-06: a bounce rate caused
 * entirely by first contacts halved the whole tick, so the follow-up backlog grew while the
 * number the throttle was reacting to could not possibly improve.
 *
 * Pure arithmetic over allocate() plus the clamp planCampaign applies to its result, so it runs
 * without a database.
 */
import { allocate } from "../lib/outreach/planner";

let passed = 0, failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { passed++; return; }
  failed++;
  console.error(`FAIL ${name}\n  got  ${g}\n  want ${w}`);
}

/** allocate() followed by the new-contact clamp, exactly as planCampaign applies it. */
function plan(
  capacity: number, dueFollowups: number, availableNew: number,
  newRatio: number, newFloorRatio: number, newCapacityFactor: number
) {
  const split = allocate(capacity, dueFollowups, availableNew, newRatio, newFloorRatio);
  const newCap = Math.floor(capacity * Math.max(0, Math.min(1, newCapacityFactor)));
  if (split.newOnes > newCap) {
    const freed = split.newOnes - newCap;
    split.newOnes = newCap;
    split.followups = Math.min(dueFollowups, split.followups + freed);
  }
  return split;
}

// No warn: ordinary split, follow-ups first.
check("unthrottled keeps the normal split",
  plan(1000, 400, 5000, 0.35, 0.02, 1),
  { followups: 400, newOnes: 600 });

// The case from 2026-10-06: a big follow-up backlog and a warn on new contacts.
const warned = plan(1000, 5000, 5000, 0.35, 0.02, 0.5);
check("a warn does not reduce follow-ups", warned.followups >= 980, true);
check("a warn caps new contacts at half capacity", warned.newOnes <= 500, true);
check("a warn still fills the tick", warned.followups + warned.newOnes <= 1000, true);

// newCapacityFactor 0 is the old self_bounce_rate / bounce_budget stop. It must not stop
// follow-ups, which was the whole defect.
const paused = plan(1000, 5000, 5000, 0.35, 0.02, 0);
check("new contacts paused sends zero new", paused.newOnes, 0);
check("new contacts paused still sends follow-ups", paused.followups, 1000);

// Freed new-contact capacity goes to the backlog rather than being wasted.
const freed = plan(1000, 800, 5000, 0.35, 0.02, 0);
check("capacity freed by the throttle goes to follow-ups", freed, { followups: 800, newOnes: 0 });

// With no backlog there is nothing to hand the capacity to, so a throttle really does mean a
// smaller tick -- which is correct, because every send in it would be a first contact.
check("no backlog means the throttle shrinks the tick",
  plan(1000, 0, 5000, 0.35, 0.02, 0.5),
  { followups: 0, newOnes: 500 });

// The new-contact floor still applies underneath: a pipeline that only ever finishes existing
// conversations runs dry, so an unthrottled tick keeps feeding new ones.
const floored = plan(1000, 5000, 5000, 0.35, 0.02, 1);
check("the new-contact floor survives a full backlog", floored.newOnes >= 20, true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
