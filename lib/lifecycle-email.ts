import { sql } from "@/lib/db";
import { maskName } from "@/lib/mask";
import { heatScore } from "@/lib/lead-quality";
import { TYPE_TO_SECTION, formatCategory } from "@/lib/categories";
import { COMPANY } from "@/lib/company";
import { sendBulkEmail, fillTemplate } from "@/lib/email/send-bulk";
import {
  LEADS_FOUND_HTML, LEADS_FOUND_TEXT,
  SINGLE_LEAD_HTML, SINGLE_LEAD_TEXT,
  PARTNERSHIP_HTML, PARTNERSHIP_TEXT,
} from "@/lib/email/lifecycle-templates";

/**
 * The non-promotional email rules: win an inactive user back, and invite a user who has run out of
 * credits into the partner programme. Cold prospecting is deliberately not here — nothing in this
 * file ever mails someone who doesn't already have an account.
 *
 * Evaluated once a day. Every rule is expressed as "which step is due", and every send is claimed
 * in email_sends under a step key, so re-running the same day is a no-op rather than a second copy.
 */

const CAMPAIGN_REACTIVATION = "reactivation_2026";
const CAMPAIGN_PARTNERSHIP = "partnership_invite_2026";

/**
 * Days of inactivity at which we write, and which template goes out. The two alternate on purpose:
 * the same message five times reads as a broken loop, whereas "here's what's waiting in your area"
 * and "here's one specific lead" are genuinely different reasons to come back.
 *
 * The gaps widen (3, 5, 10, 15, 20) because someone who ignored three emails is less likely to
 * want a fourth, not more.
 */
export const REACTIVATION_STEPS = [
  { day: 3, template: "leads_found" },
  { day: 5, template: "single_lead" },
  { day: 10, template: "leads_found" },
  { day: 15, template: "single_lead" },
  { day: 20, template: "leads_found" },
] as const;

/** Radius around a user's last search that counts as "their area" for these emails. */
const NEARBY_METERS = 6000;

type Candidate = {
  email: string;
  credits: number;
  last_active: string | null;
  last_lat: number | null;
  last_lng: number | null;
};

/** City from a Google-formatted Indian address: the component before the one carrying the PIN. */
function cityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  const pinIndex = parts.findIndex((p) => /\b\d{6}\b/.test(p));
  if (pinIndex > 0) return parts[pinIndex - 1] || null;
  return parts.length >= 3 ? parts[parts.length - 3] : null;
}

/** Leads near the user's last search that they haven't unlocked and that still have no website —
 *  the ones an agency could actually sell to. Ordered by heat so the single-lead email picks the
 *  most compelling one rather than an arbitrary row. */
async function nearbyOpportunities(user: Candidate, limit = 40) {
  if (user.last_lat == null || user.last_lng == null) return [];
  // Degrees of latitude/longitude covering NEARBY_METERS, so the bounding box uses the lat/lng
  // index rather than computing distance across the whole table.
  const dLat = NEARBY_METERS / 111_320;
  const dLng = NEARBY_METERS / (111_320 * Math.cos((user.last_lat * Math.PI) / 180));

  const rows = (await sql`
    SELECT l.id, l.business_name, l.category, l.address, l.rating, l.review_count, l.has_website
    FROM leads l
    LEFT JOIN unlocks u ON u.lead_id = l.id AND u.unlocked_by = ${user.email}
    WHERE l.has_website = false
      AND l.is_competitor = false
      AND u.id IS NULL
      AND l.lat BETWEEN ${user.last_lat - dLat} AND ${user.last_lat + dLat}
      AND l.lng BETWEEN ${user.last_lng - dLng} AND ${user.last_lng + dLng}
    LIMIT ${limit}
  `) as Array<{
    id: string; business_name: string; category: string | null; address: string | null;
    rating: number | null; review_count: number | null; has_website: boolean | null;
  }>;

  return rows
    .map((r) => ({
      ...r,
      heat: heatScore({
        rating: r.rating, review_count: r.review_count, has_website: r.has_website,
        primary_type: r.category, section: r.category ? (TYPE_TO_SECTION[r.category] ?? null) : null,
        address: r.address,
      }),
    }))
    .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0));
}

const links = () => ({
  unlock_all_url: `${COMPANY.site}/my-leads`,
  preferences_url: `${COMPANY.site}/preferences`,
  manage_alerts_url: `${COMPANY.site}/preferences`,
  partnership_url: `${COMPANY.site}/partner`,
  // Filled per message by the sender; present so an unreplaced tag can't reach a real inbox.
  unsubscribe_url: `${COMPANY.site}/preferences`,
});

/**
 * Accounts whose email address is real and proven, and who have actually used the product.
 *
 * "Proven" is not the same as our own email_verified flag. That flag is only set by the
 * email-and-password signup flow, and most accounts sign in with Google — their address is
 * verified, by Google, and the column stays false. Checking the flag alone excluded almost every
 * real user (confirmed against production: 8 of 10 accounts have no password at all).
 *
 * So: a Google account (no password) qualifies, an email signup qualifies once it has confirmed
 * its code, and one that never confirmed does not — it never proved the address belongs to them.
 * Synthetic addresses, which the phone-only signup fabricates, are never mailable.
 */
async function candidates(): Promise<Candidate[]> {
  return (await sql`
    SELECT p.email,
           COALESCE(p.credits, 0) AS credits,
           act.last_active,
           act.last_lat,
           act.last_lng
    FROM user_profiles p
    LEFT JOIN LATERAL (
      SELECT s.created_at AS last_active, s.center_lat AS last_lat, s.center_lng AS last_lng
      FROM area_scans s
      WHERE s.requested_by = p.email
      ORDER BY s.created_at DESC
      LIMIT 1
    ) act ON true
    WHERE p.is_synthetic_email = false
      AND (p.email_verified = true OR p.password_hash IS NULL)
      AND act.last_active IS NOT NULL
  `) as Candidate[];
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export type LifecycleResult = { email: string; step: string; sent: boolean; reason?: string };

/**
 * @param dryRun evaluate the rules and report what would go out, without sending or recording
 *   anything. This exists because the rules decide who gets real mail: "who would this reach
 *   today, and why" has to be answerable before the answer is a delivered message.
 */
export async function runLifecycleEmails(dryRun = false): Promise<LifecycleResult[]> {
  const out: LifecycleResult[] = [];
  const people = await candidates();

  for (const user of people) {
    try {
      // Partnership invite first: someone who just spent their last credit is engaged, and the
      // reactivation clock hasn't started for them yet, so the two can't collide.
      if (user.credits <= 0) {
        const r = await sendPartnership(user, dryRun);
        if (r) out.push(r);
        continue;
      }

      const inactiveDays = user.last_active ? daysSince(user.last_active) : 0;
      // The furthest step they've earned, so a gap in the schedule (nobody ran the job for a
      // while) settles on the current one rather than replaying the whole sequence.
      const due = [...REACTIVATION_STEPS].reverse().find((s) => inactiveDays >= s.day);
      if (!due) continue;

      const r = await sendReactivation(user, due, dryRun);
      if (r) out.push(r);
    } catch (err) {
      out.push({
        email: user.email, step: "error", sent: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

async function sendPartnership(user: Candidate, dryRun: boolean): Promise<LifecycleResult | null> {
  if (dryRun) return { email: user.email, step: "partnership_invite", sent: false, reason: "dry run" };
  const values = { ...links() };
  const res = await sendBulkEmail({
    to: user.email,
    subject: "You've hit your limit — here's the partner route",
    html: fillTemplate(PARTNERSHIP_HTML, values),
    text: fillTemplate(PARTNERSHIP_TEXT, values),
    campaignId: CAMPAIGN_PARTNERSHIP,
    stepKey: "partnership_invite",
    template: "05-partnership-proposal",
    stream: "customer_offer",
  });
  return { email: user.email, step: "partnership_invite", sent: res.sent, reason: res.reason };
}

async function sendReactivation(
  user: Candidate,
  step: (typeof REACTIVATION_STEPS)[number],
  dryRun: boolean
): Promise<LifecycleResult | null> {
  const stepKey = `reactivation_d${step.day}`;
  const opportunities = await nearbyOpportunities(user);

  // Nothing truthful to say about their area means nothing goes out. An email whose whole premise
  // is "here's what's waiting for you" must not be sent when the answer is "nothing".
  if (opportunities.length === 0) {
    return { email: user.email, step: stepKey, sent: false, reason: "no nearby opportunities" };
  }

  const top = opportunities[0];
  const city = cityFromAddress(top.address) ?? "your area";
  if (dryRun) {
    return { email: user.email, step: stepKey, sent: false,
             reason: `dry run — ${step.template}, ${opportunities.length} nearby in ${city}` };
  }

  if (step.template === "single_lead") {
    const values = {
      ...links(),
      lead_name_masked: maskName(top.business_name),
      lead_category: formatCategory(top.category) ?? "Local business",
      lead_location: city,
      lead_rating: top.rating != null ? top.rating.toFixed(1) : "—",
      lead_reviews: String(top.review_count ?? 0),
      unlock_lead_url: `${COMPANY.site}/my-leads/${top.id}`,
    };
    const res = await sendBulkEmail({
      to: user.email,
      // Built here rather than taken from the design mock, which hardcoded a score and a sector.
      subject: top.heat != null
        ? `A ${Math.round(top.heat)}-heat lead just appeared in ${city}`
        : `A new lead just appeared in ${city}`,
      html: fillTemplate(SINGLE_LEAD_HTML, values),
      text: fillTemplate(SINGLE_LEAD_TEXT, values),
      campaignId: CAMPAIGN_REACTIVATION,
      stepKey,
      template: "04-urgent-single-lead",
      stream: "lifecycle",
      leadId: top.id,
    });
    return { email: user.email, step: stepKey, sent: res.sent, reason: res.reason };
  }

  const count = opportunities.length;
  const values = {
    ...links(),
    lead_count: String(count),
    // The card shows a handful; this is what's behind them.
    lead_count_more: String(Math.max(count - 4, 0)),
    unlock_lead_url: `${COMPANY.site}/my-leads/${top.id}`,
  };
  const res = await sendBulkEmail({
    to: user.email,
    subject: `${count} ${count === 1 ? "business" : "businesses"} in ${city} need a website`,
    html: fillTemplate(LEADS_FOUND_HTML, values),
    text: fillTemplate(LEADS_FOUND_TEXT, values),
    campaignId: CAMPAIGN_REACTIVATION,
    stepKey,
    template: "02-15-urgent-leads",
    stream: "lifecycle",
  });
  return { email: user.email, step: stepKey, sent: res.sent, reason: res.reason };
}
