import { sendBulkEmail } from "@/lib/email/send-bulk";
import { PLAN_ACTIVATED_HTML, PLAN_ACTIVATED_TEXT } from "@/lib/email/lifecycle-templates";
import { COMPANY } from "@/lib/company";

/**
 * Tells someone their plan is on and what landed in their account.
 *
 * Sent from grantPlan() rather than from the admin page, so it cannot be forgotten by whatever
 * calls the grant next — a webhook, a script, a second admin screen. The grant id is the step key,
 * so the unique index on (recipient, campaign_id, step_key) makes a re-run or a retried request a
 * no-op rather than a second congratulations.
 *
 * Named mantis-transactional explicitly. This is the same trap that cost the partner send its
 * event tracking: SES_CONFIGURATION_SET is set in the App Runner environment, so anything invoked
 * from a script on a laptop sends with no configuration set and therefore no bounce or complaint
 * feedback at all.
 */
const CONFIG_SET = "mantis-transactional";

/** Admin plan ids are lowercase; nobody wants to read "your starter plan is active". */
function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/**
 * "this month" is only true for a 30-day grant, and an email that says it anyway is the kind of
 * small lie that gets quoted back when the credits stop. Built from the grant's actual duration.
 */
export function periodPhrase(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return "to use";
  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return "to use";
  const days = Math.round((end.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "to use";
  if (days <= 31) return "for this month";
  if (days <= 93) return `for the next ${Math.round(days / 30)} months`;
  if (days <= 190) return "for the next 6 months";
  if (days <= 400) return "for the next year";
  return "to use";
}

export async function sendPlanActivated(opts: {
  email: string;
  name?: string | null;
  plan: string;
  credits: number;
  grantId: string;
  expiresAt?: Date | string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  // A free plan is not an activation, and zero credits is not news worth an email.
  if (opts.plan === "free" || opts.credits <= 0) return { sent: false, reason: "nothing to announce" };

  const first = (opts.name ?? "").trim().split(/\s+/)[0] || "there";
  const values: Record<string, string> = {
    first_name: first,
    plan: planLabel(opts.plan),
    credits: opts.credits.toLocaleString("en-IN"),
    period: periodPhrase(opts.expiresAt),
    dashboard_url: `${COMPANY.site}/home`,
  };
  const fill = (s: string) =>
    Object.entries(values).reduce((out, [k, v]) => out.replaceAll(`{{${k}}}`, v), s);

  return sendBulkEmail({
    to: opts.email,
    subject: `Your ${planLabel(opts.plan)} plan is activated`,
    html: fill(PLAN_ACTIVATED_HTML),
    text: fill(PLAN_ACTIVATED_TEXT),
    campaignId: "plan-activation",
    stepKey: `plan-activation:${opts.grantId}`,
    template: "plan_activated",
    stream: "lifecycle",
    configSet: CONFIG_SET,
  });
}
