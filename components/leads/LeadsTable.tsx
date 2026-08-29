"use client";

import { HeatGauge } from "@/components/HeatGauge";
import { StarIcon } from "@/components/icons";
import { formatCategory } from "@/lib/categories";

export type Lead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  has_website: boolean | null;
  contacted: boolean;
  heat_score: number | null;
  rating: number | null;
  review_count: number | null;
  is_unlocked: boolean;
  /** Null until this lead has ever been queued for enrichment. */
  enrichment_status?: "pending" | "starting_instance" | "scraping" | "done" | "failed" | null;
  enrichment_website_url?: string | null;
};

export function LeadsTable({
  leads,
  selected,
  onToggle,
  onToggleAll,
  activeId,
  onActivate,
  onEnrich,
}: {
  leads: Lead[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  activeId: string | null;
  onActivate: (lead: Lead) => void;
  /** Queues the lead for background enrichment. */
  onEnrich?: (lead: Lead) => void;
}) {
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));

  return (
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)", width: 32 }}>
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all" style={{ cursor: "pointer" }} />
              </th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Business</th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Category</th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Contact</th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Rating</th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Score</th>
              <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onActivate(lead)}
                style={{
                  borderBottom: "1px solid var(--g-border)",
                  cursor: "pointer",
                  background: activeId === lead.id ? "var(--g-green-mint)" : "transparent",
                }}
              >
                <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => onToggle(lead.id)} style={{ cursor: "pointer" }} />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>{lead.business_name}</span>
                    <StatusPill hasWebsite={lead.has_website} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginTop: 2 }}>{lead.address ?? "No address found"}</div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--g-ink-soft)" }}>{formatCategory(lead.category)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--g-ink-soft)" }}>
                  {lead.phone ?? "No phone found"}
                  {lead.email ? <div>{lead.email}</div> : null}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  {lead.rating !== null ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--g-ink-soft)" }}>
                      <StarIcon size={11} />
                      {lead.rating.toFixed(1)} ({lead.review_count ?? 0})
                    </div>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "12px 14px" }}>{lead.heat_score !== null && <HeatGauge score={lead.heat_score} size={44} />}</td>
                <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                  <DetailsCell lead={lead} onEnrich={onEnrich} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * "More details" for a saved lead: queue it and get on with your day.
 *
 * Enrichment boots a scraper and can take a couple of minutes, so this deliberately doesn't
 * pretend to be live. Queuing is the whole interaction — the job runs server-side on a cron tick
 * whether or not this page stays open, the result is stored against the lead, and the row shows it
 * whenever you next look. Locked leads don't get the option at all: enrichment only ever runs on a
 * lead that's already been unlocked.
 */
function DetailsCell({ lead, onEnrich }: { lead: Lead; onEnrich?: (lead: Lead) => void }) {
  if (!lead.is_unlocked) {
    return <span style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>Unlock first</span>;
  }

  const status = lead.enrichment_status ?? null;

  if (status === "done") {
    return lead.enrichment_website_url ? (
      <a
        href={lead.enrichment_website_url}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-green-text)" }}
      >
        Website found
      </a>
    ) : (
      <span style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>No extra details</span>
    );
  }

  if (status === "pending" || status === "starting_instance" || status === "scraping") {
    return (
      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--g-gray-100)", color: "var(--g-gray-500)" }}>
        In queue
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEnrich?.(lead)}
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid var(--g-border)",
        background: "var(--g-white)",
        color: "var(--g-ink)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {status === "failed" ? "Retry details" : "More details"}
    </button>
  );
}

function StatusPill({ hasWebsite }: { hasWebsite: boolean | null }) {
  const label = hasWebsite === null ? "Checking…" : hasWebsite ? "Has website" : "No website";
  const bg = hasWebsite === null ? "var(--g-gray-100)" : hasWebsite ? "var(--g-green-mint)" : "var(--g-amber-tint)";
  const color = hasWebsite === null ? "var(--g-gray-500)" : hasWebsite ? "var(--g-green-text)" : "#b45309";
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: bg, color }}>
      {label}
    </span>
  );
}
