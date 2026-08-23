"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { CrosshairIcon, SearchIcon, FilterIcon, LockIcon, CheckIcon, ArrowRightIcon } from "@/components/icons";

type Lead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  has_website: boolean | null;
};

const CATEGORIES = [
  "Barbershop",
  "Hair salon",
  "Nail salon",
  "Spa",
  "Plumbing",
  "Electrician",
  "Landscaping",
  "Roofing",
]; // confirmed live from Pindrop's own filter panel

function maskName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const head = first.slice(0, 3);
  return `${head}${"•".repeat(Math.max(3, first.length - 3))}`;
}

export default function HomePage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  const [leads, setLeads] = useState<Lead[]>([]);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [searching, setSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapDivRef.current || mapRef.current) return;
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: { lat: 28.4595, lng: 77.0266 },
        zoom: 14,
        mapId: "GIGZMAN_HOME_MAP",
        disableDefaultUI: true,
        zoomControl: false,
      });
    });
  }, []);

  async function refreshLeads() {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads ?? []);
  }

  useEffect(() => {
    refreshLeads();
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps?.marker) return;

    const visible =
      noWebsiteOnly || activeCategory
        ? leads.filter(
            (l) =>
              (!noWebsiteOnly || l.has_website === false) &&
              (!activeCategory || l.category?.toLowerCase() === activeCategory.toLowerCase())
          )
        : leads;

    for (const lead of leads) {
      const marker = markersRef.current.get(lead.id);
      const shouldShow = visible.includes(lead);
      if (marker) marker.map = shouldShow ? mapRef.current : null;
    }

    for (const lead of visible) {
      if (lead.lat == null || lead.lng == null) continue;
      if (markersRef.current.has(lead.id)) continue;

      const color = lead.has_website === null ? "#c7cad1" : lead.has_website ? "#3aa65c" : "#fdba3f";
      const pin = new google.maps.marker.PinElement({ background: color, borderColor: color, glyphColor: color });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: lead.lat, lng: lead.lng },
        content: pin.element,
        title: lead.business_name,
      });
      marker.addListener("click", () => setSelectedLead(lead));
      markersRef.current.set(lead.id, marker);
    }
  }, [leads, noWebsiteOnly, activeCategory]);

  async function handleFind() {
    if (!area.trim()) return;
    setSearching(true);
    try {
      await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, category }),
      });
      await refreshLeads();
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

      {/* Top toolbar */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <ToolbarButton>
          <CrosshairIcon />
        </ToolbarButton>
        <ToolbarButton>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)" }}>?</span>
        </ToolbarButton>

        <div
          style={{
            flex: 1,
            background: "var(--g-white)",
            borderRadius: "var(--radius-pill)",
            boxShadow: "var(--shadow-toolbar)",
            display: "flex",
            alignItems: "center",
            padding: "0 6px 0 16px",
            height: 44,
          }}
        >
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFind()}
            placeholder="Search a business, address, or city"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, color: "var(--g-ink)", background: "transparent" }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 12, color: "var(--g-gray-500)", background: "transparent", marginRight: 4 }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <ToolbarButton onClick={handleFind}>
          <SearchIcon />
        </ToolbarButton>

        <div style={{ position: "relative" }}>
          <ToolbarButton onClick={() => setFilterOpen((v) => !v)} active={filterOpen}>
            <FilterIcon />
          </ToolbarButton>

          {filterOpen && (
            <div
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                width: 220,
                background: "var(--g-white)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
                padding: "8px 0",
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              <FilterRow
                label="No website only"
                checked={noWebsiteOnly}
                onClick={() => setNoWebsiteOnly((v) => !v)}
              />
              <div style={{ height: 1, background: "var(--g-border)", margin: "4px 0" }} />
              <FilterRow
                label="All businesses"
                checked={!activeCategory}
                bold
                onClick={() => setActiveCategory(null)}
              />
              {CATEGORIES.map((c) => (
                <FilterRow key={c} label={c} checked={activeCategory === c} onClick={() => setActiveCategory(c)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credits badge */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: -0,
          display: "none",
        }}
      />

      {/* Pin popup card */}
      {selectedLead && (
        <div
          style={{
            position: "absolute",
            top: 76,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            background: "linear-gradient(180deg, #fffaf0, var(--g-amber-tint))",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedLead(null)}
            style={{ position: "absolute", top: 12, right: 12, border: "none", background: "none", cursor: "pointer", color: "var(--g-gray-500)", fontSize: 14 }}
          >
            ✕
          </button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)" }}>
            {selectedLead.has_website === false ? maskName(selectedLead.business_name) : selectedLead.business_name}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", marginTop: 2 }}>
            {selectedLead.category ?? "Business"}
          </div>

          {selectedLead.has_website === false && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#b45309" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--g-amber-core)" }} />
                No website found
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ paddingTop: 2 }}>
                  <LockIcon />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", margin: 0, lineHeight: 1.4 }}>
                  A prime lead with no website. Unlock full details in the LMS.
                </p>
              </div>
              <a
                href="/lms"
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--g-green)",
                  color: "#fff",
                  borderRadius: "var(--radius-pill)",
                  padding: "11px 0",
                  fontSize: 13.5,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Manage in LMS <ArrowRightIcon />
              </a>
            </>
          )}
          {selectedLead.has_website === true && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--g-gray-500)" }}>
              This business already has a website.
            </div>
          )}
          {selectedLead.has_website === null && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--g-gray-500)" }}>Checking…</div>
          )}
        </div>
      )}

      {searching && (
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--g-ink)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          Searching this area…
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: active ? "var(--g-green)" : "var(--g-white)",
        boxShadow: "var(--shadow-toolbar)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  checked,
  onClick,
  bold,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 13.5,
        fontWeight: bold || checked ? 700 : 500,
        color: checked ? "var(--g-green)" : "var(--g-ink)",
        textAlign: "left",
      }}
    >
      {label}
      {checked && <CheckIcon />}
    </button>
  );
}
