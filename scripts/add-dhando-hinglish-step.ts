/**
 * Adds the Hinglish v2 creative as the Dhando campaign's first step.
 *
 *   npx tsx --env-file=.env.local scripts/add-dhando-hinglish-step.ts <html>          # dry run
 *   npx tsx --env-file=.env.local scripts/add-dhando-hinglish-step.ts <html> --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * step_order 0 puts it ahead of d1_launch, which is the English creative that went to the first
 * 2,548 addresses. Those 2,548 are not re-mailed: the unique index on
 * (recipient, campaign_id, step_key) only stops a repeat of the SAME step, so what actually keeps
 * them out is touch_count, and max_touches is 1. Everyone still at touch_count = 0 gets this one
 * instead, which is the point -- the English pitch was the wrong language for a list of Indian
 * shopkeepers.
 *
 * The creative carries no {{company}}, unlike d1. That matters more than it sounds: 261,482 of the
 * 350k sendable addresses come from the Sulekha yellow-pages export, whose company column is empty
 * in every single row. d1's subject is "Get more Google reviews for {{company}}", so on this list
 * it had nothing to merge. v2 has exactly one tag, {{unsubscribe_url}}, and send-bulk fills that
 * itself.
 */
import { readFileSync } from "node:fs";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";
const STEP_KEY = "d2_hinglish";
const SUBJECT = "Rank on google maps now...";

/** Same conversion as setup-dhando-campaign.ts: a message with no text/plain alternative scores
 *  worse with every filter that checks for one. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
      const label = String(txt).replace(/<[^>]+>/g, "").trim();
      return label ? `${label}: ${href}` : "";
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&#8594;/g, "->").replace(/&#169;/g, "(c)")
    .replace(/&amp;/g, "&").replace(/&#183;/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

async function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) { console.error("usage: add-dhando-hinglish-step.ts <html> [--apply]"); process.exit(1); }
  const apply = process.argv.includes("--apply");

  const html = readFileSync(htmlPath, "utf8");
  const text = htmlToText(html);

  // The same three refusals setup-dhando-campaign.ts makes, for the same reasons. A step written
  // without them is a step that mails broken artwork or an unfilled opt-out link to everyone.
  const dataUris = (html.match(/data:image/g) ?? []).length;
  console.log(`html: ${Buffer.byteLength(html)} bytes, ${dataUris} data URIs`);
  console.log(`text: ${Buffer.byteLength(text)} bytes`);
  if (dataUris > 0) { console.error("REFUSING: data: URIs are still present — Gmail will not render them"); process.exit(1); }
  if (!html.includes("{{unsubscribe_url}}")) { console.error("REFUSING: no unsubscribe placeholder"); process.exit(1); }

  // Any {{tag}} other than the unsubscribe link has to resolve from campaign_recipients.values,
  // and on the Sulekha rows that object is effectively empty. An unresolved tag ships the literal
  // braces to the recipient.
  const tags = [...new Set((html.match(/\{\{[a-z_]+\}\}/g) ?? []))].filter((t) => t !== "{{unsubscribe_url}}");
  if (tags.length) { console.error(`REFUSING: unfillable merge tags in creative: ${tags.join(", ")}`); process.exit(1); }
  const subjTags = SUBJECT.match(/\{\{[a-z_]+\}\}/g) ?? [];
  if (subjTags.length) { console.error(`REFUSING: merge tags in subject: ${subjTags.join(", ")}`); process.exit(1); }

  const srcs = [...html.matchAll(/src="(https:\/\/[^"]+)"/g)].map((m) => m[1]);
  console.log(`\nchecking ${srcs.length} image URLs:`);
  let bad = 0;
  for (const u of srcs) {
    const r = await fetch(u, { method: "GET" }).catch(() => null);
    const ct = r?.headers.get("content-type") ?? "";
    const ok = r?.ok && ct.startsWith("image/");
    if (!ok) bad++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${r?.status ?? "ERR"} ${ct.padEnd(12)} ${u}`);
  }
  if (bad > 0) { console.error(`\nREFUSING: ${bad} image(s) not serving as images yet`); process.exit(1); }

  const target = await useProdDb();
  console.log(`\ndb: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");

  console.log("\nsteps now:");
  console.table(await sql`
    SELECT step_key, step_order, subject, length(html) html_bytes
      FROM campaign_steps WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order`);

  console.log("who this step would reach:");
  console.table(await sql`
    SELECT source,
           count(*) FILTER (WHERE do_not_send = false AND touch_count = 0)::int sendable,
           count(*) FILTER (WHERE touch_count > 0)::int already_mailed,
           count(*) FILTER (WHERE do_not_send)::int retired
      FROM campaign_recipients WHERE campaign_id = ${CAMPAIGN_ID} GROUP BY source ORDER BY source`);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  await sql`
    INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                                requires_state, is_last_chance, subject, html, text)
    VALUES (${CAMPAIGN_ID}, ${STEP_KEY}, 0, 0, 1440, 'any', false, ${SUBJECT}, ${html}, ${text})
    ON CONFLICT (campaign_id, step_key) DO UPDATE SET step_order = 0, subject = EXCLUDED.subject,
      html = EXCLUDED.html, text = EXCLUDED.text`;
  console.log(`\n${STEP_KEY} written`);
  console.table(await sql`
    SELECT step_key, step_order, subject, length(html) html_bytes
      FROM campaign_steps WHERE campaign_id = ${CAMPAIGN_ID} ORDER BY step_order`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
