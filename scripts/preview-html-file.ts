/**
 * Sends a local HTML file as an email, for eyeballing a creative before it becomes a campaign step.
 *
 *   npx tsx --env-file=.env.local scripts/preview-html-file.ts <email> <file.html> "<subject>" <utm>
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Goes out with mantis_cold_outreach_2026's real sender, stream and configuration set, because a
 * preview rendered under different settings is a preview of nothing -- the config set is what
 * injects open and click tracking, and tracking rewrites every link in the body.
 *
 * step_key is `test:<name>:<ms>`, so the unique index never refuses a second look and these sends
 * stay out of every per-step rate we read off email_sends.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "mantis_cold_outreach_2026";
const COMPANY = "Gigzman";

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
      const label = String(txt).replace(/<[^>]+>/g, "").trim();
      return label ? `${label}: ${href}` : "";
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&#8594;/g, "->").replace(/&#8599;/g, "^")
    .replace(/&middot;/g, "-").replace(/&#9679;/g, "*").replace(/&eacute;/g, "e")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

async function main() {
  const [to, file, subject, utm, senderArg, replyToArg, configSetArg] = process.argv.slice(2);
  if (!to || !file || !subject) {
    console.error('usage: preview-html-file.ts <email> <file.html> "<subject>" [utm] [sender] [reply-to] [config-set]');
    process.exit(1);
  }
  const tag = utm ?? basename(file).replace(/\.html$/, "");
  const leadsUrl = `https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email`
    + `&utm_campaign=${CAMPAIGN_ID}&utm_content=${tag}`;

  let html = readFileSync(file, "utf8");
  if (!html.includes("{{unsubscribe_url}}")) { console.error("REFUSING: no unsubscribe placeholder"); process.exit(1); }
  if (/data:image/.test(html)) { console.error("REFUSING: data: URIs present — Gmail will not render them"); process.exit(1); }

  // Every remote image must already serve as an image, or the preview shows broken artwork and
  // we learn nothing about the design.
  const srcs = [...new Set([...html.matchAll(/src="(https:\/\/[^"]+)"/g)].map((m) => m[1]))];
  console.log(`checking ${srcs.length} image URLs:`);
  let bad = 0;
  for (const u of srcs) {
    const r = await fetch(u).catch(() => null);
    const ct = r?.headers.get("content-type") ?? "";
    const ok = !!r?.ok && ct.startsWith("image/");
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${String(r?.status ?? "ERR").padEnd(4)} ${ct.padEnd(10)} ${u}`);
  }
  if (bad > 0) { console.error(`REFUSING: ${bad} image(s) not serving`); process.exit(1); }

  html = html.replaceAll("{{company}}", COMPANY).replaceAll("{{leads_url}}", leadsUrl);
  const text = htmlToText(html);
  const subj = subject.replaceAll("{{company}}", COMPANY);

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const { sendBulkEmail } = await import("../lib/email/send-bulk");
  const [where] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (where.db !== target.database) { console.error(`REFUSING: pool is on '${where.db}'`); process.exit(1); }

  const [c] = await sql`SELECT sender, stream, config_set_unverified FROM campaigns WHERE id=${CAMPAIGN_ID}`;
  const sender = senderArg || (c.sender as string);
  // Reply-To is not covered by SPF or DMARC, so it is free to name a different domain than From.
  // That is what lets seven different @blogyapp.com names all funnel replies into one mailbox
  // that actually exists -- without it, a reply to a name with no mailbox behind it just bounces.
  const replyTo = replyToArg || null;
  // A config set whose event list omits CLICK leaves hrefs alone. With CLICK on, SES rewrites every
  // link to awstrack.me -- a domain shared across all SES senders, which Google Safe Browsing now
  // flags with "This link looks dangerous". That interstitial sits between the click and the landing
  // page, so the tracking costs more than it measures.
  const configSet = configSetArg || (c.config_set_unverified as string);
  console.log(`from:     ${sender}`);
  console.log(`configSet:${configSet}`);
  if (replyTo) console.log(`reply-to: ${replyTo}`);
  const res = await sendBulkEmail({
    to, subject: subj, html, text, sender, replyTo,
    campaignId: CAMPAIGN_ID,
    stepKey: `test:${tag}:${Date.now()}`,
    template: tag,
    stream: c.stream as string,
    configSet,
    touchNo: null,
  });
  console.log(`\n${res.sent ? "SENT" : "NOT SENT"}  ${Buffer.byteLength(html)} B html / ${Buffer.byteLength(text)} B text`);
  console.log(`subject: ${subj}`);
  if (!res.sent) console.log(`reason:  ${res.reason}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
