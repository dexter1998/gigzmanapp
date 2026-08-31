"use client";

import { useState } from "react";
import { PlusIcon, MinusIcon } from "@/components/icons";
import { OrigamiDecoration } from "./OrigamiDecoration";

const FAQS = [
  { q: "How does Mantis Ai find leads?", a: "Mantis searches live web sources, business listings, websites and social profiles, then cross-checks results before adding them to your workspace." },
  { q: "Can I export leads and contact data?", a: "Yes — export any list to CSV or Excel, or push leads directly into your CRM from the Pro plan up." },
  { q: "What counts as a high-intent lead?", a: "A lead scores high-intent when it combines a real digital gap (no website or weak SEO) with strong underlying demand signals like review volume and rating." },
  { q: "Can my team manage leads together?", a: "Yes — leads, stages and follow-ups are shared across your workspace so your whole team stays in sync." },
  { q: "Is the data fresh and verified?", a: "Every search runs live against 50+ sources rather than a stored database, and results are cross-checked before they reach you." },
  { q: "Can I search multiple locations?", a: "Yes — switch locations anytime from your workspace; each search is scoped to the area you're prospecting." },
  { q: "Does Mantis Ai use a stored database?", a: "No — every search scans live sources in real time. Results are cached per area so repeat searches stay fast without re-billing for the same ground." },
  { q: "Is there a free plan?", a: "Yes — the Free plan includes 50 leads a month, forever, no credit card required." },
];

export type Faq = { q: string; a: string };

/** Props exist so the public lead pages can reuse this section verbatim with their own questions.
 *  Defaults keep the landing page's call site unchanged. */
export function LandingFaq({
  faqs = FAQS,
  title = "Questions,",
  accent = "answered.",
  sub = "Everything agencies need to know before finding their next local client.",
  jsonLd = true,
}: {
  faqs?: Faq[];
  title?: string;
  accent?: string;
  sub?: string;
  jsonLd?: boolean;
} = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const half = Math.ceil(faqs.length / 2);
  const left = faqs.slice(0, half);
  const right = faqs.slice(half);

  return (
    <section id="faq" style={{ position: "relative", padding: "96px 24px", textAlign: "center", overflow: "hidden" }}>
      <OrigamiDecoration variant="corner-left" opacity={0.35} width="42vw" />
      <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
          {title} <span style={{ color: "var(--g-green-dark)" }}>{accent}</span>
        </h2>
        <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: "0 0 52px" }}>{sub}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "0 64px", textAlign: "left" }}>
          <div>{left.map((f) => <FaqItem key={f.q} faq={f} index={faqs.indexOf(f)} openIndex={openIndex} setOpenIndex={setOpenIndex} />)}</div>
          <div>{right.map((f) => <FaqItem key={f.q} faq={f} index={faqs.indexOf(f)} openIndex={openIndex} setOpenIndex={setOpenIndex} />)}</div>
        </div>
      </div>

      {/* FAQPage structured data — every question/answer pair, not just the visibly-expanded one,
          so this is eligible for a Google FAQ rich result / "People also ask" regardless of
          which item a visitor happened to have open. Suppressed where the page already emits its
          own FAQPage node: two on one URL is a conflicting claim, not twice the coverage. */}
      {jsonLd && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />}
    </section>
  );
}

function FaqItem({
  faq,
  index,
  openIndex,
  setOpenIndex,
}: {
  faq: { q: string; a: string };
  index: number;
  openIndex: number | null;
  setOpenIndex: (i: number | null) => void;
}) {
  const open = openIndex === index;
  return (
    <div style={{ borderBottom: "1px solid var(--g-border)", padding: "26px 0" }}>
      <button
        type="button"
        onClick={() => setOpenIndex(open ? null : index)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: open ? "var(--g-green-text)" : "var(--g-ink)" }}>{faq.q}</span>
        {open ? <MinusIcon size={20} color="var(--g-green-text)" /> : <PlusIcon size={20} color="var(--g-green)" />}
      </button>
      {/* Rendered whether or not it is open, and hidden with CSS. `{open && ...}` kept every answer
          out of the served HTML entirely, which is content a crawler never sees — the JSON-LD below
          carried the text but the page itself did not. */}
      <p
        style={{
          fontSize: 14.5,
          color: "var(--g-gray-500)",
          lineHeight: 1.65,
          margin: open ? "16px 0 0" : 0,
          height: open ? "auto" : 0,
          overflow: "hidden",
          visibility: open ? "visible" : "hidden",
        }}
      >
        {faq.a}
      </p>
    </div>
  );
}
