/**
 * Product events — the one pipe every user action goes through (docs/analytics-events.md).
 *
 * Names are `section.object.action`, lower-case, dots only. The SECTIONS list is the admin's
 * grouping; an event whose first segment is not in it lands in "other" rather than failing.
 * Server-side events are the truth for funnels (an action that completed); client events are
 * behaviour (what was clicked, which screens were seen). Never put PII in props — the row already
 * carries the user.
 */
import { sql } from "@/lib/db";

export const SECTIONS = ["chat", "leads", "campaigns", "inbox", "templates", "integrations", "billing", "settings", "account", "nav", "home", "analytics", "jobs", "other"] as const;
export type Section = (typeof SECTIONS)[number];

/** Server-side events, named here so routes and the admin agree on spelling. */
export const EV = {
  // chat
  chatMessage: "chat.message.send", chatPlan: "chat.plan.created", chatContextConfirm: "chat.context.confirm", chatRunStart: "chat.plan.run",
  chatRunControl: "chat.run.control", chatFeedback: "chat.message.feedback",
  // leads
  leadUnlock: "leads.lead.unlock", leadAdd: "leads.lead.add", leadOpenSite: "leads.lead.open_site", leadOpenLinkedin: "leads.lead.open_linkedin",
  leadContact: "leads.lead.contact", leadEnrich: "leads.lead.enrich", mapSearch: "leads.map.search",
  // outreach
  campaignCreate: "campaigns.campaign.create", campaignPlan: "campaigns.planner.plan", campaignTest: "campaigns.campaign.test",
  campaignApprove: "campaigns.campaign.approve", campaignControl: "campaigns.campaign.control", templateSave: "templates.template.save",
  // integrations
  emailConnectStart: "integrations.email.connect_start", emailConnected: "integrations.email.connected", voiceTestCall: "integrations.voice.test_call",
  whatsappConnect: "integrations.whatsapp.connect",
  // billing / account
  checkoutStart: "billing.pack.checkout_start", paid: "billing.pack.paid", onboardingDone: "account.onboarding.complete",
  profileSave: "account.business_profile.save",
} as const;

const NAME = /^[a-z0-9_]+(\.[a-z0-9_]+){1,3}$/;

export function sectionOf(event: string): Section {
  const s = event.split(".")[0] as Section;
  return (SECTIONS as readonly string[]).includes(s) ? s : "other";
}

/** Fire-and-forget: analytics must never slow or fail the action it records. */
export function trackEvent(userEmail: string | null | undefined, event: string, props: Record<string, unknown> = {}, opts: { source?: "client" | "server"; path?: string | null; sessionId?: string | null; device?: string | null } = {}): void {
  if (!userEmail || !NAME.test(event)) return;
  const safe = JSON.parse(JSON.stringify(props ?? {}).slice(0, 4000)) as Record<string, unknown>;
  void sql`
    INSERT INTO product_events (user_email, session_id, event, section, source, path, props, device)
    VALUES (${userEmail}, ${opts.sessionId ?? null}, ${event}, ${sectionOf(event)}, ${opts.source ?? "server"}, ${opts.path ?? null}, ${sql.json(safe as Parameters<typeof sql.json>[0])}, ${opts.device ?? null})
  `.catch((e) => console.warn("[events]", event, (e as Error).message));
}
