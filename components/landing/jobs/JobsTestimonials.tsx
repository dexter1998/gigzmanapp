import { ShieldCheckIcon, QuoteIcon } from "@/components/icons";
import { OrigamiDecoration } from "../OrigamiDecoration";

/** "Jobs found. Applications sent. Offers won." — matches 07-testimonials.png. Names/companies
 * are placeholder copy, same convention as the leads-side LandingTestimonials, until real
 * quotes are collected from jobs-mode users. */
const TESTIMONIALS = [
  { quote: "Mantis Jobs helped me discover relevant roles I wouldn't have found otherwise. I had an interview within 3 days!", name: "Mehak Arora", title: "Product Designer, Gurugram", stat: "Interview in 3 days", span: 4 },
  { quote: "I found a better opportunity on Mantis before it even showed up on LinkedIn. The role matched my skills perfectly.", name: "Rohit Singh", title: "Software Engineer, Delhi", stat: "Found before LinkedIn", span: 4 },
  { quote: "The job alerts are spot on. I applied to a few curated roles and ended up with an offer from a great company!", name: "Divya Nair", title: "Growth Marketer, Bengaluru", stat: "Offer accepted", span: 4 },
  { quote: "Mantis Jobs saves me hours every week. I get relevant opportunities without the noise.", name: "Aman Verma", title: "Data Analyst, Noida", stat: "Saved 6 hours weekly", span: 6 },
  { quote: "The role tracking feature is a game changer. I can see hot roles tailored to my profile and never miss an opportunity.", name: "Sneha Kapoor", title: "UX Researcher, Pune", stat: "12 hot roles tracked", span: 6 },
];

export function JobsTestimonials() {
  return (
    <section id="testimonials" style={{ position: "relative", padding: "96px 0", textAlign: "center", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-right" opacity={0.3} width="30vw" />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--radius-pill)", border: "1px solid var(--g-green)", color: "var(--g-green-text)", fontSize: 12.5, fontWeight: 700, marginBottom: 22 }}>
          <ShieldCheckIcon size={14} color="var(--g-green-text)" /> Trusted by job seekers
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Jobs found. Applications sent. <span style={{ color: "var(--g-green)" }}>Offers won.</span>
        </h2>
        <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", margin: "0 0 48px" }}>What job seekers are discovering with Mantis Jobs.</p>

        <div className="landing-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 18, textAlign: "left" }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} style={{ gridColumn: `span ${t.span}`, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 22, display: "flex", flexDirection: "column" }}>
              <QuoteIcon size={22} />
              <p style={{ fontSize: 14, color: "var(--g-ink)", lineHeight: 1.55, margin: "12px 0 16px", flex: 1 }}>{t.quote}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--g-green-mint)", color: "var(--g-green-text)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{t.title}</div>
                </div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "4px 10px", borderRadius: "var(--radius-pill)", alignSelf: "flex-start" }}>
                {t.stat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
