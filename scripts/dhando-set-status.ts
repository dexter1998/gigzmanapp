/**
 * Flips the Dhando campaign between paused and active.
 *
 *   npx tsx --env-file=.env.local scripts/dhando-set-status.ts active
 *   npx tsx --env-file=.env.local scripts/dhando-set-status.ts paused
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Exists so that pausing a live blast is one short command and not a hand-written UPDATE against
 * prod at the moment it most needs to be quick. send-dhando-blast.ts refuses to run while the
 * status is anything but active, so this is also the off switch.
 */
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";

async function main() {
  const want = process.argv[2];
  if (want !== "active" && want !== "paused") {
    console.error("usage: dhando-set-status.ts <active|paused>"); process.exit(1);
  }
  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const [where] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (where.db !== target.database) { console.error(`REFUSING: pool is on '${where.db}'`); process.exit(1); }

  const [before] = await sql`SELECT status FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  if (!before) { console.error(`REFUSING: campaign ${CAMPAIGN_ID} not found`); process.exit(1); }
  await sql`UPDATE campaigns SET status = ${want} WHERE id = ${CAMPAIGN_ID}`;
  console.log(`${CAMPAIGN_ID}: ${before.status} -> ${want}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
