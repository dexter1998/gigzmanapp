import Link from "next/link";
import { HeatGauge } from "@/components/HeatGauge";
import { StarIcon, PinIcon, ClockIcon, GlobeIcon, ZapIcon, LockIcon } from "@/components/icons";
import { CategoryIcon } from "@/components/pseo/CategoryIcon";
import type { ScoredLead } from "@/lib/pseo/stats";

/**
 * One business on a public lead page. A server component: everything it shows is in the initial
 * HTML, because content that only appears after JavaScript runs is content a crawler may never see.
 *
 * What is shown and what is not is a deliberate line. The name, category, area, rating and review
 * count are already public on Google Maps, so withholding them would only make the page thinner
 * without protecting anything. Phone, email and street address — the things that make a lead
 * actionable, and the things we actually sell — are never rendered and never reach the client.
 *
 * The two `data-*` attributes are the filter island's only handle on this card: it matches by id and
 * toggles `data-filtered`. No filter state ever reaches the URL, so no crawlable parameter space is
 * created, and with JavaScript off every card simply stays visible.
 */
export function LeadCard({
  lead,
  areaName,
  hideCategory,
  order,
}: {
  lead: ScoredLead & { masked?: boolean };
  areaName: string | null;
  /** Explicit flex order so the modules interleaved between the cards keep their position when the
   *  sort control renumbers everything around them. */
  order?: number;
  /** True on a category page, where naming the category on every card says nothing the heading
   *  hasn't already said. The icon still carries it. */
  hideCategory?: boolean;
}) {
  const masked = lead.masked === true;
  const intentLabel = lead.intent === "high" ? "HIGH INTENT" : lead.intent === "medium" ? "ACTIVE" : null;

  return (
    <article
      data-pseo-card=""
      data-lead-id={lead.id}
      style={{
        order,
        display: "grid",
        gridTemplateColumns: "1fr 136px",
        gap: 16,
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        padding: 18,
      }}
      className="pseo-lead-card"
    >
      <div style={{ minWidth: 0 }}>
        {/* Badge row — the signals that decide whether this lead is worth a call, before the name. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
          <Badge icon={<GlobeIcon size={10} color="#b45309" />} label="No website" tone="amber" />
          {intentLabel && <Badge icon={<ZapIcon size={10} color="var(--g-green-text)" />} label={intentLabel} tone="green" />}
          {lead.rating !== null && lead.rating >= 4.5 && <Badge label="Top rated" tone="ink" />}
        </div>

        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: masked ? "var(--g-gray-500)" : "var(--g-ink)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {lead.business_name}
          {masked && <LockIcon size={12} color="var(--g-gray-500)" />}
        </h3>

        {/* Icon + data row: category, area, and how recently we checked the no-website claim. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12.5, color: "var(--g-ink-soft)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CategoryIcon category={lead.category} size={13} />
            {hideCategory ? null : lead.categoryLabel}
          </span>
          {areaName && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <PinIcon size={11} color="var(--g-gray-500)" />
              {areaName}
            </span>
          )}
          {lead.rating !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <StarIcon size={11} />
              {lead.rating.toFixed(1)}
              <span style={{ color: "var(--g-gray-500)" }}>({lead.review_count ?? 0})</span>
            </span>
          )}
        </div>

        {lead.website_checked_at && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, fontSize: 11.5, color: "var(--g-gray-500)" }}>
            <ClockIcon size={11} color="var(--g-gray-500)" />
            Updated on{" "}
            {lead.website_checked_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--g-gray-500)" }}>Lead Score</div>
        <HeatGauge score={lead.score} size={74} />
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
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {masked ? "Reveal name" : "Unlock contact"}
        </Link>
      </div>
    </article>
  );
}

const TONES = {
  amber: { bg: "var(--g-amber-tint)", fg: "#b45309" },
  green: { bg: "var(--g-green-mint)", fg: "var(--g-green-text)" },
  ink: { bg: "var(--g-cream)", fg: "var(--g-ink-soft)" },
} as const;

function Badge({ icon, label, tone }: { icon?: React.ReactNode; label: string; tone: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: 0.35,
        padding: "3px 8px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
