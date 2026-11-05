import { sql } from "@/lib/db";
import { maskBusinessName as maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, formatCategory } from "@/lib/categories";
import { COMPANY } from "@/lib/company";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { sendBulkEmail } from "@/lib/email/send-bulk";
import { leadAlertHtml, leadAlertSubject, leadAlertText, type LeadAlert } from "@/lib/email/lead-alert";
import { cityFromAddress } from "@/lib/lifecycle-email";
import { leadInsight } from "@/lib/email/lead-insight";
import { mapToken, renderMap } from "@/lib/email/map-image";
import { dailyCap, sentToday, streamConfig } from "@/lib/email/streams";
import type { CompiledPlan } from "@/lib/v2/planner";

/**
 * Bark-style lead alerts from mantisleads.live: one lead per mail, picked from businesses already
 * in our registry that match a search the user ran in V2 and that they haven't seen yet.
 *
 * Runs hourly but sends only in three IST slots, 10:00, 15:00 and 20:00 — five hours apart, and
 * placed on the two times Mantis users actually show up (product_events, 26 Oct–5 Nov: the peak is
 * 15:00–17:00 IST with a second one at 20:00). Bark mails 8–29 a day and never slows down while
 * nobody responds; here it is at most three, and only the 15:00 slot for anyone who hasn't searched
 * in two weeks.
 *
 * "Searched" means either a V2 chat run or a map search (area_scans). Most users only ever use the
 * map (172 map searchers vs 108 chat users), so alerts built only from chat runs missed most of
 * them; a map search becomes an alert plan of its category within 6 km of where they looked.
 *
 * Costs nothing per alert: no Places, Exa or Apollo call happens here. A lead is only ever mailed
 * to a given user once, which the step key `lead:<id>` enforces through email_sends' unique index.
 */

export const ALERT_CAMPAIGN = "lead_alerts";
/** The unsubscribe stream; someone who turns alerts off still gets sign-in codes and receipts. */
export const ALERT_STREAM = "lead_alerts";
/** IST hours an alert may go out in; an idle user gets only IDLE_SLOT. */
export const ALERT_SLOTS_IST = [10, 15, 20];
const IDLE_SLOT = 15;
const IDLE_AFTER_DAYS = 14;
const MAP_RADIUS_M = 6_000;
/** A search older than this no longer says what someone is looking for. */
const PLAN_MAX_AGE_DAYS = 60;
/** Floor and ceiling on the radius around a search's centre. */
const MIN_RADIUS_M = 5_000, MAX_RADIUS_M = 30_000;

type Recipient = { email: string; name: string | null; credits: number; last_alert: string | null; last_run: string; offer: string | null };
type Lead = {
  id: string; business_name: string; category: string | null; address: string | null;
  phone: string | null; email: string | null; rating: number | null; review_count: number | null;
  has_website: boolean | null; lat: number | null; lng: number | null; postal_code: string | null;
};

function istHour(d = new Date()): number {
  return (d.getUTCHours() + 5 + (d.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
}

function maskPhone(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (digits.length < 6) return null;
  return `${digits.slice(0, 3)}** ${"*".repeat(Math.max(digits.length - 5, 4))}`;
}

function maskEmail(email: string | null): string | null {
  const m = (email ?? "").match(/^([^@]+)@([^.]+)\.(.+)$/);
  if (!m) return null;
  const [, user, host, tld] = m;
  return `${user[0]}${"*".repeat(Math.max(user.length - 1, 3))}@${host[0]}${"*".repeat(Math.max(host.length - 1, 2))}.${tld}`;
}

/**
 * Accounts that can be mailed (the same "proven address" rule as lib/lifecycle-email.ts) and have
 * searched recently, in chat or on the map, since the search is what an alert is matched against.
 */
async function recipients(): Promise<Recipient[]> {
  return (await sql`
    SELECT p.email, p.name, COALESCE(p.credits, 0) AS credits,
           (SELECT max(s.sent_at) FROM email_sends s
             WHERE s.recipient = p.email AND s.campaign_id = ${ALERT_CAMPAIGN}) AS last_alert,
           r.last_run,
           COALESCE(NULLIF(i.offer, ''), NULLIF(f.custom_service, ''), NULLIF(f.primary_service, '')) AS offer
    FROM user_profiles p
    LEFT JOIN icps i ON i.user_email = p.email
    LEFT JOIN freelancer_profiles f ON f.email = p.email
    JOIN LATERAL (
      SELECT GREATEST(
        (SELECT max(created_at) FROM v2_runs
          WHERE user_email = p.email AND kind = 'search' AND status = 'done'
            AND created_at > now() - make_interval(days => ${PLAN_MAX_AGE_DAYS})),
        (SELECT max(created_at) FROM area_scans
          WHERE requested_by = p.email AND category IS NOT NULL AND center_lat IS NOT NULL
            AND created_at > now() - make_interval(days => ${PLAN_MAX_AGE_DAYS}))
      ) AS last_run
    ) r ON r.last_run IS NOT NULL
    WHERE p.is_synthetic_email = false
      AND (p.email_verified = true OR p.password_hash IS NULL)
    -- Most recently active first: under the warm-up cap they're the ones who open, and opens are
    -- what earn a new domain the inbox.
    ORDER BY r.last_run DESC
  `) as Recipient[];
}

async function recentPlans(email: string): Promise<CompiledPlan[]> {
  const rows = (await sql`
    SELECT plan FROM v2_runs
    WHERE user_email = ${email} AND kind = 'search' AND status = 'done'
      AND created_at > now() - make_interval(days => ${PLAN_MAX_AGE_DAYS})
    ORDER BY created_at DESC LIMIT 5
  `) as Array<{ plan: CompiledPlan }>;
  const chat = rows.map((r) => r.plan).filter((p) => p?.goal === "clients" && p.center && p.trades?.length);

  // Map searches, newest first, one per category. The map is a no-website finder, so its alerts
  // only offer businesses without one.
  const scans = (await sql`
    SELECT DISTINCT ON (category) category, area_label, center_lat, center_lng, created_at
    FROM area_scans
    WHERE requested_by = ${email} AND category IS NOT NULL AND center_lat IS NOT NULL
      AND created_at > now() - make_interval(days => ${PLAN_MAX_AGE_DAYS})
    ORDER BY category, created_at DESC
  `) as Array<{ category: string; area_label: string; center_lat: number; center_lng: number; created_at: string }>;
  const map = scans
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5)
    .map((s): CompiledPlan => {
      const label = formatCategory(s.category) ?? s.category;
      return {
        title: `${label} near ${s.area_label} with no website`, goal: "clients", service: null, playbookIds: [],
        mustHave: ["no_website"], trades: [{ placeType: s.category, label }], areaText: s.area_label,
        center: { lat: s.center_lat, lng: s.center_lng }, radiusM: MAP_RADIUS_M, target: 1, needContacts: false,
        assumptions: null, cannotDo: null, steps: [], estCredits: 0,
      };
    });
  return [...chat, ...map];
}

/** Unseen registry leads for one plan, best first. "Unseen" = not delivered in any of their runs,
 *  not on their own map searches, not unlocked by them, and never alerted to them before. */
async function rankedLeads(email: string, plan: CompiledPlan): Promise<Lead[]> {
  const types = plan.trades.map((t) => t.placeType);
  const radius = Math.min(Math.max(plan.radiusM ?? 0, MIN_RADIUS_M), MAX_RADIUS_M);
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((plan.center.lat * Math.PI) / 180));
  const noSiteOnly = (plan.mustHave ?? []).includes("no_website");

  const rows = (await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.phone, l.email, l.rating, l.review_count, l.has_website, l.lat, l.lng, l.postal_code
    FROM leads l
    WHERE l.category = ANY(${types})
      AND l.is_competitor = false
      AND l.lat BETWEEN ${plan.center.lat - dLat} AND ${plan.center.lat + dLat}
      AND l.lng BETWEEN ${plan.center.lng - dLng} AND ${plan.center.lng + dLng}
      AND (${!noSiteOnly} OR l.has_website = false)
      AND NOT EXISTS (SELECT 1 FROM v2_results r JOIN v2_runs vr ON vr.id = r.run_id
                      WHERE vr.user_email = ${email} AND r.lead_id = l.id)
      AND NOT EXISTS (SELECT 1 FROM unlocks u WHERE u.lead_id = l.id AND u.unlocked_by = ${email})
      AND NOT EXISTS (SELECT 1 FROM area_scans a WHERE a.id = l.area_scan_id AND a.requested_by = ${email})
      AND NOT EXISTS (SELECT 1 FROM email_sends s WHERE s.recipient = ${email}
                      AND s.campaign_id = ${ALERT_CAMPAIGN} AND s.lead_id = l.id)
    ORDER BY l.created_at DESC
    LIMIT 80
  `) as Lead[];

  const scored = rows.map((r) => ({
    r,
    heat: heatScore({
      rating: r.rating, review_count: r.review_count, has_website: r.has_website,
      primary_type: r.category, section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
      address: r.address,
    }) + (r.phone ? 5 : 0),
  }));
  scored.sort((a, b) => b.heat - a.heat);
  return scored.map((x) => x.r);
}

async function bestLead(email: string, plan: CompiledPlan): Promise<Lead | null> {
  return (await rankedLeads(email, plan))[0] ?? null;
}

/**
 * The leads behind the "come back" email (lib/user-mail.ts, comeback_leads): unseen leads for the
 * person's most recent search that still has some, so the mail can show real businesses the way
 * Bark's digest does instead of saying "new leads are waiting".
 */
export async function unseenLeadsFor(email: string, limit = 4): Promise<{ plan: CompiledPlan; total: number; leads: Lead[] } | null> {
  for (const plan of await recentPlans(email)) {
    const leads = await rankedLeads(email, plan);
    if (leads.length) return { plan, total: leads.length, leads: leads.slice(0, limit) };
  }
  return null;
}

export type AlertResult = { email: string; sent: boolean; reason?: string; leadId?: string; subject?: string };

/**
 * @param dryRun pick the lead each user would get and report it, without sending or recording.
 * @param only restrict to these addresses (a test send to one account).
 * @param ignoreSchedule skip the IST window and the per-user interval (test sends only).
 * @param testTo send the alert picked for the first matching user to these addresses instead, with
 *   the map carried inline (a laptop's app URL isn't reachable from Gmail). Records nothing against
 *   the real user, so their schedule and seen-leads are untouched.
 */
export async function runLeadAlerts(opts: { dryRun?: boolean; only?: string[]; ignoreSchedule?: boolean; testTo?: string[] } = {}): Promise<AlertResult[]> {
  const { dryRun = false, only, ignoreSchedule = false, testTo } = opts;
  const hour = istHour();
  if (!ignoreSchedule && !ALERT_SLOTS_IST.includes(hour)) return [];

  const out: AlertResult[] = [];
  let budget = testTo || dryRun ? Infinity : dailyCap("leads") - await sentToday("leads");
  for (const user of await recipients()) {
    if (only && !only.includes(user.email)) continue;
    if (budget <= 0) { out.push({ email: user.email, sent: false, reason: "daily warm-up cap reached" }); continue; }
    try {
      const idle = Date.now() - new Date(user.last_run).getTime() > IDLE_AFTER_DAYS * 86_400_000;
      if (!ignoreSchedule && idle && hour !== IDLE_SLOT) continue;
      // Someone who has gone quiet gets one Mantis mail a day at most: if lib/user-mail.ts already
      // wrote to them today (the come-back series shows them leads too), the alert waits.
      if (!ignoreSchedule && idle) {
        const [m] = (await sql`SELECT 1 FROM email_sends WHERE recipient = ${user.email} AND campaign_id = 'user_mail'
          AND sent_at > now() - interval '20 hours' LIMIT 1`) as Array<{ "?column?": number }>;
        if (m) continue;
      }
      // One per slot: anything sent in the last four hours means this slot's alert already went.
      if (!ignoreSchedule && user.last_alert && Date.now() - new Date(user.last_alert).getTime() < 4 * 3_600_000) continue;

      // Someone sent the weekly digest (lib/user-mail.ts) because they ignored alerts gets only the
      // digest until they come back; the digest tells them so.
      if (!testTo) {
        const [d] = (await sql`
          SELECT s.sent_at FROM email_sends s WHERE s.recipient = ${user.email} AND s.campaign_id = 'user_mail'
            AND s.step_key LIKE 'digest:%' AND s.sent_at > now() - interval '7 days'
            AND NOT EXISTS (SELECT 1 FROM product_events e WHERE e.user_email = ${user.email} AND e.created_at > s.sent_at)
          LIMIT 1`) as Array<{ sent_at: string }>;
        if (d) continue;
      }

      let picked: { lead: Lead; plan: CompiledPlan } | null = null;
      for (const plan of await recentPlans(user.email)) {
        const lead = await bestLead(user.email, plan);
        if (lead) { picked = { lead, plan }; break; }
      }
      // Nothing new matches: send nothing. An alert with no lead in it is just noise.
      if (!picked) { out.push({ email: user.email, sent: false, reason: "no unseen match" }); continue; }

      const { lead, plan } = picked;
      const [{ n }] = (await sql`SELECT count(*)::int AS n FROM unlocks WHERE lead_id = ${lead.id} AND unlocked_by <> ${user.email}`) as Array<{ n: number }>;
      const category = formatCategory(lead.category) ?? plan.trades[0]?.label ?? "Local business";
      const city = cityFromAddress(lead.address) ?? plan.areaText;
      // Bark's "Belfast, BT5": the postcode makes the area concrete without naming the street.
      const area = lead.postal_code ? `${city}, ${lead.postal_code}` : city;
      // What the recipient sells, in their words: the plan's service, else their ICP offer.
      const service = plan.service || user.offer || "your services";
      const insight = await leadInsight(service, {
        category, area, rating: lead.rating, reviewCount: lead.review_count, hasWebsite: lead.has_website,
        hasPhone: !!lead.phone, hasEmail: !!lead.email, signals: plan.mustHave ?? [],
      });
      const hasMap = lead.lat != null && lead.lng != null;
      const alert: LeadAlert = {
        leadName: maskName(lead.business_name),
        category,
        area,
        rating: lead.rating,
        reviewCount: lead.review_count,
        hasWebsite: lead.has_website,
        phoneMasked: maskPhone(lead.phone),
        emailMasked: maskEmail(lead.email),
        searchTitle: plan.title,
        unlockedBy: n,
        creditCost: CREDIT_COST.lead_unlock,
        creditsLeft: Number(user.credits),
        insight,
        mapUrl: !hasMap ? null : testTo ? "cid:lead-map" : `${COMPANY.site}/api/email/map/${mapToken(lead.lat!, lead.lng!)}`,
        unlockUrl: `${COMPANY.site}/my-leads/${lead.id}?src=alert`,
        detailsUrl: `${COMPANY.site}/my-leads/${lead.id}?src=alert&view=details`,
        pricingUrl: `${COMPANY.site}/settings/billing?src=alert`,
        preferencesUrl: `${COMPANY.site}/preferences`,
        from: streamConfig("leads").from.match(/<([^>]+)>/)?.[1] ?? "alerts@mantisleads.live",
      };
      const subject = leadAlertSubject(alert);
      if (dryRun) { out.push({ email: user.email, sent: false, reason: "dry run", leadId: lead.id, subject }); continue; }

      if (testTo) {
        const map = hasMap ? await renderMap(lead.lat!, lead.lng!) : null;
        const stamp = Date.now();
        for (const to of testTo) {
          const res = await sendBulkEmail({
            to, subject, html: leadAlertHtml(alert), text: leadAlertText(alert),
            campaignId: "mail_test", stepKey: `lead_alert:${stamp}`, template: "lead_alert_v1",
            stream: ALERT_STREAM, via: "leads",
            inlineImages: map ? [{ cid: "lead-map", contentType: "image/png", data: map }] : undefined,
          });
          out.push({ email: to, sent: res.sent, reason: res.reason, leadId: lead.id, subject });
        }
        return out;
      }

      const res = await sendBulkEmail({
        to: user.email,
        subject,
        html: leadAlertHtml(alert),
        text: leadAlertText(alert),
        campaignId: ALERT_CAMPAIGN,
        stepKey: `lead:${lead.id}`,
        template: "lead_alert_v1",
        stream: ALERT_STREAM,
        leadId: lead.id,
        via: "leads",
      });
      if (res.sent) budget--;
      out.push({ email: user.email, sent: res.sent, reason: res.reason, leadId: lead.id, subject });
    } catch (err) {
      out.push({ email: user.email, sent: false, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}
