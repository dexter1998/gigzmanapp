/**
 * Local-send-time maths. No DB, no network — `npx tsx scripts/send-time-test.ts`.
 *
 * Timezone code is the kind that looks right and is wrong twice a year, so the cases below include
 * both DST boundaries and the southern hemisphere, where the clocks move the other way.
 */
import {
  resolveTz, tzFromCountry, tzFromDomain, nextLocalSlot, DEFAULT_TZ,
  LOCAL_SEND_START_HOUR, LOCAL_SEND_END_HOUR,
} from "../lib/outreach/send-time";

let pass = 0, fail = 0;
const check = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};
const assert = (name: string, cond: boolean, detail = "") => {
  if (cond) pass++; else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

/** What hour is it for the recipient at this instant? */
function localHour(d: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d));
}

// --- resolution order -------------------------------------------------------------------
check("country wins", resolveTz({ country: "germany", domain: "acme.in" }).tz, "Europe/Berlin");
check("cctld when no country", resolveTz({ country: "unknown", domain: "acme.co.uk" }).tz, "Europe/London");
check("default when neither", resolveTz({ country: "unknown", domain: "acme.com" }).tz, DEFAULT_TZ);
check("source is reported", resolveTz({ country: null, domain: "acme.de" }).source, "cctld");

// "unknown", "other" and "europe" are not countries — treating them as one is how a whole
// continent ends up on Berlin time.
check("unknown is not a country", tzFromCountry("unknown"), null);
check("other is not a country", tzFromCountry("other"), null);
check("europe is not a country", tzFromCountry("europe"), null);

// Vanity TLDs say nothing about location; .io is Indian Ocean on paper and San Francisco in fact.
check("io is not a location", tzFromDomain("acme.io"), null);
check("ai is not a location", tzFromDomain("acme.ai"), null);
check("co is not a location", tzFromDomain("acme.co"), null);
check("com.au is read as au", tzFromDomain("acme.com.au"), "Australia/Sydney");
check("co.uk is read as uk", tzFromDomain("acme.co.uk"), "Europe/London");

// --- the slot lands inside the recipient's band, wherever they are ----------------------
const zones = ["America/New_York", "Asia/Kolkata", "Europe/Berlin", "Australia/Sydney",
               "America/Los_Angeles", "Asia/Tokyo", "America/Sao_Paulo"];
// Includes both DST switch weekends in the north and the southern hemisphere's opposite move.
const instants = ["2026-01-15T03:00:00Z", "2026-03-08T06:00:00Z", "2026-06-21T18:00:00Z",
                  "2026-10-25T01:00:00Z", "2026-11-01T05:30:00Z", "2026-12-31T22:00:00Z"];

for (const tz of zones) {
  for (const iso of instants) {
    const now = new Date(iso);
    const slot = nextLocalSlot({ tz, minGapMinutes: 1440, seed: `seed-${tz}`, now });
    const h = localHour(slot, tz);
    assert(`${tz} @ ${iso.slice(0, 10)} lands in band`,
      h >= LOCAL_SEND_START_HOUR && h < LOCAL_SEND_END_HOUR, `local hour ${h}`);
    assert(`${tz} @ ${iso.slice(0, 10)} respects the gap`,
      slot.getTime() >= now.getTime() + 1440 * 60_000,
      `${((slot.getTime() - now.getTime()) / 3600_000).toFixed(1)}h`);
  }
}

// --- the same person keeps the same slot ------------------------------------------------
{
  const now = new Date("2026-06-01T00:00:00Z");
  const a = nextLocalSlot({ tz: "Asia/Kolkata", minGapMinutes: 1440, seed: "x@y.com", now });
  const b = nextLocalSlot({ tz: "Asia/Kolkata", minGapMinutes: 1440, seed: "x@y.com", now });
  check("stable across calls", a.getTime(), b.getTime());
}

// --- and the batch spreads rather than stacking on one minute ---------------------------
{
  const now = new Date("2026-06-01T00:00:00Z");
  const minutes = new Set<number>();
  for (let i = 0; i < 400; i++) {
    const s = nextLocalSlot({ tz: "Asia/Kolkata", minGapMinutes: 1440, seed: `user${i}@x.com`, now });
    minutes.add(Math.floor(s.getTime() / 60_000));
  }
  const band = (LOCAL_SEND_END_HOUR - LOCAL_SEND_START_HOUR) * 60;
  assert("400 recipients spread across the band", minutes.size > band * 0.5,
    `${minutes.size} distinct minutes of ${band}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
