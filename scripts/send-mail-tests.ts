/**
 * Renders every catalogue email (lib/email/catalog.ts) and one real lead alert, writes them as HTML
 * for a look, and with --send mails each one to the given addresses through its own stream.
 *
 *   npx tsx --env-file=.env.local scripts/send-mail-tests.ts <outDir>                    render only
 *   npx tsx --env-file=.env.local scripts/send-mail-tests.ts <outDir> --send a@x,b@y     render + send
 *     --only lead_alert,usage_meter   just these (lead_alert = the alert)
 *     --gap 45                        seconds between sends; a burst of promotional mail from a new
 *                                     domain is itself a spam signal to Gmail
 *     --plain                         no "[TEST n/N]" subject prefix, to see real placement
 *
 * Test sends go under campaign "mail_test" with a timestamped step key, so they never block a real
 * send of the same mail later. Subjects are prefixed [TEST n/N] so the set reads in order.
 */
import { writeFileSync } from "node:fs";
import { sql } from "@/lib/db";
import { CATALOG, type MailId } from "@/lib/email/catalog";
import { sendBulkEmail } from "@/lib/email/send-bulk";
import { leadAlertHtml, leadAlertSubject, type LeadAlert } from "@/lib/email/lead-alert";
import { leadInsight } from "@/lib/email/lead-insight";
import { renderMap } from "@/lib/email/map-image";
import { runLeadAlerts } from "@/lib/lead-alerts";
import { maskBusinessName as maskName } from "@/lib/mask";
import { formatCategory } from "@/lib/categories";

async function main() {
  const out = process.argv[2];
  const sendIdx = process.argv.indexOf("--send");
  const to = sendIdx > 0 ? process.argv[sendIdx + 1].split(",").map((s) => s.trim()) : [];
  if (!out) throw new Error("outDir required");
  const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const only = arg("--only")?.split(",").map((s) => s.trim()) ?? null;
  const gapMs = Number(arg("--gap") ?? 0) * 1000;
  const plain = process.argv.includes("--plain");
  const pause = () => new Promise((r) => setTimeout(r, gapMs));

  // A real lead from the registry for the alert preview.
  const [lead] = (await sql`
    SELECT business_name, category, address, rating, review_count, has_website, phone, lat, lng, postal_code
    FROM leads WHERE has_website = false AND phone IS NOT NULL AND lat IS NOT NULL AND review_count > 80
      AND category = 'dentist' ORDER BY review_count DESC LIMIT 1`) as Array<{
      business_name: string; category: string; address: string; rating: number; review_count: number;
      has_website: boolean; phone: string; lat: number; lng: number; postal_code: string | null }>;
  const category = formatCategory(lead.category) ?? "Dentist";
  const city = lead.address.split(",").slice(-3, -2)[0]?.trim() || "Gurugram";
  const area = lead.postal_code ? `${city}, ${lead.postal_code}` : city;
  const insight = await leadInsight("website design and development", {
    category, area, rating: lead.rating, reviewCount: lead.review_count, hasWebsite: false, hasPhone: true, hasEmail: false, signals: ["no_website"],
  });
  writeFileSync(`${out}/map.png`, await renderMap(lead.lat, lead.lng));
  const alert: LeadAlert = {
    leadName: maskName(lead.business_name), category, area, rating: lead.rating, reviewCount: lead.review_count,
    hasWebsite: false, phoneMasked: `${lead.phone.replace(/\D/g, "").slice(-10, -7)}** *****`, emailMasked: null,
    searchTitle: `${category}s in ${city} with no website`, unlockedBy: 2, creditCost: 5, creditsLeft: 3, insight,
    mapUrl: "map.png", unlockUrl: "https://mantisai.in/my-leads/x", detailsUrl: "https://mantisai.in/my-leads/x",
    pricingUrl: "https://mantisai.in/settings/billing", preferencesUrl: "https://mantisai.in/preferences", from: "alerts@mantisleads.live",
  };
  writeFileSync(`${out}/00-lead_alert.html`, leadAlertHtml(alert));
  console.log(`00 lead_alert: ${leadAlertSubject(alert)}`);
  console.log("   insight:", JSON.stringify(insight));

  const ids = Object.keys(CATALOG) as MailId[];
  const total = ids.length + 1;
  ids.forEach((id, i) => {
    const e = CATALOG[id];
    const r = (e.render as (d: unknown) => { subject: string; html: string })(e.sample);
    writeFileSync(`${out}/${String(i + 1).padStart(2, "0")}-${id}.html`, r.html);
    console.log(`${String(i + 1).padStart(2, "0")} ${id} [${e.via}/${e.stream}]: ${r.subject}`);
  });
  if (!to.length) return;

  const stamp = Date.now();
  if (!only || only.includes("lead_alert")) {
    const alerts = await runLeadAlerts({ testTo: to, ignoreSchedule: true });
    console.log("lead alert sends:", alerts.map((a) => `${a.email}:${a.sent ? "sent" : a.reason}`).join(" "));
    await pause();
  }
  for (const [i, id] of ids.entries()) {
    if (only && !only.includes(id)) continue;
    const e = CATALOG[id];
    const r = (e.render as (d: unknown) => { subject: string; html: string; text: string })(e.sample);
    for (const addr of to) {
      const res = await sendBulkEmail({
        to: addr, subject: plain ? r.subject : `[TEST ${i + 2}/${total}] ${r.subject}`, html: r.html, text: r.text,
        campaignId: "mail_test", stepKey: `${id}:${stamp}`, template: id, stream: e.stream, via: e.via,
      });
      console.log(`sent ${id} → ${addr}: ${res.sent ? "ok" : res.reason}`);
    }
    await pause();
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
