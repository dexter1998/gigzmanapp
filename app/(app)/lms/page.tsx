"use client";

import { useEffect, useState } from "react";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { HeatGauge } from "@/components/HeatGauge";
import { StarIcon } from "@/components/icons";
import { formatCategory } from "@/lib/categories";

type Lead = {
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
};

export default function LmsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"all" | "no_website">("all");

  async function load() {
    const qs = filter === "no_website" ? "&has_website=false" : "";
    const res = await fetch(`/api/leads?unlocked=true${qs}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }

  useEffect(() => {
    load();
    // "Add to leads" happens on the Home map, not here — refresh when it changes credits so a
    // just-added lead shows up without needing a manual reload.
    const onCreditsChanged = () => load();
    window.addEventListener("gigzman:credits-changed", onCreditsChanged);
    return () => window.removeEventListener("gigzman:credits-changed", onCreditsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div style={{ padding: "28px 20px 120px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>LMS</h1>
        <CreditsIndicator />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>
          All added leads
        </Pill>
        <Pill active={filter === "no_website"} onClick={() => setFilter("no_website")}>
          No website only
        </Pill>
      </div>

      {leads.length === 0 && (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: 0 }}>
            No leads added yet. Go to Home or Chat and add one to your leads.
          </p>
        </div>
      )}

      {leads.length > 0 && (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Business</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Category</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Contact</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Rating</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid var(--g-border)" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: "1px solid var(--g-border)" }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: "var(--radius-pill)",
        padding: "8px 16px",
        fontSize: 12.5,
        fontWeight: 700,
        border: active ? "none" : "1px solid var(--g-border)",
        background: active ? "var(--g-green)" : "var(--g-white)",
        color: active ? "#fff" : "var(--g-ink)",
        cursor: "pointer",
      }}
    >
      {children}
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
