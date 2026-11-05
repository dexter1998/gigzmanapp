import { sql } from "@/lib/db";
import { formatCategory } from "@/lib/categories";
import { maskBusinessName as maskName } from "@/lib/mask";
import { sendBulkEmail } from "@/lib/email/send-bulk";
import { dailyCap, sentToday } from "@/lib/email/streams";
import { CATALOG, type MailId } from "@/lib/email/catalog";
import { createHash } from "node:crypto";
import { ALERT_CAMPAIGN, unseenLeadsFor } from "@/lib/lead-alerts";
import type { CompiledPlan } from "@/lib/v2/planner";

/**
 * Who is due which catalogue email (lib/email/catalog.ts), evaluated hourly.
 *
 * - One nudge per user per day at most. The order of RULES is the priority when several are due:
 *   time-sensitive first (expiry, a fresh reply, a finished search), then usage, then asks.
 *   first_reply and plan_expiry don't count towards the cap and aren't stopped by it.
 * - Every send is claimed under campaign "user_mail" with a step key, so a rule that stays true
 *   (someone stays at 80% usage for a week) still sends once.
 * - Sent only 09:00–20:59 IST; weekly mails only on Mondays.
 * - Mails that promise something the product may not have yet are off until it's configured:
 *     MAIL_REFERRAL_URL (with {code}) + MAIL_REFERRAL_REWARD   referral
 *     MAIL_COMMUNITY_URL                                       community_invite
 *     MAIL_BOOKING_URL                                         office_hours
 *     MAIL_GET_LISTED=1                                        get_listed (needs a vendor listing)
 *     MAIL_WHITE_LABEL=1                                       white_label
 *     MAIL_CASE_STUDY_REWARD (optional, e.g. "500 credits")    case_study_ask's thank-you line
 *   feature_launch, beta_invite and annual_plan are broadcasts, sent by script, never by a rule.
 */

export const USER_MAIL_CAMPAIGN = "user_mail";
const UNCAPPED: MailId[] = ["first_reply", "plan_expiry"];

/** WhatsApp/call clicks arrive under several names (product_events, 2026-11-05):
 *  leads.lead.contact_whatsapp, leads.link.whatsapp_<business>, chat.link.whatsapp_<business>. */
const WHATSAPP_EVENTS = "^(leads\\.lead\\.contact_whatsapp|(leads|chat)\\.link\\.whatsapp_)";
const CALL_EVENTS = "^(leads\\.lead\\.contact_call|(leads|chat)\\.link\\.call_)";

/**
 * Flows with a 10% holdout: these people never get that mail, so its effect can be measured against
 * them. Deterministic (a hash of address + flow), so the same holdout can be recomputed at analysis
 * time with nothing stored. Notices people need (plan expiry, a reply, low credits) have none.
 */
const HOLDOUT_FLOWS: MailId[] = [
  "map_to_chat", "ai_caller_unlocked", "whatsapp_one_by_one", "calls_for_you", "plan_ready", "run_recap",
  "campaign_unfinished", "comeback_leads", "founder_question", "find_more", "win_back",
];
export function inHoldout(email: string, flow: string): boolean {
  return createHash("sha256").update(`${email.toLowerCase()}:${flow}`).digest()[0] % 10 === 0;
}

type User = {
  email: string; name: string | null; credits: number; credits_limit: number; plan: string;
  plan_expires_at: string | null; created_at: string; role: string | null; business_type: string | null;
  last_active: string | null; website: string | null; business: string | null;
};

type Due = { id: MailId; step: string; data: Record<string, unknown> };
type Rule = (u: User, ctx: Ctx) => Promise<Due | null>;
type Ctx = { now: Date; monday: boolean; week: string };

const first = (u: User) => (u.name ?? "").trim().split(/\s+/)[0] || null;
const days = (iso: string | null, now: Date) => (iso ? (now.getTime() - new Date(iso).getTime()) / 86_400_000 : Infinity);
const one = async <T>(q: Promise<unknown>) => ((await q) as T[])[0];

function istNow(d = new Date()) {
  return new Date(d.getTime() + 330 * 60_000);
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}w${Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7)}`;
}

const RULES: Array<[MailId, Rule]> = [
  ["plan_expiry", async (u, { now }) => {
    if (!u.plan_expires_at || u.plan === "free") return null;
    const left = -days(u.plan_expires_at, now);
    if (left <= 0 || left > 7) return null;
    const d = left <= 1.2 ? 1 : 7;
    if (d === 7 && left < 5) return null; // the 7-day notice is late; the 1-day one will follow
    return { id: "plan_expiry", step: `plan_expiry:${d}:${u.plan_expires_at.slice(0, 10)}`,
      data: { firstName: first(u), plan: u.plan === "pro" ? "Growth" : u.plan === "business" ? "Scale" : "Starter", daysLeft: d, credits: u.credits } };
  }],

  ["first_reply", async (u) => {
    const r = await one<{ from_name: string | null; from_address: string; body: string; received_at: string }>(sql`
      SELECT from_name, from_address, body, received_at FROM v2_inbox
      WHERE user_email = ${u.email} ORDER BY received_at ASC LIMIT 1`);
    if (!r || days(r.received_at, new Date()) > 3) return null;
    const company = r.from_address.split("@")[1]?.split(".")[0] ?? "a lead";
    return { id: "first_reply", step: "first_reply",
      data: { firstName: first(u), replier: r.from_name || r.from_address, company: company.charAt(0).toUpperCase() + company.slice(1), snippet: r.body.replace(/\s+/g, " ").slice(0, 240) } };
  }],

  /* ---- trigger table, section A: map-heavy users → chat and the AI caller ---- */

  ["map_to_chat", async (u, { now }) => {
    if (istNow(now).getUTCHours() < 10) return null; // next morning, 10:00 IST
    const s = await one<{ y: number; chats: number }>(sql`
      SELECT count(*) FILTER (WHERE event = 'leads.map.search'
               AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date - 1)::int AS y,
             count(*) FILTER (WHERE event = 'chat.message.send')::int AS chats
      FROM product_events WHERE user_email = ${u.email}`);
    if (s.y < 20 || s.chats > 0) return null;
    const scan = await one<{ category: string | null; area_label: string }>(sql`
      SELECT category, area_label FROM area_scans WHERE requested_by = ${u.email} AND category IS NOT NULL ORDER BY created_at DESC LIMIT 1`);
    if (!scan?.category) return null;
    const city = scan.area_label.split(",").map((x) => x.trim()).filter(Boolean).pop() ?? scan.area_label;
    const what = formatCategory(scan.category) ?? scan.category;
    return { id: "map_to_chat", step: "map_to_chat", data: { firstName: first(u), searches: s.y, prompt: `${what}s in ${city} without a website` } };
  }],

  ["ai_caller_unlocked", async (u) => {
    const s = await one<{ n: number; last: string | null; tried: number; campaigns: number }>(sql`
      SELECT count(*)::int AS n, max(unlocked_at) AS last,
             (SELECT count(*) FROM product_events WHERE user_email = ${u.email}
               AND (event LIKE 'campaigns.%' OR event LIKE 'integrations.voice.%'))::int AS tried,
             (SELECT count(*) FROM v2_campaigns WHERE user_email = ${u.email})::int AS campaigns
      FROM unlocks WHERE unlocked_by = ${u.email}`);
    // Stops by itself once they touch campaigns or the voice setup: that was the point of the mail.
    if (!s || s.n < 3 || s.tried > 0 || s.campaigns > 0 || days(s.last, new Date()) < 1) return null;
    const names = (await sql`
      SELECT l.business_name FROM unlocks u JOIN leads l ON l.id = u.lead_id
      WHERE u.unlocked_by = ${u.email} ORDER BY u.unlocked_at DESC LIMIT 5`) as Array<{ business_name: string }>;
    return { id: "ai_caller_unlocked", step: "ai_caller_unlocked", data: { firstName: first(u), unlocked: s.n, names: names.map((r) => r.business_name) } };
  }],

  ["whatsapp_one_by_one", async (u, { now }) => {
    if (istNow(now).getUTCHours() < 18) return null; // the same evening
    const s = await one<{ n: number; today: number }>(sql`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date)::int AS today
      FROM product_events WHERE user_email = ${u.email} AND event ~ ${WHATSAPP_EVENTS}`);
    if (s.n < 5 || s.today === 0) return null;
    return { id: "whatsapp_one_by_one", step: "whatsapp_one_by_one", data: { firstName: first(u), clicks: s.n } };
  }],

  ["calls_for_you", async (u) => {
    const s = await one<{ n: number; last: string | null; voice: number }>(sql`
      SELECT count(*)::int AS n, max(created_at) AS last,
             (SELECT count(*) FROM product_events WHERE user_email = ${u.email} AND event LIKE 'integrations.voice.%')::int AS voice
      FROM product_events WHERE user_email = ${u.email} AND event ~ ${CALL_EVENTS}`);
    if (s.n < 2 || s.voice > 0 || days(s.last, new Date()) < 0.5) return null; // the next day
    return { id: "calls_for_you", step: "calls_for_you", data: { firstName: first(u), calls: s.n } };
  }],

  /* ---- section B: started something and stopped ---- */

  ["plan_ready", async (u) => {
    const run = await one<{ id: string; chat_id: string | null; plan: CompiledPlan; est_credits: number }>(sql`
      SELECT r.id, r.chat_id, r.plan, r.est_credits FROM v2_runs r
      WHERE r.user_email = ${u.email} AND r.status = 'planned' AND r.chat_id IS NOT NULL
        AND r.created_at BETWEEN now() - interval '24 hours' AND now() - interval '2 hours'
        AND NOT EXISTS (SELECT 1 FROM v2_runs x WHERE x.chat_id = r.chat_id AND x.status <> 'planned' AND x.created_at >= r.created_at)
      ORDER BY r.created_at DESC LIMIT 1`);
    if (!run?.chat_id) return null;
    return { id: "plan_ready", step: `plan_ready:${run.id}`, data: {
      firstName: first(u), title: run.plan?.title ?? "Your search", area: run.plan?.areaText ?? "", credits: run.est_credits, chatId: run.chat_id } };
  }],

  ["run_recap", async (u) => {
    const run = await one<{ id: string; plan: CompiledPlan; delivered: number; finished_at: string }>(sql`
      SELECT id, plan, delivered, COALESCE(finished_at, started_at, created_at) AS finished_at FROM v2_runs
      -- Row 6 too: a run left "running" because the tab closed (runs only advance with a tab open)
      -- still has the leads it found before they left.
      WHERE user_email = ${u.email} AND kind = 'search' AND status IN ('done', 'running') AND delivered > 0
        AND COALESCE(finished_at, started_at, created_at) BETWEEN now() - interval '24 hours' AND now() - interval '1 hour'
      ORDER BY created_at DESC LIMIT 1`);
    // Only when they didn't see it land: any activity after the run finished means they did.
    if (!run || (u.last_active && new Date(u.last_active) > new Date(run.finished_at))) return null;
    const rows = (await sql`
      SELECT name, area, rating, review_count, signals, emails FROM v2_results
      WHERE run_id = ${run.id} ORDER BY rank NULLS LAST, score DESC NULLS LAST`) as Array<{
        name: string; area: string | null; rating: number | null; review_count: number | null;
        signals: Record<string, unknown>; emails: unknown[] }>;
    const why = (r: (typeof rows)[number]) => [
      r.rating != null ? `${r.rating.toFixed(1)}★, ${r.review_count ?? 0} reviews` : null,
      r.signals?.no_website === true ? "no website" : r.signals?.social_as_website === true ? "social page only" : null,
    ].filter(Boolean).join(", ") || "Matches your search";
    return { id: "run_recap", step: `run_recap:${run.id}`, data: {
      firstName: first(u), title: run.plan.title, delivered: run.delivered,
      withEmail: rows.filter((r) => (r.emails ?? []).length > 0).length,
      noWebsite: rows.filter((r) => r.signals?.no_website === true).length,
      top: rows.slice(0, 3).map((r) => ({ name: maskName(r.name), category: "", area: r.area ?? run.plan.areaText, why: why(r) })),
    } };
  }],

  ["campaign_unfinished", async (u) => {
    const c = await one<{ id: string; name: string; sender_ids: string[]; test_sent_at: string | null }>(sql`
      SELECT id, name, sender_ids, test_sent_at FROM v2_campaigns
      WHERE user_email = ${u.email} AND approved_at IS NULL AND status IN ('draft', 'testing')
        AND created_at BETWEEN now() - interval '7 days' AND now() - interval '24 hours'
      ORDER BY created_at DESC LIMIT 1`);
    if (!c) return null;
    const missing = [c.sender_ids?.length ? null : "mailbox", c.test_sent_at ? null : "test", "approve"].filter((x): x is string => !!x);
    return { id: "campaign_unfinished", step: `campaign_unfinished:${c.id}`, data: { firstName: first(u), name: c.name, campaignId: c.id, missing } };
  }],

  ["usage_meter", async (u) => {
    const limit = Math.max(u.credits_limit, 1);
    const used = Math.max(limit - u.credits, 0);
    // Row 13: only when the balance is actually low. Half-used meters went to people sitting on 250+
    // credits, who (row 15: 62 add-credit clickers, average balance 340) don't buy and do unsubscribe.
    if (u.credits >= 50) return null;
    const pct = u.credits <= 0 ? 100 : Math.min(99, Math.round((used / limit) * 100));
    const s = await one<{ found: number; unlocked: number; replies: number }>(sql`
      SELECT (SELECT count(*) FROM v2_results r JOIN v2_runs vr ON vr.id = r.run_id WHERE vr.user_email = ${u.email})::int AS found,
             (SELECT count(*) FROM unlocks WHERE unlocked_by = ${u.email})::int AS unlocked,
             (SELECT count(*) FROM v2_inbox WHERE user_email = ${u.email})::int AS replies`);
    // The limit is part of the key: buying a pack raises it, and the meter starts again.
    return { id: "usage_meter", step: `usage:${u.credits <= 0 ? "empty" : "low"}:${limit}`,
      data: { firstName: first(u), pct, used, credits: u.credits, leadsFound: s.found, unlocked: s.unlocked, replies: s.replies } };
  }],

  /* ---- section D: came once and left (row 16, replaces lifecycle-email's day 3/5/10/15/20) ---- */

  ["comeback_leads", async (u, { now }) => {
    const s = await one<{ active_days: number }>(sql`
      SELECT count(DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date)::int AS active_days
      FROM product_events WHERE user_email = ${u.email}`);
    if (s.active_days !== 1) return null;
    const gone = days(u.last_active, now);
    // Day 1, 3, 7, 14 after their one day; only inside that day, so a late tick never replays the series.
    const step = [1, 3, 7, 14].find((d) => gone >= d && gone < d + 1);
    if (!step) return null;
    const found = await unseenLeadsFor(u.email, 3);
    if (!found) return null;
    const trade = found.plan.trades[0]?.label ?? "Businesses";
    return { id: "comeback_leads", step: `comeback:d${step}`, data: {
      firstName: first(u), total: found.total, category: /s$/i.test(trade) ? trade : `${trade}s`,
      area: found.plan.areaText.split(",")[0],
      leads: found.leads.map((l) => ({
        name: maskName(l.business_name), category: formatCategory(l.category) ?? trade,
        area: (l.address ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(-3, -2)[0] ?? found.plan.areaText,
        why: [l.has_website === false ? "No website" : null, l.rating != null ? `${l.rating.toFixed(1)}★ from ${l.review_count ?? 0} reviews` : null].filter(Boolean).join(" · "),
      })),
    } };
  }],

  /* ---- section E: power users get a personal note ---- */

  ["founder_question", async (u) => {
    const s = await one<{ unlocked: number; wa: number }>(sql`
      SELECT (SELECT count(*) FROM unlocks WHERE unlocked_by = ${u.email})::int AS unlocked,
             (SELECT count(*) FROM product_events WHERE user_email = ${u.email} AND event ~ ${WHATSAPP_EVENTS})::int AS wa`);
    if (s.unlocked < 10 && s.wa < 10) return null;
    return { id: "founder_question", step: "founder_question", data: { firstName: first(u), unlocked: s.unlocked } };
  }],

  ["find_more", async (u, { now }) => {
    const run = await one<{ id: string; plan: CompiledPlan; finished_at: string }>(sql`
      SELECT id, plan, finished_at FROM v2_runs WHERE user_email = ${u.email} AND kind = 'search' AND status = 'done'
      ORDER BY created_at DESC LIMIT 1`);
    if (!run?.plan?.trades?.length) return null;
    const age = days(run.finished_at, now);
    if (age < 3 || age > 5) return null;
    const trade = run.plan.trades[0].label;
    const area = run.plan.areaText;
    const adjacent = (run.plan.adjacentTypes ?? []).map((t) => formatCategory(t)).filter((t): t is string => !!t).slice(0, 2);
    const suggestions = [`More ${trade} in ${area}`, ...adjacent.map((a) => `${a} in ${area}`)];
    if (suggestions.length < 3) suggestions.push(`${trade} near ${area}, wider radius`);
    return { id: "find_more", step: `find_more:${run.id}`, data: { firstName: first(u), title: run.plan.title, suggestions: suggestions.slice(0, 3) } };
  }],

  ["weekly_scorecard", async (u, { monday, week }) => {
    if (!monday || days(u.last_active, new Date()) > 7) return null;
    const s = await one<{ found: number; unlocked: number; contacted: number; replies: number }>(sql`
      SELECT (SELECT COALESCE(sum(delivered), 0) FROM v2_runs WHERE user_email = ${u.email} AND created_at > now() - interval '7 days')::int AS found,
             (SELECT count(*) FROM unlocks WHERE unlocked_by = ${u.email} AND unlocked_at > now() - interval '7 days')::int AS unlocked,
             (SELECT count(*) FROM v2_sends s JOIN v2_campaigns c ON c.id = s.campaign_id
               WHERE c.user_email = ${u.email} AND s.status = 'sent' AND NOT s.is_test AND s.sent_at > now() - interval '7 days')::int AS contacted,
             (SELECT count(*) FROM v2_inbox WHERE user_email = ${u.email} AND received_at > now() - interval '7 days')::int AS replies`);
    if (!s.found && !s.unlocked && !s.contacted) return null;
    const tip = s.unlocked > 0 && s.contacted === 0
      ? "You unlocked leads but haven't contacted any yet. A short first email from Campaigns is the step that turns them into replies."
      : s.contacted > 0 && s.replies === 0
        ? "No replies yet. Shorter first emails with one clear question usually do better; try cutting yours to three lines."
        : "Keep the rhythm: one new search and one follow-up a week is what the users with the most replies do.";
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    const end = new Date(Date.now() - 86_400_000), start = new Date(Date.now() - 7 * 86_400_000);
    return { id: "weekly_scorecard", step: `weekly:${week}`,
      data: { firstName: first(u), week: `${fmt(start)} – ${fmt(end)}`, ...s, credits: u.credits, tip } };
  }],

  ["missed_leads_digest", async (u, { monday, week }) => {
    if (!monday || days(u.last_active, new Date()) < 7) return null;
    const rows = (await sql`
      SELECT l.business_name, l.category, l.address, l.rating, l.review_count, l.has_website
      FROM email_sends s JOIN leads l ON l.id = s.lead_id
      WHERE s.recipient = ${u.email} AND s.campaign_id = ${ALERT_CAMPAIGN} AND s.sent_at > now() - interval '7 days'
      ORDER BY s.sent_at DESC`) as Array<{ business_name: string; category: string | null; address: string | null; rating: number | null; review_count: number | null; has_website: boolean | null }>;
    if (rows.length < 3) return null;
    return { id: "missed_leads_digest", step: `digest:${week}`, data: {
      firstName: first(u), count: rows.length,
      top: rows.slice(0, 3).map((r) => ({
        name: maskName(r.business_name), category: formatCategory(r.category) ?? "Business",
        area: (r.address ?? "").split(",").slice(-3, -2)[0]?.trim() || "your area",
        why: [r.has_website === false ? "No website" : null, r.rating != null ? `${r.rating.toFixed(1)}★ from ${r.review_count ?? 0} reviews` : null].filter(Boolean).join(", "),
      })),
    } };
  }],

  ["win_back", async (u, { now }) => {
    const idle = days(u.last_active, now);
    if (idle < 21 || idle > 35) return null;
    const run = await one<{ plan: CompiledPlan }>(sql`SELECT plan FROM v2_runs WHERE user_email = ${u.email} ORDER BY created_at DESC LIMIT 1`);
    return { id: "win_back", step: "win_back", data: { firstName: first(u), lastSearch: run?.plan?.title ?? null } };
  }],

  ["office_hours", async (u, { now }) => {
    const url = process.env.MAIL_BOOKING_URL;
    const age = days(u.created_at, now);
    if (!url || age < 1 || age > 3) return null;
    return { id: "office_hours", step: "office_hours", data: { firstName: first(u), url } };
  }],

  ["case_study_ask", async (u) => {
    const r = await one<{ from_name: string | null; from_address: string; received_at: string }>(sql`
      SELECT from_name, from_address, received_at FROM v2_inbox
      WHERE user_email = ${u.email} AND sentiment = 'interested' ORDER BY received_at ASC LIMIT 1`);
    if (!r || days(r.received_at, new Date()) < 7) return null;
    return { id: "case_study_ask", step: "case_study_ask",
      data: { firstName: first(u), win: `${r.from_name || r.from_address} replied interested`, reward: process.env.MAIL_CASE_STUDY_REWARD || null } };
  }],

  ["referral", async (u) => {
    const url = process.env.MAIL_REFERRAL_URL, reward = process.env.MAIL_REFERRAL_REWARD;
    if (!url || !reward) return null;
    const sent = await one<{ sent_at: string }>(sql`
      SELECT sent_at FROM email_sends WHERE recipient = ${u.email} AND campaign_id = ${USER_MAIL_CAMPAIGN} AND step_key = 'first_reply'`);
    if (!sent || days(sent.sent_at, new Date()) < 2) return null;
    const code = Buffer.from(u.email).toString("base64url").slice(0, 10);
    return { id: "referral", step: "referral", data: { firstName: first(u), reward, url: url.replace("{code}", code) } };
  }],

  ["community_invite", async (u) => {
    const url = process.env.MAIL_COMMUNITY_URL;
    if (!url) return null;
    const s = await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM v2_runs WHERE user_email = ${u.email} AND status = 'done'`);
    if (s.n < 2) return null;
    return { id: "community_invite", step: "community_invite", data: { firstName: first(u), url, members: null } };
  }],

  ["get_listed", async (u, { now }) => {
    if (process.env.MAIL_GET_LISTED !== "1") return null;
    const seller = u.business_type || ["agency_owner", "freelancer"].includes(u.role ?? "");
    if (!seller || days(u.created_at, now) < 3) return null;
    return { id: "get_listed", step: "get_listed", data: { firstName: first(u), business: u.business } };
  }],

  ["partner_program", async (u, { now }) => {
    if (days(u.created_at, now) < 14) return null;
    const s = await one<{ runs: number; applied: number }>(sql`
      SELECT (SELECT count(*) FROM v2_runs WHERE user_email = ${u.email} AND status = 'done')::int AS runs,
             (SELECT count(*) FROM partner_applications WHERE user_email = ${u.email})::int AS applied`);
    if (s.runs < 5 || s.applied > 0) return null;
    return { id: "partner_program", step: "partner_program", data: { firstName: first(u) } };
  }],

  ["stickly_cross_sell", async (u, { now }) => {
    if (!u.website || days(u.created_at, now) < 7) return null;
    const s = await one<{ n: number }>(sql`SELECT count(*)::int AS n FROM stickly_users WHERE user_email = ${u.email}`);
    if (s.n > 0) return null;
    return { id: "stickly_cross_sell", step: "stickly_cross_sell",
      data: { firstName: first(u), website: u.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") } };
  }],

  ["white_label", async (u, { now }) => {
    if (process.env.MAIL_WHITE_LABEL !== "1" || u.business_type !== "agency" || days(u.created_at, now) < 10) return null;
    return { id: "white_label", step: "white_label", data: { firstName: first(u), agency: u.business } };
  }],

  ["nps", async (u, { now }) => {
    const age = days(u.created_at, now);
    if (age < 30 || age > 37 || days(u.last_active, now) > 30) return null;
    return { id: "nps", step: "nps", data: { firstName: first(u) } };
  }],
];

async function users(only?: string[]): Promise<User[]> {
  const rows = (await sql`
    SELECT p.email, p.name, COALESCE(p.credits, 0) AS credits, COALESCE(p.credits_limit, 500) AS credits_limit,
           p.plan, p.plan_expires_at, p.created_at, p.role, p.business_type,
           GREATEST((SELECT max(created_at) FROM product_events e WHERE e.user_email = p.email),
                    (SELECT max(created_at) FROM v2_runs r WHERE r.user_email = p.email)) AS last_active,
           COALESCE(a.website, f.website) AS website,
           COALESCE(a.agency_name, f.business_name) AS business
    FROM user_profiles p
    LEFT JOIN agency_profiles a ON a.email = p.email
    LEFT JOIN freelancer_profiles f ON f.email = p.email
    WHERE p.is_synthetic_email = false
      AND (p.email_verified = true OR p.password_hash IS NULL)
    ORDER BY last_active DESC NULLS LAST
  `) as User[];
  return only ? rows.filter((r) => only.includes(r.email)) : rows;
}

export type UserMailResult = { email: string; id?: MailId; step?: string; sent: boolean; reason?: string };

export async function runUserMail(opts: { dryRun?: boolean; only?: string[]; ignoreSchedule?: boolean } = {}): Promise<UserMailResult[]> {
  const ist = istNow();
  if (!opts.ignoreSchedule && (ist.getUTCHours() < 9 || ist.getUTCHours() >= 21)) return [];
  const ctx: Ctx = { now: new Date(), monday: ist.getUTCDay() === 1, week: isoWeek(ist) };
  const out: UserMailResult[] = [];
  // Warm-up budgets per sending domain (lib/email/streams.ts); most active users come first.
  const budget = { user: dailyCap("user") - await sentToday("user"), leads: dailyCap("leads") - await sentToday("leads") };

  for (const u of await users(opts.only)) {
    try {
      const today = await one<{ n: number }>(sql`
        SELECT count(*)::int AS n FROM email_sends
        WHERE recipient = ${u.email} AND campaign_id = ${USER_MAIL_CAMPAIGN}
          AND sent_at > now() - interval '20 hours' AND split_part(step_key, ':', 1) <> ALL(${UNCAPPED as string[]})`);
      const capped = today.n > 0;

      for (const [id, rule] of RULES) {
        if (capped && !UNCAPPED.includes(id)) continue;
        const due = await rule(u, ctx);
        if (!due) continue;
        const done = await one<{ n: number }>(sql`
          SELECT count(*)::int AS n FROM email_sends WHERE recipient = ${u.email} AND campaign_id = ${USER_MAIL_CAMPAIGN} AND step_key = ${due.step}`);
        if (done.n > 0) continue;

        if (HOLDOUT_FLOWS.includes(id) && inHoldout(u.email, id)) { out.push({ email: u.email, id, step: due.step, sent: false, reason: "holdout" }); continue; }
        if (opts.dryRun) { out.push({ email: u.email, id, step: due.step, sent: false, reason: "dry run" }); break; }
        const entry = CATALOG[id];
        const pool = entry.via === "leads" ? "leads" : "user";
        if (budget[pool] <= 0) { out.push({ email: u.email, id, step: due.step, sent: false, reason: "daily warm-up cap reached" }); break; }
        const r = (entry.render as (d: unknown) => { subject: string; html: string; text: string })(due.data);
        const res = await sendBulkEmail({
          to: u.email, subject: r.subject, html: r.html, text: r.text,
          campaignId: USER_MAIL_CAMPAIGN, stepKey: due.step, template: id, stream: entry.stream, via: entry.via,
        });
        if (res.sent) budget[pool]--;
        out.push({ email: u.email, id, step: due.step, sent: res.sent, reason: res.reason });
        if (res.sent && !UNCAPPED.includes(id)) break;
      }
    } catch (err) {
      out.push({ email: u.email, sent: false, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}
