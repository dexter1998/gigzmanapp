import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { sql } from "@/lib/db";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DashboardModeBadge } from "@/components/DashboardModeBadge";

export const metadata = { title: "Profile" };

const MAX_NAME_CHARS = 80;

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  const [profile] = await sql`
    SELECT name, plan, credits, credits_limit, dashboard_mode FROM user_profiles WHERE email = ${email}
  `;
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS count FROM unlocks WHERE unlocked_by = ${email}`;

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
    await sql`UPDATE user_profiles SET dashboard_mode = ${mode}, updated_at = now() WHERE email = ${email}`;
    // Both dashboards read this, and the sidebar's nav is built from it, so the whole authenticated
    // shell has to re-render — not just this page.
    revalidatePath("/", "layout");
    redirect(mode === "jobs" ? "/jobs/map" : "/home");
  }

  return (
    <div style={{ padding: "32px 24px 120px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 4 }}>Manage your account and preferences</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DashboardModeBadge />
          <CreditsIndicator />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <Row label="Email" value={email} />
          <form action={updateName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--g-border)", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: "var(--g-gray-500)", flexShrink: 0 }}>Name</span>
            <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end" }}>
              <input
                name="name"
                defaultValue={profile?.name ?? ""}
                placeholder="Add your name"
                maxLength={MAX_NAME_CHARS}
                style={nameInput}
              />
              <button type="submit" style={pillSecondarySmall}>
                Save
              </button>
            </div>
          </form>
          <Row label="Leads unlocked" value={String(unlockCount?.count ?? 0)} last />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" style={pillPrimary}>
              Sign out
            </button>
          </form>
        </Card>

        {/* Dashboard mode — which of the two product surfaces this account opens into. The
            pulsing badge in the app toolbar links straight here, so this card is the one place
            the switch lives. */}
        <Card>
          <CardHeader title="Dashboard" />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
            Mantis has two dashboards. <strong>Leads</strong> finds local businesses that need a
            website. <strong>Jobs</strong> finds open roles at businesses near you.
          </p>
          <form action={updateDashboardMode} style={{ display: "flex", gap: 8 }}>
            <select
              name="dashboard_mode"
              defaultValue={profile?.dashboard_mode ?? "leads"}
              style={{ ...nameInput, maxWidth: "none", flex: 1 }}
            >
              <option value="leads">Leads — find businesses to pitch</option>
              <option value="jobs">Jobs — find roles to apply to</option>
            </select>
            <button type="submit" style={pillSecondarySmall}>
              Switch
            </button>
          </form>
        </Card>

        {/* Billing & usage — links out to the real billing/usage pages (both already fully
            wired with Cashfree + credit ledger) rather than duplicating them here. */}
        <Card>
          <CardHeader title="Billing & Usage" />
          <Row label="Plan" value={(profile?.plan ?? "free").replace(/^\w/, (c: string) => c.toUpperCase())} />
          <Row label="Credits remaining" value={`${profile?.credits ?? 0} / ${profile?.credits_limit ?? 0}`} last />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <a href="/settings/billing" style={{ ...pillSecondary, textDecoration: "none", textAlign: "center", flex: 1 }}>
              Manage billing
            </a>
            <a href="/settings/usage" style={{ ...pillSecondary, textDecoration: "none", textAlign: "center", flex: 1 }}>
              View usage
            </a>
          </div>
        </Card>

        {/* Leads summary (replaces Pindrop's Payouts card — no builder marketplace here) */}
        <Card>
          <CardHeader title="Leads" />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
            Manage the leads you have found, filter by area or category, and unlock enrichment.
          </p>
          <a href="/my-leads" style={{ ...pillSecondary, textDecoration: "none", display: "block", textAlign: "center" }}>
            Open Leads
          </a>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader title="Support" />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
            Have an idea or hit a snag? Tell us and help shape Mantis Ai.
          </p>
          <a href="mailto:support@gigzmanapp.com" style={{ ...pillSecondary, textDecoration: "none", display: "block", textAlign: "center" }}>
            Send feedback
          </a>
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", marginBottom: 14 }}>{title}</div>;
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: last ? "none" : "1px solid var(--g-border)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>{value}</span>
    </div>
  );
}

const pillPrimary: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "11px 0",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "var(--g-green-darker)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const pillSecondary: React.CSSProperties = {
  width: "100%",
  padding: "11px 0",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const pillSecondarySmall: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
};

const nameInput: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 13,
  fontFamily: "inherit",
  minWidth: 0,
  flex: 1,
  maxWidth: 220,
};
