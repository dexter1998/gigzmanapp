import { auth, signOut } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  return (
    <div style={{ padding: "32px 24px 120px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>Account</h1>
      <p style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 4, marginBottom: 28 }}>{email}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Upgrade */}
        <Card>
          <CardHeader title="Upgrade" />
          <PlanRow
            icon="🚀"
            title="Starter"
            desc="For closers getting their first clients"
            price="$19.99/mo"
          />
          <PlanRow
            icon="✨"
            title="Pro"
            badge="Best value"
            desc="For full-time sales pros"
            price="$99.99/mo"
          />
        </Card>

        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <Row label="Email" value={email} />
          <Row label="Plan" value="No plan" />
          <Row label="Credits remaining" value="0" />
          <Row label="Leads unlocked" value="0" />
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
            Have an idea or hit a snag? Tell us and help shape gigzman.
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
        borderRadius: "var(--radius-md)",
        padding: 20,
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

function PlanRow({ icon, title, desc, price, badge }: { icon: string; title: string; desc: string; price: string; badge?: string }) {
  return (
    <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 12, display: "flex", gap: 12 }}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--g-green-mint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)" }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 700, background: "var(--g-amber-tint)", color: "#b45309", borderRadius: 999, padding: "2px 8px" }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>{desc}</div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)", whiteSpace: "nowrap" }}>{price}</span>
    </div>
  );
}

const pillPrimary: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "11px 0",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "var(--g-green)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const pillSecondary: React.CSSProperties = {
  width: "100%",
  padding: "11px 0",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
