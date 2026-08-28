"use client";

import { useState } from "react";
import { HeatGauge } from "@/components/HeatGauge";
import { CheckIcon } from "@/components/icons";

export type ChatLead = {
  id: string;
  business_name: string;
  category: string | null;
  has_website: boolean | null;
  heat_score: number | null;
  is_unlocked?: boolean;
};

/** Real table (not a compact list) for chat search results — selectable rows with a bulk
 * "Add to leads" action that calls the same /api/leads/[id]/unlock route the map's own
 * "Add to leads" button uses, so a lead added from chat shows up in the LMS exactly the
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)", width: 32 }}></th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Business</th>
              <th style={{ padding: "9px 10px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Category</th>
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
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>{lead.business_name}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--g-gray-500)" }}>{lead.category ?? "Business"}</td>
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
