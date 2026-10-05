import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { PageHeader, Section, Table, Pill, fmtDT, fmtN } from "../ui";
import { GRANT_REASONS, GRANTABLE_PLANS, grantPlan, revokeGrant, type GrantReason, type GrantablePlan } from "@/lib/credits/grants";
import { GrantForm } from "./GrantForm";

/**
 * Comp a plan.
 *
 * This is the one page under /admin that writes. The rest of the console is read-only on purpose,
 * and that invariant is why admin-campaigns exists as a separate route group — so putting a
 * mutation here is a deliberate exception, not an oversight, and the layout's own comment has been
 * corrected to stop claiming otherwise.
 *
 * What stands in for that lost guarantee: nothing happens without re-typing the account's email,
 * every grant records who made it, and revoking is a separate explicit action. Credits are never
 * clawed back — see revokeGrant.
 */
export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const adminEmail = await requireAdmin();

  const grants = await sql`
    SELECT g.id, g.user_email, g.plan, g.credits, g.reason, g.note, g.granted_by,
           g.revoked_at, g.created_at, p.credits AS balance, p.plan AS current_plan
      FROM plan_grants g
      LEFT JOIN user_profiles p ON p.email = g.user_email
     ORDER BY g.created_at DESC
     LIMIT 50
  `;

  async function submitGrant(formData: FormData) {
    "use server";
    // Re-checked here, not trusted from the page render: a server action is its own entry point
    // and anyone who can POST to it must clear the same gate.
    const by = await requireAdmin();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
    if (email !== confirm) return;

    const plan = String(formData.get("plan") ?? "") as GrantablePlan;
    const reason = String(formData.get("reason") ?? "") as GrantReason;
    const credits = Number(formData.get("credits") ?? 0);
    const note = String(formData.get("note") ?? "");

    await grantPlan({ userEmail: email, plan, credits, reason, note, grantedBy: by });
    revalidatePath("/admin/grants");
  }

  async function submitRevoke(formData: FormData) {
    "use server";
    const by = await requireAdmin();
    await revokeGrant(String(formData.get("grantId") ?? ""), by);
    revalidatePath("/admin/grants");
  }

  return (
    <div className="mantis-admin min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] p-5">
        <PageHeader
          pretitle="Billing"
          title="Plan grants"
          sub={`Signed in as ${adminEmail} · every grant is recorded against your email`}
        />

        <div className="mb-3 flex flex-wrap gap-3">
          <div className="min-w-[280px] flex-1">
            <Section title="Grant a plan" note="Sets the plan, adds credits, and marks the account as comped. The user sees it as granted, not purchased.">
              <GrantForm action={submitGrant} plans={[...GRANTABLE_PLANS]} reasons={[...GRANT_REASONS]} />
            </Section>
          </div>
        </div>

        <Table
          title="Recent grants"
          note="Credits already spent are never clawed back — revoking stops the plan, the ledger keeps the history."
          head={["Account", "Plan", { label: "Credits", num: true }, "Reason", "By", "When", ""]}
          rows={grants.map((g) => [
            <span key="e" className="text-[var(--ink)]">{g.user_email}</span>,
            <span key="p" className="flex items-center gap-2">
              <Pill tone={g.revoked_at ? "mut" : "ok"}>{g.plan}</Pill>
              {g.revoked_at && <span className="text-[10.5px] text-[var(--ink-faint)]">revoked</span>}
            </span>,
            fmtN(g.credits),
            <span key="r" className="text-[var(--ink-muted)]">{g.reason}{g.note ? ` · ${g.note}` : ""}</span>,
            <span key="b" className="text-[var(--ink-faint)]">{g.granted_by}</span>,
            <span key="w" className="text-[var(--ink-faint)]">{fmtDT(g.created_at)}</span>,
            g.revoked_at ? (
              <span key="x" className="text-[10.5px] text-[var(--ink-faint)]">—</span>
            ) : (
              <form key="x" action={submitRevoke}>
                <input type="hidden" name="grantId" value={String(g.id)} />
                <button
                  type="submit"
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                  style={{ borderColor: "color-mix(in oklab, var(--critical) 45%, transparent)", color: "var(--critical)" }}
                >
                  Revoke
                </button>
              </form>
            ),
          ])}
          empty="No plans have been granted yet."
        />
      </div>
    </div>
  );
}
