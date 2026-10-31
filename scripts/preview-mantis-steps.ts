/**
 * Sends chosen mantis_cold_outreach_2026 steps to one address, for eyeballing.
 *
 *   npx tsx --env-file=.env.local scripts/preview-mantis-steps.ts <email> t6_multi t3_multi
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Goes out with the campaign's real sender, stream and configuration set, because a preview that
 * renders under different settings is not a preview of anything -- the config set is what injects
 * open and click tracking, and tracking rewrites every link in the body.
 *
 * The step_key is `test:<step>:<ms>` rather than the real one, for two reasons: the unique index on
 * (recipient, campaign_id, step_key) would otherwise refuse a second look at the same mail, and
 * every per-step rate we read off email_sends groups by step_key -- a handful of sends to our own
 * inbox would quietly sit inside t6_multi's open rate forever.
 */
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
/** What {{company}} becomes. A real-looking value, since its length changes how the subject wraps. */
const COMPANY = "Gigzman";

async function main() {
  const to = process.argv[2];
  const steps = process.argv.slice(3);
  if (!to || steps.length === 0) {
    console.error("usage: preview-mantis-steps.ts <email> <step_key> [step_key...]");
    process.exit(1);
  }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  const [where] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (where.db !== target.database) { console.error(`REFUSING: pool is on '${where.db}'`); process.exit(1); }

  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified FROM campaigns WHERE id=${CAMPAIGN_ID}`;
  if (!campaign) { console.error("campaign missing"); process.exit(1); }

  console.log(`to:         ${to}`);
  console.log(`sender:     ${campaign.sender}`);
  console.log(`stream:     ${campaign.stream}`);
  console.log(`config set: ${campaign.config_set_unverified}`);
  console.log(`{{company}} -> ${COMPANY}\n`);

  for (const stepKey of steps) {
    const [step] = (await sql`
      SELECT step_key, subject, html, text FROM campaign_steps
       WHERE campaign_id=${CAMPAIGN_ID} AND step_key=${stepKey}`) as unknown as
       { step_key: string; subject: string; html: string; text: string }[];
    if (!step) { console.error(`  SKIP ${stepKey}: no such step`); continue; }

    const fill = (s: string) => s.replaceAll("{{company}}", COMPANY);
    const res = await sendBulkEmail({
      to,
      subject: fill(step.subject),
      html: fill(step.html),
      text: fill(step.text),
      campaignId: CAMPAIGN_ID,
      stepKey: `test:${stepKey}:${Date.now()}`,
      template: stepKey,
      stream: campaign.stream as string,
      sender: campaign.sender as string,
      configSet: campaign.config_set_unverified as string,
      touchNo: null,
    });
    console.log(`  ${res.sent ? "SENT" : "NOT SENT"}  ${stepKey.padEnd(12)} ${Buffer.byteLength(step.html)
      .toString().padStart(6)} B  "${fill(step.subject)}"${res.sent ? "" : `  (${res.reason})`}`);
  }
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
