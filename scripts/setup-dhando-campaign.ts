/**
 * Creates the Dhando launch campaign and loads its recipients.
 *
 *   npx tsx --env-file=.env.local scripts/setup-dhando-campaign.ts            # dry run
 *   npx tsx --env-file=.env.local scripts/setup-dhando-campaign.ts --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * The recipients are the Mantis addresses that have already accepted mail from us: a recorded
 * delivery, no bounce of any kind, not retired, not unsubscribed. They were chosen over the raw
 * half-million because the target is delivered mail rather than attempted mail, and these are the
 * only addresses already proven to exist. Expect a low bounce rate rather than a zero one --
 * mailboxes close between one send and the next -- so this carries an ordinary stop, not the
 * recovery machinery a cold list would need.
 *
 * It sends from blogyapp.com, which has 505k sends of history, rather than from dhando.live,
 * which has none. A brand-new domain opening with a six-figure day is the shape of a spam run.
 * The trade is that reputation is now shared: a complaint here closes the Mantis gate too.
 */
import { readFileSync } from "node:fs";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "dhando_reviews_2026";
const STEP_KEY = "d1_launch";
const SENDER = "Kavita <kavita@blogyapp.com>";
/** Its own stream, so an unsubscribe here does not silently retire a Mantis recipient. */
const STREAM = "dhando_cold";
/** The Mantis config set, because its SNS wiring already feeds our webhook; without it we would
 *  record sends and learn nothing about deliveries, opens or clicks. */
const CONFIG_SET = "mantis-agency-campaign";
const SUBJECT = "Get more Google reviews for {{company}}";
const HTML_PATH = "/private/tmp/claude-501/-Users-dextermorgan-Desktop-Dhando/c53d33c6-9813-4c77-8ea5-85334287cdec/scratchpad/dhando-email/email-hosted.html";

function htmlToText(html: string): string {
  // A text part is not decoration: a message with no text/plain alternative scores worse with
  // every filter that checks for one.
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
  const apply = process.argv.includes("--apply");
  const target = await useProdDb();
  console.log(`db: ${target.user}@${target.host}/${target.database} (via tunnel)`);
  const { sql } = await import("../lib/db");

  const html = readFileSync(HTML_PATH, "utf8");
  const text = htmlToText(html);
  const dataUris = (html.match(/data:image/g) ?? []).length;
  const links = (html.match(/href="https:\/\/app\.dhando\.live/g) ?? []).length;
  console.log(`html:  ${Buffer.byteLength(html)} bytes, ${dataUris} data URIs, ${links} app links`);
  console.log(`text:  ${Buffer.byteLength(text)} bytes`);
  if (dataUris > 0) { console.error("REFUSING: data: URIs are still present — Gmail will not render them"); process.exit(1); }
  if (!html.includes("{{unsubscribe_url}}")) { console.error("REFUSING: no unsubscribe placeholder"); process.exit(1); }

  // Every image must already be live, or the send puts broken artwork in front of everyone.
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
  if (bad > 0) { console.error(`\nREFUSING: ${bad} image(s) not serving as images yet — deploy first`); process.exit(1); }

  const [{ n: pool }] = (await sql`
    SELECT count(*)::int n FROM campaign_recipients r
     WHERE r.campaign_id='mantis_cold_outreach_2026'
       AND r.do_not_send = false
       AND r.verification_status = 'verified'
       AND r.bounce_kind IS NULL
       AND r.state NOT IN ('suppressed','converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=r.email)`) as unknown as { n: number }[];
  console.log(`\nrecipient pool (delivered, never bounced): ${pool}`);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  await sql`
    INSERT INTO campaigns (id, name, sender, stream, status, created_by, variables, max_touches,
                           config_set_unverified, send_window_start_hour, send_window_end_hour, default_tz)
    VALUES (${CAMPAIGN_ID}, 'Dhando launch — Google reviews', ${SENDER}, ${STREAM}, 'active', 'tarun',
            ARRAY['company'], 1, ${CONFIG_SET}, 9, 20, 'Asia/Kolkata')
    ON CONFLICT (id) DO UPDATE SET sender=EXCLUDED.sender, status='active',
      config_set_unverified=EXCLUDED.config_set_unverified`;
  await sql`
    INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                                requires_state, is_last_chance, subject, html, text)
    VALUES (${CAMPAIGN_ID}, ${STEP_KEY}, 1, 0, 1440, 'any', false, ${SUBJECT}, ${html}, ${text})
    ON CONFLICT (campaign_id, step_key) DO UPDATE SET subject=EXCLUDED.subject,
      html=EXCLUDED.html, text=EXCLUDED.text`;
  console.log("campaign + step written");

  const rows = (await sql`
    SELECT r.email, r.values, r.send_tz FROM campaign_recipients r
     WHERE r.campaign_id='mantis_cold_outreach_2026'
       AND r.do_not_send = false
       AND r.verification_status = 'verified'
       AND r.bounce_kind IS NULL
       AND r.state NOT IN ('suppressed','converted')
       AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=r.email)`) as unknown as
    { email: string; values: Record<string, string>; send_tz: string | null }[];

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000).map((r) => ({
      campaign_id: CAMPAIGN_ID,
      email: r.email,
      values: sql.json({ company: r.values?.company || "your business" }) as unknown as string,
      source: "mantis_delivered_clean",
      send_tz: r.send_tz ?? "Asia/Kolkata",
      send_tz_source: "inherited",
    }));
    const res = await sql`
      INSERT INTO campaign_recipients ${sql(batch, "campaign_id", "email", "values", "source", "send_tz", "send_tz_source")}
      ON CONFLICT (campaign_id, email) DO NOTHING`;
    inserted += res.count ?? 0;
    if (inserted % 20000 < 1000) console.log(`  ${inserted}/${rows.length}`);
  }
  console.log(`recipients loaded: ${inserted}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
