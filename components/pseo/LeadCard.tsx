import Link from "next/link";
import { HeatGauge } from "@/components/HeatGauge";
import { StarIcon } from "@/components/icons";
import type { ScoredLead } from "@/lib/pseo/stats";

/**
 * One business on a public lead page. A server component: everything it shows is in the initial
 * HTML, because content that only appears after JavaScript runs is content a crawler may never see.
 *
 * What is shown and what is not is a deliberate line. The name, category, area, rating and review
 * count are already public on Google Maps, so withholding them would only make the page thinner
 * without protecting anything. Phone, email and street address — the things that make a lead
 * actionable, and the things we actually sell — are never rendered and never reach the client.
 */
export function LeadCard({ lead, areaName }: { lead: ScoredLead; areaName: string | null }) {
  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 132px",
        gap: 16,
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
      }}
      className="pseo-lead-card"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>
            {lead.business_name}
          </h3>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 0.3,
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--g-amber-tint)",
              color: "#b45309",
              whiteSpace: "nowrap",
            }}
          >
            NO WEBSITE
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--g-ink-soft)", margin: "6px 0 0" }}>
          {lead.categoryLabel}
          {areaName ? ` · ${areaName}` : ""}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          {lead.rating !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--g-ink-soft)" }}>
              <StarIcon size={12} />
              {lead.rating.toFixed(1)}
              <span style={{ color: "var(--g-gray-500)" }}>({lead.review_count ?? 0} reviews)</span>
            </span>
          )}
          {lead.website_checked_at && (
            <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>
              Verified {lead.website_checked_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)" }}>
          LEAD SCORE
        </div>
        <HeatGauge score={lead.score} size={78} />
        {/* Every call to action is the same registration boundary. The page itself stays useful to
            someone who never clicks it — that is what keeps it from being a funnel. */}
        <Link
          href="/login"
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            background: "var(--g-ink)",
            color: "#fff",
            borderRadius: "var(--radius-pill)",
            padding: "9px 12px",
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Unlock contact
        </Link>
      </div>
    </article>
  );
}
