"use client";

import { useEffect, useState } from "react";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DownloadIcon } from "@/components/icons";
import { SECTION_NAMES, formatCategory } from "@/lib/categories";
import { LeadsTable, type Lead } from "@/components/leads/LeadsTable";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [websiteFilter, setWebsiteFilter] = useState<"all" | "no_website">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Lead | null>(null);

  async function load() {
    const qs = new URLSearchParams({ unlocked: "true" });
    if (websiteFilter === "no_website") qs.set("has_website", "false");
    if (categoryFilter) qs.set("category", categoryFilter);
    const res = await fetch(`/api/leads?${qs.toString()}`);
    const data = await res.json();
    const rows = (data.leads ?? []) as Lead[];
    setLeads(rows);
    // Keep the detail panel in sync with the freshest row data (e.g. right after an unlock).
    setActive((prev) => (prev ? rows.find((r) => r.id === prev.id) ?? prev : null));
  }

  /** Queue a lead for background enrichment. The work continues server-side on the cron tick
   *  whether or not this page stays open, so this only has to fire the request and reflect the
   *  queued state. */
  async function enrich(lead: Lead) {
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, enrichment_status: "pending" } : l))
    );
    await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" }).catch(() => null);
    load();
  }

  useEffect(() => {
    load();
    // "Add to leads" happens on the Home map or in Chat, not here — refresh when credits change
    // so a just-added lead shows up without needing a manual reload.
    const onCreditsChanged = () => load();
    window.addEventListener("gigzman:credits-changed", onCreditsChanged);
    return () => window.removeEventListener("gigzman:credits-changed", onCreditsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteFilter, categoryFilter]);

  // While anything is queued, tick the jobs forward and re-read the list so finished ones appear
  // on their own. The tick advances every job this user has queued, not just whichever row is on
  // screen, so the queue keeps moving while this page is open regardless of what's being looked at.
  const anyQueued = leads.some(
    (l) => l.enrichment_status === "pending" || l.enrichment_status === "starting_instance" || l.enrichment_status === "scraping"
  );
  useEffect(() => {
    if (!anyQueued) return;
    const tick = async () => {
      await fetch("/api/leads/enrich-tick", { method: "POST" }).catch(() => null);
      load();
    };
    void tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyQueued]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const allSelected = leads.length > 0 && leads.every((l) => prev.has(l.id));
      return allSelected ? new Set() : new Set(leads.map((l) => l.id));
    });
  }

  function exportSelected() {
    const rows = leads.filter((l) => selected.has(l.id));
    if (rows.length === 0) return;

    const headers = [
      "Business", "Category", "Address", "Phone", "Email", "Rating", "Reviews", "Has Website",
      "Score", "Website", "Description", "Services", "Price Level", "Business Status", "Opening Hours",
    ];
    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      headers.join(","),
      ...rows.map((l) =>
        [
          l.business_name,
          formatCategory(l.category) ?? "",
          l.address ?? "",
          l.phone ?? "",
          l.email ?? "",
          l.rating?.toFixed(1) ?? "",
          String(l.review_count ?? ""),
          l.has_website ? "Yes" : "No",
          String(l.heat_score ?? ""),
          l.enrichment_website_url ?? "",
          l.enrichment_description ?? "",
          (l.enrichment_services ?? []).join("; "),
          l.enrichment_price_level ?? "",
          l.enrichment_business_status ?? "",
          (l.enrichment_open_hours?.weekdayDescriptions ?? []).join("; "),
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "28px 24px 60px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>Leads</h1>
        <CreditsIndicator />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Pill active={websiteFilter === "all"} onClick={() => setWebsiteFilter("all")}>
          All added leads
        </Pill>
        <Pill active={websiteFilter === "no_website"} onClick={() => setWebsiteFilter("no_website")}>
          No website only
        </Pill>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--g-border)",
            background: "var(--g-white)",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--g-ink)",
            cursor: "pointer",
          }}
        >
          <option value="">All categories</option>
          {SECTION_NAMES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>
          {selected.size > 0 ? `${selected.size} selected` : `${leads.length} leads`}
        </span>
        <button type="button" onClick={exportSelected} disabled={selected.size === 0} style={exportBtn(selected.size > 0)}>
          <DownloadIcon size={14} color={selected.size > 0 ? "#fff" : "var(--g-gray-500)"} />
          Export
        </button>
      </div>

      {leads.length === 0 ? (
        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: 0 }}>
            No leads added yet. Go to Home or Chat and add one to your leads.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }} className="leads-split">
          <LeadsTable
            leads={leads}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            activeId={active?.id ?? null}
            onActivate={setActive}
            onEnrich={enrich}
          />
          <LeadDetailPanel lead={active} onUnlocked={load} />
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

function exportBtn(enabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: enabled ? "var(--g-green-dark)" : "var(--g-gray-100)",
    color: enabled ? "#fff" : "var(--g-gray-500)",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default",
  };
}
