"use client";

import { CreditPackCards, CreditPackFootnote, EnterpriseBand } from "@/components/billing/CreditPackCards";
import { CREDIT_COST, FREE_MONTHLY_CREDITS } from "@/lib/credits/pricing";
import { CheckIcon } from "@/components/icons";

/**
 * /pricing. Same cards as the landing page and the in-app buy modal, plus the full rate card —
 * the thing a buyer actually needs to judge whether a pack is worth it.
 *
 * Publishing the rate card openly is deliberate: metered pricing is only trustworthy if you can
 * see what each action costs before you spend anything.
 */

const RATE_CARD: Array<{ label: string; credits: number; note?: string }> = [
  { label: "Search an area someone has already scanned", credits: CREDIT_COST.cached_search, note: "Always free, unlimited" },
  { label: "Search new ground (per live lookup, returns up to 20 businesses)", credits: CREDIT_COST.billed_places_call, note: "First 5 a day are free" },
  { label: "Ask Mantis in chat", credits: CREDIT_COST.chat_turn, note: "First 5 a day are free" },
  { label: "Add a lead — name, address, phone", credits: CREDIT_COST.lead_unlock },
  { label: "Website health check", credits: CREDIT_COST.website_check },
  { label: "Deep enrichment — hours, busy times", credits: CREDIT_COST.deep_enrich },
  { label: "Verified email", credits: CREDIT_COST.verified_email },
  { label: "Verified phone", credits: CREDIT_COST.verified_phone },
  { label: "Find the founder or decision-maker", credits: CREDIT_COST.find_founder },
  { label: "Generate a pitch script", credits: CREDIT_COST.pitch_script },
];

export function PricingPlans() {
  return (
    <>
      <CreditPackCards />
      <EnterpriseBand />
      <CreditPackFootnote />

      <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: "var(--g-ink)", textAlign: "center", margin: "72px 0 10px", letterSpacing: "-0.02em" }}>
        Only real work costs credits.
      </h2>
      <p style={{ fontSize: 15, color: "var(--g-gray-500)", textAlign: "center", margin: "0 auto 30px", maxWidth: 560, lineHeight: 1.6 }}>
        Searching, filtering and reading scores are free. A credit is spent when Mantis fetches
        something new or hands you a contact.
      </p>

      <div style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", background: "var(--g-white)", overflow: "hidden", textAlign: "left" }}>
        {RATE_CARD.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "14px 20px",
              borderBottom: i === RATE_CARD.length - 1 ? "none" : "1px solid var(--g-border)",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: "var(--g-ink)" }}>{row.label}</div>
              {row.note && <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>{row.note}</div>}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: row.credits === 0 ? "var(--g-green-text)" : "var(--g-ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.credits === 0 ? "Free" : `${row.credits} credits`}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 20, textAlign: "left" }}>
        <Note title="One lookup, up to 20 businesses">
          A neighbourhood search is usually a handful of lookups, not one per business — and every
          lookup you pay for makes that area free for your next visit, and for everyone else&apos;s.
        </Note>
        <Note title="The free plan renews">
          {FREE_MONTHLY_CREDITS} credits every month, not a one-off trial, plus unlimited searching
          across everything already scanned.
        </Note>
        <Note title="Run out? Just top up">
          Packs are one-time purchases with no monthly cap — buy the same pack again the day it runs
          out, as many times as you need.
        </Note>
      </div>
    </>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <CheckIcon size={15} color="var(--g-green)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--g-ink)" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
}
