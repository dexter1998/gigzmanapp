import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { EyebrowPill, SectionHeading } from "@/components/marketing/MarketingPieces";
import { CopyField } from "./CopyField";

/**
 * The page approved partners are sent to.
 *
 * It replaces the downloadable brand kit's own preview.html, which assumed the partner would copy
 * the assets onto their own server. That assumption was the whole problem: it put an upload step
 * between approval and a live badge, it meant the art could never be corrected once it was out
 * there, and it left us with nothing to verify against. Everything here is served from mantisai.in,
 * so the embed is one paste and the badge stays ours.
 *
 * noindex: this is a destination for people holding an approval email, not a search result. It also
 * stops the embed snippets being scraped and used by non-partners.
 */
export const metadata: Metadata = {
  title: { absolute: `Partner Brand Kit — ${COMPANY.brandLong}` },
  description: "Badges and embed code for approved Mantis Ai lead partners.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${COMPANY.site}/partner/brand-kit` },
};

// Two bases on purpose. The snippets a partner copies must carry the absolute production URL --
// that is the entire point, since the asset is served by us and not by them. The page's own preview
// images and download links are relative, so this page renders correctly on localhost and on any
// preview deployment instead of silently pulling from production (or showing nothing, which is what
// it did before this split).
const BASE = "/partners/badge";
const ABSOLUTE_BASE = `${COMPANY.site}/partners/badge`;

const VARIANTS = [
  {
    key: "light",
    name: "Light",
    note: "The default. Use it on white or any light footer.",
    swatch: "#ffffff",
  },
  {
    key: "dark",
    name: "Dark",
    note: "For dark footers. The logo keeps its own white panel so its colours stay correct.",
    swatch: "#191f17",
  },
  {
    key: "transparent",
    name: "Transparent",
    note: "No surround — sits on whatever colour is behind it.",
    swatch: "#8a8a8a",
  },
] as const;

function embedHtml(variant: string) {
  return `<a href="${COMPANY.site}/partner" target="_blank" rel="noopener noreferrer" aria-label="Mantis Leads Partner">
  <img src="${ABSOLUTE_BASE}/leads-partner-${variant}.png"
       alt="Mantis Leads Partner" width="360" height="96"
       loading="lazy" style="display:block;max-width:100%;height:auto;border:0">
</a>`;
}

function embedScript(variant: string) {
  return `<script src="${COMPANY.site}/partners/badge.js" data-variant="${variant}" data-width="360"></script>`;
}

export default function PartnerBrandKitPage() {
  return (
    <section style={{ padding: "72px 24px 110px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <EyebrowPill>Approved partners</EyebrowPill>
        <SectionHeading
          title="Your Mantis partnership,"
          accent="ready to display."
          sub="Pick a badge, copy the code into your footer, and reply to your approval email with your website link. Nothing to download or upload — the badge is served from mantisai.in."
        />

        {VARIANTS.map((v) => (
          <div
            key={v.key}
            style={{
              marginTop: 32, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)",
              background: "var(--g-white)", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, padding: 24, background: v.swatch }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the badge is a fixed asset served
                  from our own public/, and the whole point of this page is to show exactly the markup
                  a partner will paste. next/image would render something they cannot reproduce. */}
              <img
                src={`${BASE}/leads-partner-${v.key}.png`}
                alt={`Mantis Leads Partner badge, ${v.name.toLowerCase()}`}
                width={360}
                height={96}
                style={{ display: "block", maxWidth: "100%", height: "auto" }}
              />
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink)", margin: 0 }}>{v.name}</h3>
                <a href={`${BASE}/leads-partner-${v.key}.png`} download style={dl}>PNG</a>
                <a href={`${BASE}/leads-partner-${v.key}.svg`} download style={dl}>SVG</a>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", margin: "0 0 18px", lineHeight: 1.6 }}>{v.note}</p>

              <CopyField label="HTML — recommended" code={embedHtml(v.key)} />
              <div style={{ height: 12 }} />
              <CopyField
                label="Script tag — optional"
                hint="Use this instead if you would rather not keep the markup. It must not be async or defer."
                code={embedScript(v.key)}
              />
            </div>
          </div>
        ))}

        <div style={{ marginTop: 44, padding: 28, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", background: "var(--g-cream)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--g-ink)", margin: "0 0 14px" }}>Usage</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8, color: "var(--g-ink-soft)" }}>
            <li>Keep the wording <strong>LEADS PARTNER</strong> and the Mantis logo as supplied.</li>
            <li>Do not stretch, recolour, rotate, or rebuild any part of the logo.</li>
            <li>Display at <strong>240px wide or more</strong>, with at least 12px of clear space around it.</li>
            <li>Keep the link to {COMPANY.site} attached.</li>
            <li>On dark backgrounds use the dark variant, so the logo keeps its own colours.</li>
          </ul>
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "16px 0 0", lineHeight: 1.6 }}>
            Palette: white <code>#FFFFFF</code>, charcoal <code>#191F17</code>, muted green <code>#526247</code>. The
            original logo&apos;s own colours are authoritative. Need the unmodified logo?{" "}
            <a href={`${BASE}/mantis-logo-original.png`} download style={{ color: "var(--g-green-text)" }}>Download it here</a>.
          </p>
        </div>

        <p style={{ marginTop: 36, fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.7 }}>
          Badge live? Reply to your approval email with the page it is on and we will activate your
          credits. Anything unclear — just reply to the same thread.
        </p>
      </div>
    </section>
  );
}

const dl: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textDecoration: "none",
  padding: "3px 9px", borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)", color: "var(--g-ink-soft)",
};
