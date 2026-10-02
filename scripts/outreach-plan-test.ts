/**
 * End-to-end planner check against a real database.
 *
 * The rule tests cover decideNextStep() and allocate() as pure functions. This covers the part
 * they cannot: the SQL in planCampaign(). Eligibility lives in a WHERE clause, and a predicate
 * that is wrong there fails silently and expensively — a suppressed address slipping into the
 * queue does not throw, it sends.
 *
 *   DATABASE_URL=postgres://gigzman@localhost:5432/gigzman_dev npx tsx scripts/outreach-plan-test.ts
 */
import { planCampaign } from "../lib/outreach/planner";

const CAMPAIGN = "mantis_cold_outreach_2026";
let pass = 0;
const fails: string[] = [];
const check = (name: string, cond: boolean, detail?: string) =>
  cond ? pass++ : fails.push(`${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  const plan = await planCampaign(CAMPAIGN, 1000);
  const byStep = new Map<string, number>();
  for (const s of plan.sends) byStep.set(s.stepKey, (byStep.get(s.stepKey) ?? 0) + 1);

  console.log("counts:", plan.counts);
  console.log("steps :", Object.fromEntries(byStep));
  console.log("stalls:", plan.stalls.length, [...new Set(plan.stalls.map((s) => s.reason))]);

  const emails = new Set(plan.sends.map((s) => s.email));

  // The failures that matter most are the ones that send to someone who must never be sent to.
  check("suppressed never queued", ![...emails].some((e) => e.startsWith("supp")));
  check("not-yet-due never queued", ![...emails].some((e) => e.startsWith("future")));
  check("capped never queued", ![...emails].some((e) => e.startsWith("capped")));

  check("capped recipients stall instead", plan.stalls.length === 6, `got ${plan.stalls.length}`);
  check("stall reason distinguishes opened-no-click",
    plan.stalls.every((s) => s.reason === "max_touches_opened_no_click"),
    [...new Set(plan.stalls.map((s) => s.reason))].join(","));

  // Track routing.
  check("cold leads get the cold step", byStep.get("t2_cold") === 15, `got ${byStep.get("t2_cold")}`);
  check("warm leads get the warm step", byStep.get("t2_warm") === 10, `got ${byStep.get("t2_warm")}`);
  check("hot leads get the hot step", byStep.get("t3_hot") === 5, `got ${byStep.get("t3_hot")}`);
  check("final-touch warm leads get the last-chance offer",
    byStep.get("t5_last_chance") === 4, `got ${byStep.get("t5_last_chance")}`);
  check("new leads get the intro", byStep.get("t1_intro") === 40, `got ${byStep.get("t1_intro")}`);

  // Config-set routing is what decides whether SES screens the address first, and getting it
  // backwards means either paying to re-validate known-good addresses or sending unscreened ones.
  const news = plan.sends.filter((s) => s.isNew);
  check("unverified route through the Auto Validation set",
    news.every((s) => s.configSet === "mantis-agency-campaign"));
  const followups = plan.sends.filter((s) => !s.isNew);
  check("verified route through the no-AV set",
    followups.every((s) => s.configSet === "gigzman-cold-outreach-2026"));

  check("hot track carries the slower 7-day gap",
    plan.sends.filter((s) => s.stepKey === "t3_hot").every((s) => s.gapMinutes === 10080));

  // Capacity as a ceiling: 34 follow-ups due and 40 new, well under 1000, so nothing is padded.
  check("nothing invented to fill capacity", plan.sends.length === 74, `got ${plan.sends.length}`);

  // And the squeeze: with capacity 10 the new-contact floor (20% = 2) must survive.
  const tight = await planCampaign(CAMPAIGN, 10);
  check("tight capacity respected", tight.sends.length <= 10, `got ${tight.sends.length}`);
  check("new-contact floor survives a squeeze", tight.sends.filter((s) => s.isNew).length >= 2,
    `got ${tight.sends.filter((s) => s.isNew).length}`);

  console.log(`\n${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log(`  FAIL  ${f}`);
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
