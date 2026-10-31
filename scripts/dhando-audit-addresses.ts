/**
 * Counts the malformed addresses still sendable on the Dhando campaign.
 *
 *   npx tsx --env-file=.env.local scripts/dhando-audit-addresses.ts
 *   npx tsx --env-file=.env.local scripts/dhando-audit-addresses.ts --apply   # retire them
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * load-dhando-icp.ts validates with /^[^@\s]+@[^@\s.]+\.[^@\s]+$/, and `[^@\s]+` happily accepts
 * a leading comma, a quote, a semicolon or a stray bracket -- so a row whose CSV columns shifted
 * came through as ",gurjeet_iit@yahoo.com" and counted as valid. SES rejects these outright, and a
 * rejection costs a send and shows up in the raw Bounce count, so they are worth removing before
 * a run rather than discovering one at a time inside it.
 */
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";

/** Deliberately stricter than the loader's: one @, a sane local part, a real TLD. */
const VALID = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

async function main() {
  const apply = process.argv.includes("--apply");
  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const [where] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (where.db !== target.database) { console.error(`REFUSING: pool is on '${where.db}'`); process.exit(1); }

  const rows = (await sql`
    SELECT id, email FROM campaign_recipients
     WHERE campaign_id = ${CAMPAIGN_ID} AND do_not_send = false AND touch_count = 0`
  ) as unknown as { id: string; email: string }[];
  console.log(`sendable: ${rows.length.toLocaleString()}`);

  const bad = rows.filter((r) => !VALID.test(r.email));
  console.log(`malformed: ${bad.length.toLocaleString()} (${(100 * bad.length / rows.length).toFixed(3)}%)`);

  const byShape: Record<string, number> = {};
  for (const r of bad) {
    const shape =
      /^[^a-z0-9]/.test(r.email) ? "leading punctuation" :
      (r.email.match(/@/g) ?? []).length !== 1 ? "wrong @ count" :
      /\s/.test(r.email) ? "whitespace" :
      /[,;<>()\[\]"\\]/.test(r.email) ? "stray delimiter" :
      /\.\./.test(r.email) ? "double dot" :
      /@.*\.[a-z]*[0-9]/.test(r.email) ? "digit in tld" : "other";
    byShape[shape] = (byShape[shape] ?? 0) + 1;
  }
  console.log("by shape:", byShape);
  console.log("samples:");
  for (const r of bad.slice(0, 15)) console.log(`  ${r.email}`);

  if (!apply) { console.log("\nDRY RUN — pass --apply to retire these"); await sql.end(); return; }

  let done = 0;
  for (let i = 0; i < bad.length; i += 1000) {
    const ids = bad.slice(i, i + 1000).map((r) => r.id);
    const res = await sql`
      UPDATE campaign_recipients
         SET do_not_send = true, do_not_send_reason = 'malformed_address', state_changed_at = now()
       WHERE id = ANY(${ids})`;
    done += res.count ?? 0;
  }
  console.log(`retired: ${done}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
