"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "@/components/icons";
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
  const [filter, setFilter] = useState<"all" | "no_website">("no_website");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  async function load() {
    const qs = filter === "no_website" ? "?has_website=false" : "";
    const res = await fetch(`/api/leads${qs}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }

  useEffect(() => {
    load();
  }, [filter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function unlockOne(id: string) {
    await fetch(`/api/leads/${id}/unlock`, { method: "POST" });
    setUnlocked((prev) => new Set(prev).add(id));
  }

  async function unlockBulk() {
    if (selected.size === 0) return;
    await fetch("/api/leads/unlock-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setUnlocked((prev) => new Set([...prev, ...selected]));
    setSelected(new Set());
  }

  return (
    <div style={{ padding: "28px 20px 120px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>LMS</h1>
        <CreditsIndicator />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
        <Pill active={filter === "no_website"} onClick={() => setFilter("no_website")}>
          No website only
        </Pill>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>
          All businesses
        </Pill>

        {selected.size > 0 && (
          <button
            type="button"
            onClick={unlockBulk}
            style={{
              marginLeft: "auto",
              borderRadius: "var(--radius-pill)",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              background: "var(--g-amber)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Unlock {selected.size} selected
          </button>
        )}
      </div>

      {leads.length === 0 && (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: 0 }}>
            No leads yet. Go to Home and find leads in an area first.
          </p>
        </div>
      )}

      <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {leads.map((lead, i) => {
          const isUnlocked = unlocked.has(lead.id);
          return (
            <div
              key={lead.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                borderBottom: i === leads.length - 1 ? "none" : "1px solid var(--g-border)",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleSelect(lead.id)}
                style={{ marginTop: 4, accentColor: "var(--g-green)" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>{lead.business_name}</span>
                  <StatusPill hasWebsite={lead.has_website} />
                </div>
                <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>
                  {lead.category} · {lead.address}
                </div>
                <div style={{ fontSize: 12, color: "var(--g-ink-soft)", marginTop: 2 }}>
                  {lead.phone ?? "No phone found"}
                  {lead.email ? ` · ${lead.email}` : ""}
                </div>
                {isUnlocked && (
                  <div style={{ fontSize: 11, color: "var(--g-green-text)", marginTop: 6, fontWeight: 600 }}>
                    Enrichment unlocked — social/ad-spend/tech-stack data source not wired yet
                  </div>
                )}
              </div>
              {!isUnlocked && (
                <button
                  type="button"
                  onClick={() => unlockOne(lead.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "1px solid var(--g-amber)",
                    color: "#b45309",
                    background: "var(--g-amber-tint-2)",
                    borderRadius: "var(--radius-pill)",
                    padding: "5px 10px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <LockIcon /> Premium
                </button>
              )}
            </div>
          );
        })}
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
