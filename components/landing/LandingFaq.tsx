"use client";

import { useState } from "react";
import { PlusIcon, MinusIcon } from "@/components/icons";

const FAQS = [
  { q: "How does Mantis AI find leads?", a: "Mantis searches live web sources, business listings, websites and social profiles, then cross-checks results before adding them to your workspace." },
  { q: "Can I export leads and contact data?", a: "Yes — export any list to CSV or Excel, or push leads directly into your CRM from the Pro plan up." },
  { q: "What counts as a high-intent lead?", a: "A lead scores high-intent when it combines a real digital gap (no website or weak SEO) with strong underlying demand signals like review volume and rating." },
  { q: "Can my team manage leads together?", a: "Yes — leads, stages and follow-ups are shared across your workspace so your whole team stays in sync." },
  { q: "Is the data fresh and verified?", a: "Every search runs live against 50+ sources rather than a stored database, and results are cross-checked before they reach you." },
  { q: "Can I search multiple locations?", a: "Yes — switch locations anytime from your workspace; each search is scoped to the area you're prospecting." },
  { q: "Does Mantis AI use a stored database?", a: "No — every search scans live sources in real time. Results are cached per area so repeat searches stay fast without re-billing for the same ground." },
  { q: "Is there a free plan?", a: "Yes — the Free plan includes 50 leads a month, forever, no credit card required." },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const left = FAQS.slice(0, 4);
  const right = FAQS.slice(4);

  return (
    <section id="faq" style={{ position: "relative", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 46px)", fontWeight: 800, color: "var(--g-ink)", margin: "0 0 10px" }}>
          Questions, <span style={{ color: "var(--g-green)" }}>answered.</span>
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", margin: "0 0 44px" }}>Everything agencies need to know before finding their next local client.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "0 40px", textAlign: "left" }}>
          <div>{left.map((f) => <FaqItem key={f.q} faq={f} index={FAQS.indexOf(f)} openIndex={openIndex} setOpenIndex={setOpenIndex} />)}</div>
          <div>{right.map((f) => <FaqItem key={f.q} faq={f} index={FAQS.indexOf(f)} openIndex={openIndex} setOpenIndex={setOpenIndex} />)}</div>
        </div>
      </div>

      {/* FAQPage structured data — every question/answer pair, not just the visibly-expanded one,
          so this is eligible for a Google FAQ rich result / "People also ask" regardless of
          which item a visitor happened to have open. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
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
    <div style={{ borderBottom: "1px solid var(--g-border)", padding: "18px 0" }}>
      <button
        type="button"
        onClick={() => setOpenIndex(open ? null : index)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: open ? "var(--g-green-text)" : "var(--g-ink)" }}>{faq.q}</span>
        {open ? <MinusIcon color="var(--g-green-text)" /> : <PlusIcon color="var(--g-green)" />}
      </button>
      {open && <p style={{ fontSize: 13, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "12px 0 0" }}>{faq.a}</p>}
    </div>
  );
}
