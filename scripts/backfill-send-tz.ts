/**
 * Fills send_tz for every recipient.
 *
 *   npx tsx scripts/backfill-send-tz.ts            # dry run, shows the resolution mix
 *   npx tsx scripts/backfill-send-tz.ts --write
 *
 * Three sources, best first. 'observed' is the one that matters and the one nobody has to buy: if
 * this person opened a previous email at 09:40 in some zone, that is their morning, whatever their
 * domain claims. It only exists after a first touch, which is exactly when follow-up scheduling
 * needs it.
 */
import { sql } from "../lib/db";
import { resolveTz, COUNTRY_TZ, DEFAULT_TZ } from "../lib/outreach/send-time";

/**
 * The zone whose working day best explains when this person actually opened.
 *
 * Opens inside ten minutes of the send are discarded first — those are security scanners, not
 * people, and on this data they are 78-82% of all click activity. What is left is a real human
 * timestamp, and the zone that puts it nearest 11:00 local is the best available guess at where
 * they sit. One open is weak evidence, so this needs two.
 */
function tzFromOpenHours(utcHours: number[]): string | null {
  if (utcHours.length < 2) return null;
  const candidates = [...new Set(Object.values(COUNTRY_TZ))];
  let best: { tz: string; score: number } | null = null;
  for (const tz of candidates) {
    let score = 0;
    for (const h of utcHours) {
      // Offset of this zone right now, in whole hours.
      const probe = new Date();
      const local = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(probe));
      const utc = probe.getUTCHours();
      const offset = ((local - utc + 36) % 24) - 12;
      const localHour = ((h + offset) % 24 + 24) % 24;
      // Distance from 11:00 local, wrapped, so 23:00 is two hours from 01:00 rather than 22.
      const d = Math.min(Math.abs(localHour - 11), 24 - Math.abs(localHour - 11));
      score += Math.max(0, 8 - d);
    }
    if (!best || score > best.score) best = { tz, score };
  }
  // A flat score means every zone explains it equally badly, which is no evidence at all.
  return best && best.score > utcHours.length * 2 ? best.tz : null;
}

async function main() {
  const write = process.argv.includes("--write");

  // The fallback belongs to the campaign. Mantis is an Indian list and Stickly is not, so one
  // shared default would be wrong for one of them by half a planet.
  const campaigns = (await sql`
    SELECT id, default_tz FROM campaigns
     WHERE id IN ('mantis_cold_outreach_2026','stickly_saas_founders_2026')
  `) as unknown as { id: string; default_tz: string }[];
  const defaultFor = new Map(campaigns.map((c) => [c.id, c.default_tz]));
  for (const [id, tz] of defaultFor) console.log(`default for ${id}: ${tz}`);

  const rows = (await sql`
    SELECT cr.id, cr.email, cr.campaign_id, cr.values, cr.send_tz
      FROM campaign_recipients cr
     WHERE cr.campaign_id IN ('mantis_cold_outreach_2026','stickly_saas_founders_2026')
  `) as unknown as { id: string; email: string; campaign_id: string; values: Record<string, string>; send_tz: string | null }[];

  // Human open hours per address, in one pass rather than a query per recipient.
  const openRows = (await sql`
    SELECT es.recipient, EXTRACT(hour FROM ev.created_at)::int AS utc_hour
      FROM email_sends es
      JOIN email_events ev ON ev.ses_message_id = es.ses_message_id AND ev.event_type = 'Open'
     WHERE es.ses_message_id IS NOT NULL
       AND ev.created_at > es.sent_at + interval '10 minutes'
  `) as unknown as { recipient: string; utc_hour: number }[];
  const openHours = new Map<string, number[]>();
  for (const r of openRows) {
    const k = r.recipient.toLowerCase();
    openHours.set(k, [...(openHours.get(k) ?? []), r.utc_hour]);
  }
  console.log(`addresses with human opens: ${openHours.size}`);

  const counts: Record<string, number> = { observed: 0, country: 0, cctld: 0, default: 0 };
  const updates: { id: string; tz: string; source: string }[] = [];

  for (const r of rows) {
    const observed = tzFromOpenHours(openHours.get(r.email.toLowerCase()) ?? []);
    let tz: string, source: string;
    if (observed) { tz = observed; source = "observed"; }
    else {
      // Mantis rows carry no country; the list is Indian, which the domain often shows and the
      // default never would.
      const r2 = resolveTz({ country: r.values?.country, domain: r.values?.domain ?? r.email.split("@")[1] });
      tz = r2.source === "default" ? (defaultFor.get(r.campaign_id) ?? DEFAULT_TZ) : r2.tz;
      source = r2.source;
    }
    counts[source]++;
    updates.push({ id: r.id, tz, source });
  }

  console.log("resolution mix:");
  const total = updates.length;
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(9)} ${String(v).padStart(7)}  ${((100 * v) / total).toFixed(1)}%`);
  }
  const byTz: Record<string, number> = {};
  for (const u of updates) byTz[u.tz] = (byTz[u.tz] ?? 0) + 1;
  console.log("\ntop zones:");
  for (const [tz, n] of Object.entries(byTz).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${tz.padEnd(26)} ${String(n).padStart(7)}`);
  }

  if (!write) { console.log("\nDRY RUN — pass --write"); await sql.end(); return; }

  for (let i = 0; i < updates.length; i += 1000) {
    const chunk = updates.slice(i, i + 1000);
    await sql`
      UPDATE campaign_recipients AS cr
         SET send_tz = v.tz, send_tz_source = v.source
        FROM (VALUES ${sql(chunk.map((u) => [u.id, u.tz, u.source]))}) AS v(id, tz, source)
       WHERE cr.id = v.id::uuid
    `;
    if (i % 20000 === 0) console.log(`  ${i + chunk.length}/${updates.length}`);
  }
  console.log(`updated ${updates.length}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
