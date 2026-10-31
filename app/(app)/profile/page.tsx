import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { sql } from "@/lib/db";
import { hasJobsAccess } from "@/lib/jobs/access";
import { SupportLink } from "@/components/outreach/integrations/shared";
import { SettingsShell, SettingsPage, SettingsCard, SettingsRow } from "@/components/settings/SettingsShell";
import { DeleteAccountRow } from "@/components/settings/DeleteAccount";
import { getPendingRequest } from "@/lib/account-deletion";

export const metadata = { title: "Profile" };

const MAX_NAME_CHARS = 80;

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  const [profile] = await sql`
    SELECT name, plan, credits, credits_limit, dashboard_mode FROM user_profiles WHERE email = ${email}
  `;
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS count FROM unlocks WHERE unlocked_by = ${email}`;
  const jobsAccess = await hasJobsAccess(email);
  const pendingDeletion = email ? await getPendingRequest(email.toLowerCase()) : null;

  async function updateName(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME_CHARS);
    if (!name) return;
    await sql`UPDATE user_profiles SET name = ${name}, updated_at = now() WHERE email = ${email}`;
    revalidatePath("/profile");
  }

  async function updateDashboardMode(formData: FormData) {
    "use server";
    const mode = String(formData.get("dashboard_mode") ?? "");
    if (mode !== "leads" && mode !== "jobs") return;
    // The form value arrives from the client, so hiding the option in the markup is presentation,
    // not enforcement. Same rule as /api/user/profile: jobs is closed to anyone not already on it.
    if (mode === "jobs" && !(await hasJobsAccess(email))) return;
    await sql`UPDATE user_profiles SET dashboard_mode = ${mode}, updated_at = now() WHERE email = ${email}`;
    // Both dashboards read this, and the sidebar's nav is built from it, so the whole authenticated
    // shell has to re-render — not just this page.
    revalidatePath("/", "layout");
    redirect(mode === "jobs" ? "/jobs/map" : "/home");
  }

  const name = profile?.name ?? "";
  const plan = (profile?.plan ?? "free").replace(/^\w/, (c: string) => c.toUpperCase());

  return (
    <SettingsShell>
      <SettingsPage title="Profile">
        <SettingsCard title="Profile">
          <SettingsRow label="Photo" desc="From sign-in provider">
            <span className="set-avatar">{(name || email || "?").charAt(0).toUpperCase()}</span>
          </SettingsRow>
          <SettingsRow label="Name">
            <form action={updateName} style={{ display: "flex", gap: 8 }}>
              <input name="name" defaultValue={name} placeholder="Add your name" maxLength={MAX_NAME_CHARS} className="set-input" />
              <button type="submit" className="set-btn">Save</button>
            </form>
          </SettingsRow>
          <SettingsRow label="Email">{email}</SettingsRow>
          <SettingsRow label="Leads unlocked">{String(unlockCount?.count ?? 0)}</SettingsRow>
        </SettingsCard>

        {/* Dashboard mode — which of the two product surfaces this account opens into. The
            pulsing badge in the app toolbar links straight here, so this card is the one place
            the switch lives. */}
        {jobsAccess && (
          <SettingsCard
            title="Dashboard"
            desc={<span title="Leads finds local businesses that need a website. Jobs finds open roles at businesses near you."><strong>Leads</strong> · businesses needing a site &nbsp;·&nbsp; <strong>Jobs</strong> · nearby open roles</span>}
          >
            {/* Switching to Leads is one-way while jobs is closed: access is proved by the mode
                itself (see lib/jobs/access.ts), so giving it up gives up the dashboard. Said out
                loud here rather than letting someone discover it afterwards. */}
            <SettingsRow
              label="Open into"
              desc={<span title="Jobs is closed to new sign-ups while we rebuild it. Your account keeps access — but if you switch to Leads you will not be able to switch back." style={{ color: "#8a5a00", display: "inline-flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} /> Jobs closed · switching to Leads is one-way</span>}
            >
              <form action={updateDashboardMode} style={{ display: "flex", gap: 8 }}>
                <select name="dashboard_mode" defaultValue={profile?.dashboard_mode ?? "leads"} className="set-input" style={{ width: 200 }}>
                  <option value="leads">Leads</option>
                  <option value="jobs">Jobs</option>
                </select>
                <button type="submit" className="set-btn">Switch</button>
              </form>
            </SettingsRow>
          </SettingsCard>
        )}

        {/* Billing & usage — links out to the real billing/usage pages rather than duplicating them. */}
        <SettingsCard title="Plan & credits" desc="Pay per real work">
          <SettingsRow label="Plan">{plan}</SettingsRow>
          <SettingsRow label="Credits remaining">
            {`${profile?.credits ?? 0} / ${profile?.credits_limit ?? 0}`}
          </SettingsRow>
          <SettingsRow label="Billing" desc="Credits · invoices">
            <Link href="/settings/billing" className="set-btn">Manage billing</Link>
          </SettingsRow>
          <SettingsRow label="Usage" desc="Credit ledger · newest first">
            <Link href="/settings/usage" className="set-btn">View usage</Link>
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title="Help">
          <SettingsRow label="Leads" desc="Filter, manage, enrich">
            <Link href="/my-leads" className="set-btn">Open Leads</Link>
          </SettingsRow>
          <SettingsRow label="Feedback" desc="Ideas · bugs">
            <SupportLink subject="Mantis feedback" className="set-btn">Send feedback</SupportLink>
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title="Account">
          <SettingsRow label="Sign out" desc={email}>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="set-btn danger">Sign out</button>
            </form>
          </SettingsRow>
          <DeleteAccountRow
            email={email}
            pendingAt={pendingDeletion ? new Date(pendingDeletion.requested_at).toISOString() : null}
          />
        </SettingsCard>
      </SettingsPage>
    </SettingsShell>
  );
}
