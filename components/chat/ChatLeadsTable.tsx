"use client";

import { useState } from "react";
import { HeatGauge } from "@/components/HeatGauge";
import { CheckIcon, StarIcon } from "@/components/icons";

export type ChatLead = {
  id: string;
  business_name: string;
  category: string | null;
  has_website: boolean | null;
  heat_score: number | null;
  is_unlocked?: boolean;
  /** Shown whether or not the row is unlocked. None of it identifies the business — it is exactly
   *  what a user needs to judge which masked row is worth a credit, and withholding it made the
   *  table impossible to act on. */
  rating?: number | null;
  review_count?: number | null;
  area?: string | null;
  verified_at?: string | null;
};

/** Real table (not a compact list) for chat search results — selectable rows (plus a header
 * "select all" checkbox, so a whole list doesn't need clicking one by one) with a bulk
 * "Add to leads" action that calls the same /api/leads/[id]/unlock route the map's own
 * "Add to leads" button uses, so a lead added from chat shows up in Leads exactly the
 * same way one added from the map does. */
export function ChatLeadsTable({ leads }: { leads: ChatLead[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Only the still-locked rows are selectable at all (an unlocked row shows a checkmark instead
  // of a checkbox) — "select all" only ever needs to reach those, never the already-added ones.
  const selectableIds = leads.filter((l) => !(l.is_unlocked || unlockedIds.has(l.id))).map((l) => l.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function addSelected() {
    const ids = [...selected].filter((id) => !unlockedIds.has(id));
    if (ids.length === 0) return;
    setAdding(true);
    try {
      for (const id of ids) {
        const res = await fetch(`/api/leads/${id}/unlock`, { method: "POST" });
        if (res.status === 402) {
          window.dispatchEvent(new Event("gigzman:open-plans"));
          break;
        }
        const data = (await res.json()) as { unlocked?: boolean };
        if (data.unlocked) {
          setUnlockedIds((prev) => new Set(prev).add(id));
        }
      }
      window.dispatchEvent(new Event("gigzman:credits-changed"));
    } finally {
      setAdding(false);
      setSelected(new Set());
    }
  }

  const pendingCount = [...selected].filter((id) => !unlockedIds.has(id)).length;

  return (
    <div style={{ marginTop: 14, border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)", width: 32 }}>
                {selectableIds.length > 0 && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" style={{ cursor: "pointer" }} />
                )}
              </th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Business</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Category</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Area</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Rating</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Website</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const isUnlocked = lead.is_unlocked || unlockedIds.has(lead.id);
              return (
                <tr key={lead.id} style={{ borderBottom: "1px solid var(--g-border)" }}>
                  <td style={{ padding: "8px 10px" }}>
                    {isUnlocked ? (
                      <span title="Added to leads"><CheckIcon size={14} color="var(--g-green-text)" /></span>
                    ) : (
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} style={{ cursor: "pointer" }} />
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>
                    {lead.business_name}
                    {lead.verified_at && (
                      <span style={{ display: "block", fontSize: 10.5, fontWeight: 400, color: "var(--g-gray-500)", marginTop: 2 }}>
                        Checked {new Date(lead.verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--g-gray-500)" }}>{lead.category ?? "Business"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--g-gray-500)", whiteSpace: "nowrap" }}>{lead.area ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--g-ink-soft)", whiteSpace: "nowrap" }}>
                    {lead.rating != null ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <StarIcon size={11} />
                        {lead.rating.toFixed(1)}
                        <span style={{ color: "var(--g-gray-500)" }}>({lead.review_count ?? 0})</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: lead.has_website ? "var(--g-green-mint)" : "var(--g-amber-tint)",
                        color: lead.has_website ? "var(--g-green-text)" : "#b45309",
                      }}
                    >
                      {lead.has_website ? "Has website" : "No website"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <HeatGauge score={lead.heat_score ?? 0} size={40} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid var(--g-border)", background: "var(--g-cream)" }}>
        <span style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>
          {pendingCount > 0 ? `${pendingCount} selected` : "Select leads to add"}
        </span>
        <button
          type="button"
          onClick={addSelected}
          disabled={pendingCount === 0 || adding}
          style={{
            padding: "7px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: pendingCount > 0 ? "var(--g-green-dark)" : "var(--g-gray-100)",
            color: pendingCount > 0 ? "#fff" : "var(--g-gray-500)",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: pendingCount > 0 && !adding ? "pointer" : "default",
          }}
        >
          {adding ? "Adding…" : `Add to leads${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
