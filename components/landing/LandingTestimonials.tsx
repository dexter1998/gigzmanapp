import Image from "next/image";
import { ShieldCheckIcon, QuoteIcon } from "@/components/icons";

const TESTIMONIALS = [
  { quote: "Mantis AI helps us find the right local clients without the noise. Our pipeline has never been this consistent.", name: "Rohit Ahuja", title: "Founder, Digital Marketing Agency", location: "Gurugram, India", stat: "40+ qualified leads" },
  { quote: "Mantis AI turned local prospecting from guesswork into a repeatable pipeline.", name: "Ananya Mehra", title: "Founder, Growth Agency", location: "Bengaluru, India", stat: "2 deals in 14 days", big: true },
  { quote: "The data accuracy is impressive. We reach out with confidence and close more high-intent clients.", name: "Karan Malhotra", title: "Founder, Web Agency", location: "Noida, India", stat: "3x faster prospecting" },
  { quote: "Mantis AI saves us hours every week. What used to take days now takes minutes.", name: "Neha Kapoor", title: "Co-founder, Tech Agency", location: "Mumbai, India", stat: "6 hours saved weekly" },
  { quote: "Finally, a tool that actually delivers real local clients, not just data.", name: "Arjun Mehta", title: "Founder, Creative Studio", location: "Pune, India", stat: "31% reply rate" },
];

const PARTNER_LOGOS = ["WPP", "dentsu", "iProspect", "WebFX", "groupM", "PUBLICIS MEDIA", "FCB"];

export function LandingTestimonials() {
  return (
    <section id="testimonials" style={{ position: "relative", padding: "80px 24px", textAlign: "center", overflow: "hidden" }}>
      <Image
        aria-hidden="true"
        alt=""
        src="/landing/mantis-crouch.png"
        width={1254}
        height={1254}
        style={{ position: "absolute", top: 12, right: "max(2%, calc(50% - 620px))", width: 110, height: "auto", opacity: 0.9, zIndex: 0 }}
      />
      <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-green)", color: "var(--g-green-text)", fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          <ShieldCheckIcon size={14} color="var(--g-green-text)" /> Trusted by 1,000+ agencies
        </div>
        <h2 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 10px" }}>
          Clients found. Pitches sent. <span style={{ color: "var(--g-green)" }}>Deals won.</span>
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", margin: "0 0 44px" }}>What agencies and freelancers are building with Mantis AI.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, textAlign: "left", marginBottom: 48 }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              style={{
                background: "var(--g-white)",
                border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 22,
                gridColumn: t.big ? "span 1" : undefined,
              }}
            >
              <QuoteIcon size={22} />
              <p style={{ fontSize: t.big ? 17 : 14, fontWeight: t.big ? 700 : 500, color: "var(--g-ink)", lineHeight: 1.45, margin: "10px 0 16px" }}>{t.quote}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--g-green-mint)", color: "var(--g-green-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{t.title} · {t.location}</div>
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "3px 10px", borderRadius: "var(--radius-pill)" }}>
                ↗ {t.stat}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32, opacity: 0.55 }}>
          {PARTNER_LOGOS.map((logo) => (
            <span key={logo} style={{ fontSize: 15, fontWeight: 700, color: "var(--g-gray-500)" }}>{logo}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
