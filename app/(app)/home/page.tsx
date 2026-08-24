"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { createPinOverlayClass, type PinOverlayInstance } from "@/lib/pin-overlay";
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

const SEARCH_CATEGORIES = ["All categories", ...CATEGORIES];

// DLF Cyber City, Gurugram — default center when location access isn't granted, zoomed in to
// match Pindrop's own default (building-level, not a whole-city view).
const DEFAULT_CENTER = { lat: 28.495, lng: 77.089 };
const DEFAULT_ZOOM = 18;

function maskName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const head = first.slice(0, 3);
  return `${head}${"•".repeat(Math.max(3, first.length - 3))}`;
}

export default function HomePage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, PinOverlayInstance>>(new Map());
  const youMarkerRef = useRef<PinOverlayInstance | null>(null);
  const PinOverlayClassRef = useRef<ReturnType<typeof createPinOverlayClass> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Only ask once per browser — was re-showing on every visit to /home (e.g. switching to LMS
  // and back), which felt broken rather than a one-time onboarding prompt. Starts true (same on
  // server and client, avoiding a hydration mismatch) and is corrected client-side in the effect
  // below — reading localStorage directly in useState's initializer caused exactly that mismatch
  // (server has no `window`, so it always disagreed with the client's real first render).
  const [showLocationModal, setShowLocationModal] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("gigzman_location_resolved") === "true") {
      setShowLocationModal(false);
    }
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState(SEARCH_CATEGORIES[0]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapDivRef.current || mapRef.current) return;
      PinOverlayClassRef.current = createPinOverlayClass();
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        tilt: 45,
        // Back on for the Pindrop-style 3D look — real tradeoff, same as before: mapId-based
        // vector/3D maps ignore inline `styles` entirely (that's a Google Maps platform rule,
        // not a bug), so the dark theme + hidden-POI styling from MAP_STYLES doesn't apply here
        // and default Google POI icons are back. Getting 3D AND dark/no-POI together needs a
        // real Map ID configured in Cloud Console (Maps Platform → Map Management → create
        // vector Map ID → Style editor → dark). Using the public demo ID until that exists.
        mapId: "DEMO_MAP_ID",
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      });
      setMapReady(true);

      // If the location prompt was already resolved on a prior visit, don't show it again —
      // just silently re-attempt geolocation (browsers never re-prompt for permission once
      // granted or denied, so this is invisible either way) and re-center/search there.
      if (localStorage.getItem("gigzman_location_resolved") === "true" && navigator.geolocation) {
        centerOnRealLocationAndSearch();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeYouMarker(lat: number, lng: number) {
    if (!mapRef.current || !PinOverlayClassRef.current) return;
    if (youMarkerRef.current) {
      youMarkerRef.current.setMap(null);
    }
    const PinOverlay = PinOverlayClassRef.current;
    const marker = new PinOverlay({ lat, lng }, "#2563eb", false, () => {});
    marker.setMap(mapRef.current);
    youMarkerRef.current = marker;
  }

  function handleLocateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(DEFAULT_ZOOM);
        placeYouMarker(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function centerOnRealLocationAndSearch() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(DEFAULT_ZOOM);
        placeYouMarker(pos.coords.latitude, pos.coords.longitude);
        // Real location granted — immediately search nearby instead of waiting for a manual
        // click, matching "agar person location deta hai to uski location ke nearby
        // businesses scrape marne hai".
        void handleFind();
      },
      () => {
        mapRef.current?.setCenter(DEFAULT_CENTER);
        mapRef.current?.setZoom(DEFAULT_ZOOM);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function resolveInitialLocation(useReal: boolean) {
    localStorage.setItem("gigzman_location_resolved", "true");
    setShowLocationModal(false);
    if (!useReal || !navigator.geolocation) {
      mapRef.current?.setCenter(DEFAULT_CENTER);
      mapRef.current?.setZoom(DEFAULT_ZOOM);
      // No real location — nothing to auto-search around yet, wait for an explicit search.
      return;
    }
    centerOnRealLocationAndSearch();
  }

  async function refreshLeads() {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads ?? []);
  }

  useEffect(() => {
    refreshLeads();
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !PinOverlayClassRef.current) return;
    const PinOverlay = PinOverlayClassRef.current;

    const visible =
      noWebsiteOnly || activeCategory
        ? leads.filter(
            (l) =>
              (!noWebsiteOnly || l.has_website === false) &&
              (!activeCategory || l.category?.toLowerCase() === activeCategory.toLowerCase())
          )
        : leads;
    const visibleIds = new Set(visible.map((l) => l.id));

    for (const [id, overlay] of markersRef.current) {
      if (!visibleIds.has(id)) {
        overlay.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const lead of visible) {
      if (lead.lat == null || lead.lng == null) continue;

      const color = lead.has_website === null ? "#c7cad1" : lead.has_website ? "#3aa65c" : "#fdba3f";
      const pulsing = lead.has_website === null;

      const existing = markersRef.current.get(lead.id);
      if (existing) {
        existing.setColor(color, pulsing);
        continue;
      }

      const overlay = new PinOverlay({ lat: lead.lat, lng: lead.lng }, color, pulsing, () => setSelectedLead(lead));
      overlay.setMap(mapRef.current);
      markersRef.current.set(lead.id, overlay);
    }
  }, [leads, noWebsiteOnly, activeCategory, mapReady]);

  /** Finds businesses in the CURRENT MAP VIEWPORT (center + radius derived from visible
   * bounds) — matching Pindrop's actual "search this area" behavior, not a typed address
   * query. If the search box has text, it's geocoded first to pan the map there, then the
   * viewport search runs against the new position. */
  async function handleFind() {
    if (!mapRef.current) return;
    setSearching(true);
    try {
      if (area.trim()) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(area)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const geoData = await geoRes.json();
        const loc = geoData.results?.[0]?.geometry?.location;
        if (loc) {
          mapRef.current.setCenter({ lat: loc.lat, lng: loc.lng });
          mapRef.current.setZoom(DEFAULT_ZOOM);
        }
      }

      const center = mapRef.current.getCenter();
      const bounds = mapRef.current.getBounds();
      if (!center || !bounds) return;

      const radius = google.maps.geometry.spherical.computeDistanceBetween(center, bounds.getNorthEast());

      const res = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: center.lat(), lng: center.lng(), radius, category }),
      });
      const data = (await res.json()) as { leads?: Array<{ id: string }> };
      await refreshLeads();

      // Resolve has_website one lead at a time (not all at once) so pins visibly flip from
      // grey to green/amber as each one resolves — the progressive-reveal effect that was
      // missing entirely while leads just sat grey forever with no enrichment path at all.
      for (const lead of data.leads ?? []) {
        await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" }).catch(() => {});
        await refreshLeads();
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

      {showLocationModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20,32,51,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: 340,
              background: "var(--g-white)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-card)",
              padding: 28,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--g-green-mint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CrosshairIcon />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 8px" }}>
              Find businesses in your area
            </h2>
            <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px", lineHeight: 1.4 }}>
              gigzman uses your location to show the businesses near you that still need a
              website.
            </p>
            <button
              type="button"
              onClick={() => resolveInitialLocation(true)}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: "var(--g-green)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              Use my location
            </button>
            <button
              type="button"
              onClick={() => resolveInitialLocation(false)}
              style={{ border: "none", background: "none", color: "var(--g-gray-500)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              Not now, I&apos;ll search by address
            </button>
          </div>
        </div>
      )}

      {/* Top toolbar */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <ToolbarButton onClick={handleLocateMe} active={locating}>
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
            style={{
              border: "1px solid var(--g-green)",
              outline: "none",
              fontSize: 12,
              fontWeight: 700,
              color: category === "All categories" ? "var(--g-green-text)" : "var(--g-ink)",
              background: "var(--g-green-mint)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 10px",
              marginRight: 4,
            }}
          >
            {SEARCH_CATEGORIES.map((c) => (
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
          Finding {category === "All categories" ? "businesses" : category.toLowerCase()} in this area…
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
