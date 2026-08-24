"use client";

import { useEffect, useState } from "react";
import { CreditsIndicator } from "@/components/CreditsIndicator";

type Lead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  has_website: boolean | null;
  contacted: boolean;
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
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>LMS</h1>
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
            No leads added yet. Go to Home, tap a pin, and add it to your leads.
          </p>
        </div>
      )}

      <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {leads.map((lead, i) => (
          <div
            key={lead.id}
            style={{
              padding: "14px 16px",
              borderBottom: i === leads.length - 1 ? "none" : "1px solid var(--g-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>{lead.business_name}</span>
              <StatusPill hasWebsite={lead.has_website} />
            </div>
            <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>
              {lead.category} · {lead.address ?? "No address found"}
            </div>
            <div style={{ fontSize: 12, color: "var(--g-ink-soft)", marginTop: 2 }}>
              {lead.phone ?? "No phone found"}
              {lead.email ? ` · ${lead.email}` : ""}
            </div>
          </div>
        ))}
      </div>
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
