/**
 * One-off test of the Stickly cold email, through the real send path.
 *
 *   npx tsx scripts/send-stickly-test.ts you@example.com [domain] [first_name]
 *
 * Uses sendBulkEmail and the step row from the database, so what lands in the inbox is exactly
 * what the campaign would send — same subject, same HTML, same sender, same configuration set.
 * Rendering the template in a browser proves the design; only this proves the pipeline.
 */
import { sql } from "../lib/db";
import { sendBulkEmail } from "../lib/email/send-bulk";

const CAMPAIGN_ID = "stickly_saas_founders_2026";

async function main() {
  const to = process.argv[2];
  const domain = process.argv[3] ?? "sorank.com";
  const firstName = process.argv[4] ?? "Thibault";
  if (!to) { console.error("usage: send-stickly-test.ts <email> [domain] [first_name]"); process.exit(1); }

  const [campaign] = await sql`
    SELECT sender, stream, config_set_unverified FROM campaigns WHERE id = ${CAMPAIGN_ID}`;
  const [step] = await sql`
    SELECT step_key, subject, html, text FROM campaign_steps
     WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order LIMIT 1`;
  if (!campaign || !step) { console.error("campaign or step missing"); process.exit(1); }

  const values: Record<string, string> = {
    domain,
    first_name: firstName,
    cta_url: `https://stickly.live/?utm_source=email&utm_medium=email&utm_campaign=${CAMPAIGN_ID}&utm_content=${step.step_key}`,
  };
  const fill = (s: string) =>
    Object.entries(values).reduce((out, [k, v]) => out.replaceAll(`{{${k}}}`, v), s);

  const html = fill(step.html as string);
  const text = fill(step.text as string);
  const subject = fill(step.subject as string);

  // A placeholder that survives to the inbox is the one failure a screenshot never catches,
  // because the preview is rendered from values that were filled by hand.
  const left = [...`${html} ${text} ${subject}`.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]);
  const unexpected = left.filter((t) => t !== "unsubscribe_url");
  if (unexpected.length) { console.error("unfilled placeholders:", [...new Set(unexpected)]); process.exit(1); }

  console.log(`subject: ${subject}`);
  console.log(`sender:  ${campaign.sender}`);
  console.log(`to:      ${to}`);

  const res = await sendBulkEmail({
    to,
    subject,
    html,
    text,
    campaignId: CAMPAIGN_ID,
    stepKey: `test:${step.step_key}:${Date.now()}`,
    template: step.step_key as string,
    stream: campaign.stream as string,
    sender: campaign.sender as string,
    configSet: campaign.config_set_unverified as string,
  });
  console.log(res.sent ? "SENT" : `NOT SENT: ${res.reason}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
