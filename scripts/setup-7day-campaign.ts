/**
 * Creates the 7-day lead push: one campaign, seven steps, two creatives, seven senders.
 *
 *   npx tsx --env-file=.env.local scripts/setup-7day-campaign.ts <multi.html> <single.html>
 *   npx tsx --env-file=.env.local scripts/setup-7day-campaign.ts <multi.html> <single.html> --apply
 *
 * Needs the SSM tunnel open first: scripts/prod-tunnel.sh
 *
 * Seven steps rather than one, because the unique index on (recipient, campaign_id, step_key) is
 * what stops a repeat send. A single step could reach a person once; day1..day7 are seven distinct
 * keys, so the same address can be mailed every day while each day stays idempotent and safe to
 * re-run after a crash.
 *
 * Recipients are seeded from two pools and tagged by source, because the runner spends them in a
 * fixed order (delivered first, new with whatever quota is left):
 *   agency_delivered - addresses that have actually taken delivery AND sit in the Mantis agency
 *                      pool. Not the Dhando rows: those are chemists, gyms and Sulekha listings,
 *                      i.e. the businesses that need a website, not the agencies that buy leads.
 *   registry_new     - scrape_emails rows never sent, MX-checked, not bounced or suppressed.
 *
 * Status stays 'paused' so the outreach dispatcher never touches it. Every send goes through the
 * tick script, which is the only thing that knows the daily ceiling and the OTP reserve.
 */
import { readFileSync } from "node:fs";
import { useProdDb } from "../lib/db-prod";

const CAMPAIGN_ID = "mantis_leads_7day_2026";
const STREAM = "prospect_cold";
const CONFIG_SET = "mantis-agency-campaign";
const SUBJECT = "A lead for {{company}}, need a website";

/** Day -> sender and creative. The runner reads this same table, so it lives in one place. */
export const PLAN = [
  { day: 1, name: "Emily",  variant: "multi"  },
  { day: 2, name: "Manya",  variant: "single" },
  { day: 3, name: "Ellen",  variant: "multi"  },
  { day: 4, name: "Anjali", variant: "single" },
  { day: 5, name: "Yashi",  variant: "multi"  },
  { day: 6, name: "Soumya", variant: "single" },
  { day: 7, name: "Chinki", variant: "multi"  },
] as const;

/** Sends from mantisai.in, not blogyapp.com. AWS Trust and Safety flagged exactly this on
 *  2026-10-17: the sending domain was blogyapp.com, the content said "Mantis", and the links
 *  pointed at mantisai.in -- and blogyapp.com has no website on it at all, so a recipient who
 *  checked the sender found nothing. mantisai.in is already a verified identity (DKIM SUCCESS,
 *  custom MAIL FROM mail.mantisai.in with a valid SPF record), and send-bulk already builds the
 *  unsubscribe URL and Message-ID from it, so the recipient sees one brand throughout.
 *
 *  It is the go.mantisai.in SUBDOMAIN rather than mantisai.in itself, and that distinction is the
 *  whole point. Sign-in codes go out as no-reply@mantisai.in (lib/ses.ts) -- that was why cold mail
 *  ever lived on blogyapp.com. Putting outreach on the bare brand domain would have fixed the
 *  branding complaint by handing cold-mail reputation to the domain that carries sign-in codes.
 *  Mailbox providers track subdomain reputation separately, so outreach can carry the brand
 *  visibly while a bad week here cannot lock users out of their accounts. */
export const senderFor = (name: string) => `${name} <${name.toLowerCase()}@go.mantisai.in>`;
/** Only manya@ has a real mailbox; the other six names have none, so every reply is pointed at
 *  one address that does exist. Reply-To is outside SPF and DMARC, so a different domain is fine. */
export const REPLY_TO = "blogy.reverblunt@gmail.com";
export const stepKey = (p: { day: number; variant: string }) => `day${p.day}_${p.variant}`;

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, h, t) => {
      const l = String(t).replace(/<[^>]+>/g, "").trim(); return l ? `${l}: ${h}` : "";
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&#8594;/g, "->").replace(/&#8599;/g, "^")
    .replace(/&middot;/g, "-").replace(/&#9679;/g, "*").replace(/&#9733;/g, "*")
    .replace(/&eacute;/g, "e").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

async function main() {
  const [multiPath, singlePath] = process.argv.slice(2);
  const apply = process.argv.includes("--apply");
  if (!multiPath || !singlePath) {
    console.error("usage: setup-7day-campaign.ts <multi.html> <single.html> [--apply]"); process.exit(1);
  }

  const html: Record<string, string> = {
    multi: readFileSync(multiPath, "utf8"), single: readFileSync(singlePath, "utf8"),
  };
  for (const [k, v] of Object.entries(html)) {
    if (/data:image/.test(v)) { console.error(`REFUSING: ${k} has data: URIs`); process.exit(1); }
    if (!v.includes("{{unsubscribe_url}}")) { console.error(`REFUSING: ${k} has no unsubscribe tag`); process.exit(1); }
    // Only two tags survive into the stored step. {{unsubscribe_url}} is filled by send-bulk, and
    // {{company}} comes from campaign_recipients.values. Everything else has to be resolved HERE,
    // because nothing downstream fills it.
    //
    // {{leads_url}} used to be on this allowed list, which is how 152,921 emails went out on
    // 2026-10-12 with href="{{leads_url}}" -- a dead CTA. The previews looked perfect because
    // preview-html-file.ts substitutes it before sending; the production path never did. The only
    // working link in those messages was the unsubscribe one, so every recorded "click" was
    // somebody leaving. Whitelisting a tag nobody fills is the same as shipping it raw.
    // {{leads_url}} is legitimate in the source file but must be resolved before the step is
    // stored, because nothing downstream fills it -- see the assertion after substitution below.
    const allowed = ["{{unsubscribe_url}}", "{{company}}", "{{leads_url}}"];
    const bad = [...new Set(v.match(/\{\{[a-z_]+\}\}/g) ?? [])].filter((t) => !allowed.includes(t));
    if (bad.length) { console.error(`REFUSING: ${k} has tags nothing will fill: ${bad.join(",")}`); process.exit(1); }
    for (const u of [...new Set([...v.matchAll(/src="(https:\/\/[^"]+)"/g)].map((m) => m[1]))]) {
      const r = await fetch(u).catch(() => null);
      const ok = !!r?.ok && (r.headers.get("content-type") ?? "").startsWith("image/");
      console.log(`  ${ok ? "OK  " : "FAIL"} ${k.padEnd(6)} ${u}`);
      if (!ok) { console.error("REFUSING: image not serving"); process.exit(1); }
    }
  }

  const target = await useProdDb();
  const { sql } = await import("../lib/db");
  const [w] = (await sql`SELECT current_database() db`) as unknown as { db: string }[];
  if (w.db !== target.database) { console.error(`REFUSING: pool is on '${w.db}'`); process.exit(1); }

  const [counts] = (await sql`
    WITH d AS (SELECT DISTINCT recipient FROM email_events WHERE event_type='Delivery')
    SELECT (SELECT count(*)::int FROM d JOIN campaign_recipients r ON r.email=d.recipient
             WHERE r.campaign_id='mantis_cold_outreach_2026' AND r.do_not_send=false
               AND r.bounce_kind IS NULL
               AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=d.recipient)) AS delivered_pool,
           (SELECT count(*)::int FROM scrape_emails se
             WHERE se.sent_at IS NULL AND NOT coalesce(se.bounced,false)
               AND NOT coalesce(se.suppressed,false) AND coalesce(se.mx_ok,false)
               AND NOT EXISTS (SELECT 1 FROM email_sends s WHERE s.recipient=se.email)
               AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=se.email)) AS registry_new
  `) as unknown as { delivered_pool: number; registry_new: number }[];
  console.log(`\ndelivered pool: ${counts.delivered_pool.toLocaleString()}`);
  console.log(`registry new:   ${counts.registry_new.toLocaleString()}`);
  for (const p of PLAN) console.log(`  ${stepKey(p).padEnd(14)} ${senderFor(p.name).padEnd(34)} ${Buffer.byteLength(html[p.variant])} B`);
  console.log(`  reply-to: ${REPLY_TO}`);

  if (!apply) { console.log("\nDRY RUN — pass --apply"); await sql.end(); return; }

  await sql`
    INSERT INTO campaigns (id, name, sender, stream, status, created_by, variables, max_touches,
                           config_set_unverified, send_window_start_hour, send_window_end_hour, default_tz)
    VALUES (${CAMPAIGN_ID}, 'Mantis 7-day lead push', ${senderFor(PLAN[0].name)}, ${STREAM}, 'paused',
            'tarun', ARRAY['company'], 7, ${CONFIG_SET}, 9, 20, 'Asia/Kolkata')
    ON CONFLICT (id) DO UPDATE SET max_touches=7, config_set_unverified=EXCLUDED.config_set_unverified`;

  for (const p of PLAN) {
    // Resolve {{leads_url}} here, where the step key exists to tag utm_content with. Nothing
    // downstream fills it: send-bulk only handles {{unsubscribe_url}}, and the tick only
    // substitutes keys present in campaign_recipients.values. Storing it raw ships a dead CTA.
    const leadsUrl = `https://mantisai.in/login?tab=signup&utm_source=email&utm_medium=email`
      + `&utm_campaign=${CAMPAIGN_ID}&utm_content=${stepKey(p)}`;
    const body = html[p.variant].replaceAll("{{leads_url}}", leadsUrl);
    const leftover = [...new Set(body.match(/\{\{[a-z_]+\}\}/g) ?? [])]
      .filter((t) => !["{{unsubscribe_url}}", "{{company}}"].includes(t));
    if (leftover.length) {
      console.error(`REFUSING: ${stepKey(p)} still carries ${leftover.join(",")} after substitution`);
      process.exit(1);
    }
    await sql`
      INSERT INTO campaign_steps (campaign_id, step_key, step_order, send_offset_minutes, gap_minutes,
                                  requires_state, is_last_chance, subject, html, text)
      VALUES (${CAMPAIGN_ID}, ${stepKey(p)}, ${p.day}, 0, 1440, 'any', false, ${SUBJECT}, ${body}, ${htmlToText(body)})
      ON CONFLICT (campaign_id, step_key) DO UPDATE SET subject=EXCLUDED.subject,
        html=EXCLUDED.html, text=EXCLUDED.text, step_order=EXCLUDED.step_order`;
    console.log(`  step ${stepKey(p)} written`);
  }

  for (const [src, q] of [
    ["agency_delivered", sql`
      WITH d AS (SELECT DISTINCT recipient FROM email_events WHERE event_type='Delivery')
      SELECT r.email, r.values, r.send_tz FROM d JOIN campaign_recipients r ON r.email=d.recipient
       WHERE r.campaign_id='mantis_cold_outreach_2026' AND r.do_not_send=false AND r.bounce_kind IS NULL
         AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=d.recipient)`],
    ["registry_new", sql`
      SELECT se.email, NULL::jsonb AS values, NULL::text AS send_tz FROM scrape_emails se
       WHERE se.sent_at IS NULL AND NOT coalesce(se.bounced,false) AND NOT coalesce(se.suppressed,false)
         AND coalesce(se.mx_ok,false)
         AND NOT EXISTS (SELECT 1 FROM email_sends s WHERE s.recipient=se.email)
         AND NOT EXISTS (SELECT 1 FROM email_unsubscribes u WHERE lower(u.email)=se.email)`],
  ] as const) {
    const rows = (await q) as unknown as { email: string; values: Record<string,string> | null; send_tz: string | null }[];
    let n = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const batch = rows.slice(i, i + 1000).map((r) => ({
        campaign_id: CAMPAIGN_ID, email: r.email,
        values: sql.json({ company: r.values?.company || "your agency" }) as unknown as string,
        source: src, send_tz: r.send_tz ?? "Asia/Kolkata", send_tz_source: "inherited",
      }));
      const res = await sql`
        INSERT INTO campaign_recipients ${sql(batch, "campaign_id","email","values","source","send_tz","send_tz_source")}
        ON CONFLICT (campaign_id, email) DO NOTHING`;
      n += res.count ?? 0;
    }
    console.log(`  ${src}: ${n.toLocaleString()} loaded`);
  }
  console.table(await sql`
    SELECT source, count(*)::int AS n FROM campaign_recipients
     WHERE campaign_id=${CAMPAIGN_ID} GROUP BY 1 ORDER BY n DESC`);
  await sql.end();
}

// send-7day-tick.ts imports PLAN, senderFor, stepKey and REPLY_TO from here so the schedule lives
// in one place. Without this guard that import also *runs* this script: the first tick hit this
// file's argument parsing and exited with a usage message before sending anything.
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
