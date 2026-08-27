import { auth, signOut } from "@/auth";
import { sql } from "@/lib/db";
import { CreditsIndicator } from "@/components/CreditsIndicator";

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  const [profile] = await sql`SELECT plan, credits, credits_limit FROM user_profiles WHERE email = ${email}`;
  const [unlockCount] = await sql`SELECT COUNT(*)::int AS count FROM unlocks WHERE unlocked_by = ${email}`;

  return (
    <div style={{ padding: "32px 24px 120px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 4 }}>Manage your account and preferences</p>
        </div>
        <CreditsIndicator />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <Row label="Email" value={email} />
          <Row label="Plan" value={(profile?.plan ?? "free").replace(/^\w/, (c: string) => c.toUpperCase())} />
          <Row label="Credits remaining" value={`${profile?.credits ?? 0} / ${profile?.credits_limit ?? 0}`} />
          <Row label="Leads unlocked" value={String(unlockCount?.count ?? 0)} />
          <Row label="Billing" value="No subscription" last />
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

        {/* LMS summary (replaces Pindrop's Payouts card — no builder marketplace here) */}
        <Card>
          <CardHeader title="LMS" />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
            Manage the leads you have found, filter by area or category, and unlock enrichment.
          </p>
          <a href="/lms" style={{ ...pillSecondary, textDecoration: "none", display: "block", textAlign: "center" }}>
            Open LMS
          </a>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader title="Support" />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>
            Have an idea or hit a snag? Tell us and help shape Mantis AI.
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
  background: "var(--g-green-dark)",
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
