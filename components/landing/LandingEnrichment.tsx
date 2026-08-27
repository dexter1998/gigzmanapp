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

const CONTACT_CHANNELS = [
  { icon: MailIcon, label: "Business Email", value: "arjun.mehta@brewzcafe.com", verified: true },
  { icon: PhoneIcon, label: "Phone", value: "+91 9810 •••• 45", verified: true },
  { icon: LinkedInIcon, label: "LinkedIn", value: "linkedin.com/in/arjunmehta", verified: true },
];

export function LandingEnrichment() {
  return (
    <section id="enrichment" style={{ position: "relative", padding: "96px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--radius-pill)", background: "var(--g-green-mint)", color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>
          <ZapIcon size={14} color="var(--g-green-text)" /> Contact &amp; profile enrichment
        </div>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.2, margin: "0 0 14px" }}>
          Know the business. <br />
          <span style={{ color: "var(--g-green)" }}>Reach the right person.</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", maxWidth: 580, margin: "0 auto 56px" }}>
          Enrich local business profiles, identify founders and decision-makers, and verify the best available contact channels.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(340px, 480px) 1fr", gap: 28, alignItems: "start", textAlign: "left" }} className="landing-enrichment-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {LEFT_SOURCES.map((s) => (
              <SourceCard key={s.title} {...s} />
            ))}
          </div>

          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--g-ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, textAlign: "center", lineHeight: 1.1, flexShrink: 0 }}>
                BREWZ
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)" }}>Brewz Cafe</div>
                <div style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>Sector 56, Gurugram</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--g-ink)", marginBottom: 18 }}>
              <StarIcon size={14} /> 4.6 (612) <span style={{ fontWeight: 500, color: "var(--g-gray-500)" }}>· Cafe</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12.5, marginBottom: 18 }}>
              <Field label="Website" value="Website gap" danger />
              <Field label="Business Hours" value="7:30 AM – 11:00 PM" />
              <Field label="Commercial Intent" value="High" />
              <Field label="Services" value="Coffee, Bakery, Events" />
            </div>
            <div style={{ height: 1, background: "var(--g-border)", margin: "18px 0" }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              {[GlobeIcon, FacebookIcon, InstagramIcon, LinkedInIcon, XSocialIcon].map((Icon, i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--g-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={14} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {RIGHT_SOURCES.map((s) => (
              <SourceCard key={s.title} {...s} />
            ))}
          </div>
        </div>

        {/* Full-width decision-maker strip */}
        <div
          style={{
            marginTop: 28,
            background: "var(--g-white)",
            border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--g-green-mint)", color: "var(--g-green-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
              AM
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Top decision-maker</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>Arjun Mehta · Owner</div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", gap: 24, flexWrap: "wrap", minWidth: 260 }}>
            {CONTACT_CHANNELS.map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <c.icon size={16} color="var(--g-gray-500)" />
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid var(--g-green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--g-green-text)" }}>
              94%
            </div>
            <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>
              Confidence <br />
              <span style={{ fontWeight: 700, color: "var(--g-ink)" }}>Very High</span>
            </div>
          </div>

          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--g-green)",
              background: "var(--g-green-mint)",
              color: "var(--g-green-text)",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <LockIcon /> Unlock verified contacts
          </button>
        </div>
      </div>
    </section>
  );
}

function SourceCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; description: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: 16, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)" }}>
      <Icon size={19} />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--g-gray-500)", lineHeight: 1.45 }}>{description}</div>
      </div>
    </div>
  );
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--g-gray-500)", marginBottom: 3 }}>{label}</div>
      <div style={{ color: danger ? "var(--g-red-text)" : "var(--g-ink)", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
