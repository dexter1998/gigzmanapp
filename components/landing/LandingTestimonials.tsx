import Image from "next/image";
import { ShieldCheckIcon, QuoteIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

// span: 12-col masonry — one large featured quote center, flanked by medium cards, with two
// half-width cards on the row below, matching the approved reference's staggered hierarchy.
const TESTIMONIALS = [
  { quote: "Mantis Ai helps us find the right local clients without the noise. Our pipeline has never been this consistent.", name: "Rohit Ahuja", title: "Founder, Digital Marketing Agency", location: "Gurugram, India", stat: "40+ qualified leads", span: 3 },
  { quote: "Mantis Ai turned local prospecting from guesswork into a repeatable pipeline.", name: "Ananya Mehra", title: "Founder, Growth Agency", location: "Bengaluru, India", stat: "2 deals in 14 days", span: 6, big: true },
  { quote: "The data accuracy is impressive. We reach out with confidence and close more high-intent clients.", name: "Karan Malhotra", title: "Founder, Web Agency", location: "Noida, India", stat: "3x faster prospecting", span: 3 },
  { quote: "Mantis Ai saves us hours every week. What used to take days now takes minutes.", name: "Neha Kapoor", title: "Co-founder, Tech Agency", location: "Mumbai, India", stat: "6 hours saved weekly", span: 6 },
  { quote: "Finally, a tool that actually delivers real local clients, not just data.", name: "Arjun Mehta", title: "Founder, Creative Studio", location: "Pune, India", stat: "31% reply rate", span: 6 },
];

const PARTNER_LOGOS = ["WPP", "dentsu", "iProspect", "WebFX", "groupM", "PUBLICIS MEDIA", "FCB"];

export function LandingTestimonials() {
  return (
    <section id="testimonials" style={{ position: "relative", padding: "96px 0 0", textAlign: "center", overflow: "hidden" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-green)", color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>
          <ShieldCheckIcon size={14} color="var(--g-green-text)" /> Trusted by 1,000+ agencies
        </div>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Clients found. Pitches sent. <span style={{ color: "var(--g-green-dark)" }}>Deals won.</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: "0 0 52px" }}>What agencies and freelancers are building with Mantis Ai.</p>

        <div className="landing-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 22, textAlign: "left", marginBottom: 56 }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              style={{
                gridColumn: `span ${t.span}`,
                background: t.big ? "var(--g-green-mint)" : "var(--g-white)",
                border: `1px solid ${t.big ? "var(--g-green)" : "var(--g-border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: t.big ? 32 : 24,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <QuoteIcon size={t.big ? 28 : 24} />
              <p style={{ fontSize: t.big ? 20 : 15, fontWeight: t.big ? 700 : 500, color: "var(--g-ink)", lineHeight: t.big ? 1.4 : 1.5, margin: "14px 0 18px", flex: 1 }}>{t.quote}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.big ? "#fff" : "var(--g-green-mint)", color: "var(--g-green-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>{t.title} · {t.location}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", background: t.big ? "#fff" : "var(--g-green-mint)", padding: "4px 12px", borderRadius: "var(--radius-pill)", alignSelf: "flex-start" }}>
                ↗ {t.stat}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 40, opacity: 0.7, marginBottom: 56 }}>
          {PARTNER_LOGOS.map((logo) => (
            <span key={logo} style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink-soft)" }}>{logo}</span>
          ))}
        </div>
      </div>

      {/* Origami mound + mantis anchored to the section's bottom-right corner, not floating */}
      <div style={{ position: "relative", height: 180 }}>
        <OrigamiDecoration variant="corner-right" opacity={0.6} width="42vw" />
        <Image
          aria-hidden="true"
          alt=""
          src="/landing/mantis-crouch.png"
          sizes="(max-width: 900px) 45vw, 360px"
          width={1254}
          height={1254}
          style={{ position: "absolute", bottom: 0, right: "6%", width: 190, height: "auto", zIndex: 1 }}
        />
      </div>
    </section>
  );
}
