/**
 * Sends the partner approval email.
 *
 *   npx tsx scripts/send-partner-approval.ts                      # dry run, prints the list
 *   npx tsx scripts/send-partner-approval.ts --only you@mail.com  # one test send
 *   npx tsx scripts/send-partner-approval.ts --send               # the real run
 *
 * Idempotent by construction: sendBulkEmail claims a row on (recipient, campaign_id, step_key)
 * before it sends, and stepKey is the application id, so re-running cannot double-send. A skip
 * is logged and never retried — a suppressed address that is mailed anyway is recorded by SES as
 * a Bounce, indistinguishable from a real one.
 */
import { sql } from "../lib/db";
import { sendBulkEmail } from "../lib/email/send-bulk";
import { PARTNER_APPROVED_HTML, PARTNER_APPROVED_TEXT } from "../lib/email/lifecycle-templates";

const CAMPAIGN_ID = "partner-approval-2026-10";
const BRAND_KIT_URL = "https://mantisai.in/partner/brand-kit";
/** The mail's step 2 asks for a reply, and credits depend on it. The default sender is no-reply@,
 *  so without this the answer lands nowhere. Reply-To is not SPF/DMARC-checked, so a different
 *  domain than From is fine. */
const REPLY_TO = "Tarun Kumar <tarun@gigzman.com>";
const SUBJECT = "You're approved — Mantis Ai Leads Partner";

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  agency_name: string | null;
  website: string | null;
};

/** Never an empty name and never a literal placeholder: the greeting reads "Hi <this>,". */
function firstName(r: Row): string {
  const fromFull = (r.full_name ?? "").trim().split(/\s+/)[0];
  if (fromFull) return fromFull;
  const fromAgency = (r.agency_name ?? "").trim();
  if (fromAgency) return fromAgency;
  return "there";
}

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

  const rows = (await sql`
    SELECT id, email, full_name, agency_name, website
    FROM partner_applications
    WHERE status = 'approved' AND email IS NOT NULL AND email <> ''
    ORDER BY submitted_at ASC
  `) as unknown as Row[];

  const targets = only ? rows.filter((r) => r.email.toLowerCase() === only.toLowerCase()) : rows;

  if (only && targets.length === 0) {
    console.log(`No approved application for ${only}. Sending a standalone test instead.`);
    const html = PARTNER_APPROVED_HTML.replaceAll("{{first_name}}", "Tarun")
      .replaceAll("{{brand_kit_url}}", BRAND_KIT_URL);
    const text = PARTNER_APPROVED_TEXT.replaceAll("{{first_name}}", "Tarun")
      .replaceAll("{{brand_kit_url}}", BRAND_KIT_URL);
    const res = await sendBulkEmail({
      to: only, subject: SUBJECT, html, text,
      campaignId: CAMPAIGN_ID, stepKey: `partner-approval:test:${Date.now()}`,
      template: "partner_approved", stream: "lifecycle", replyTo: REPLY_TO,
    });
    console.log(res.sent ? `sent test -> ${only}` : `NOT sent -> ${only}: ${res.reason}`);
    await sql.end();
    return;
  }

  console.log(`${targets.length} approved recipient(s). Mode: ${send ? "SEND" : "DRY RUN"}\n`);

  let sent = 0;
  const skipped: string[] = [];

  for (const r of targets) {
    const name = firstName(r);
    if (!send) {
      console.log(`  ${r.email.padEnd(36)} Hi ${name},`.padEnd(66) + (r.website?.trim() || "(no website)"));
      continue;
    }
    const html = PARTNER_APPROVED_HTML.replaceAll("{{first_name}}", name)
      .replaceAll("{{brand_kit_url}}", BRAND_KIT_URL);
    const text = PARTNER_APPROVED_TEXT.replaceAll("{{first_name}}", name)
      .replaceAll("{{brand_kit_url}}", BRAND_KIT_URL);
    try {
      const res = await sendBulkEmail({
        to: r.email, subject: SUBJECT, html, text,
        campaignId: CAMPAIGN_ID, stepKey: `partner-approval:${r.id}`,
        template: "partner_approved", stream: "lifecycle", replyTo: REPLY_TO,
      });
      if (res.sent) {
        sent++;
        await sql`UPDATE partner_applications SET status = 'contacted' WHERE id = ${r.id}`;
      } else {
        skipped.push(`${r.email}: ${res.reason}`);
      }
    } catch (err) {
      skipped.push(`${r.email}: ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((res) => setTimeout(res, 120));
  }

  if (send) {
    console.log(`\nsent ${sent}, skipped ${skipped.length}`);
    for (const s of skipped) console.log(`  skip ${s}`);
  }
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
