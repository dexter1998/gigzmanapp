import {
  ZapIcon,
  MapsPinIcon,
  GlobeIcon,
  LinkedInIcon,
  ClipboardIcon,
  FacebookIcon,
  InstagramIcon,
  XSocialIcon,
  SearchIcon,
  StarIcon,
  LockIcon,
  PhoneIcon,
  MailIcon,
} from "@/components/icons";

const LEFT_SOURCES = [
  { icon: MapsPinIcon, title: "Google Maps", description: "Business listing, reviews, category, address" },
  { icon: GlobeIcon, title: "Company Website", description: "About us, team, services, careers, contact page" },
  { icon: LinkedInIcon, title: "LinkedIn", description: "Company page, employees, leadership, posts" },
  { icon: ClipboardIcon, title: "Job Boards", description: "Hiring trends, job posts, team growth signals" },
];

const RIGHT_SOURCES = [
  { icon: FacebookIcon, title: "Facebook", description: "Page activity, photos, followers, engagement" },
  { icon: InstagramIcon, title: "Instagram", description: "Business profile, posts, highlights, engagement" },
  { icon: XSocialIcon, title: "X (Twitter)", description: "Tweets, mentions, followers, sentiment" },
  { icon: SearchIcon, title: "Open Web", description: "News, articles, directories, press mentions" },
];

export function LandingEnrichment() {
  return (
    <section id="enrichment" style={{ position: "relative", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", color: "var(--g-green-text)", fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          <ZapIcon size={13} color="var(--g-green-text)" /> Contact &amp; profile enrichment
        </div>
        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.2, margin: "0 0 12px" }}>
          Know the business. <br />
          <span style={{ color: "var(--g-green)" }}>Reach the right person.</span>
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", maxWidth: 560, margin: "0 auto 48px" }}>
          Enrich local business profiles, identify founders and decision-makers, and verify the best available contact channels.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(300px, 440px) 1fr", gap: 20, alignItems: "start", textAlign: "left" }} className="landing-enrichment-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {LEFT_SOURCES.map((s) => (
              <SourceCard key={s.title} {...s} />
            ))}
          </div>

          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>Brewz Cafe</div>
            <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginBottom: 8 }}>Sector 56, Gurugram</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--g-ink)", marginBottom: 14 }}>
              <StarIcon size={13} /> 4.6 (612) <span style={{ fontWeight: 500, color: "var(--g-gray-500)" }}>· Cafe</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11.5, marginBottom: 14 }}>
              <Field label="Website" value="Website gap" danger />
              <Field label="Business Hours" value="7:30 AM – 11:00 PM" />
              <Field label="Commercial Intent" value="High" />
              <Field label="Services" value="Coffee, Bakery, Events" />
            </div>
            <div style={{ height: 1, background: "var(--g-border)", margin: "14px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 8 }}>TOP DECISION-MAKER</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>Arjun Mehta · Owner</div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: "var(--g-gray-500)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MailIcon size={13} /> Verified</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><PhoneIcon size={13} /> Verified</span>
            </div>
            <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "var(--g-cream)", display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--g-gray-500)" }}>
              <LockIcon /> Unlock verified contacts to access more details
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {RIGHT_SOURCES.map((s) => (
              <SourceCard key={s.title} {...s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; description: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 14, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)" }}>
      <Icon size={18} />
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--g-gray-500)", lineHeight: 1.4 }}>{description}</div>
      </div>
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--g-gray-500)", marginBottom: 2 }}>{label}</div>
      <div style={{ color: danger ? "var(--g-red-text)" : "var(--g-ink)", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
