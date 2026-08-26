"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { createPinOverlayClass, MAP_STYLES, type PinOverlayInstance } from "@/lib/pin-overlay";
import { SECTION_NAMES, SEARCH_ORDER, TYPE_TO_SECTION } from "@/lib/categories";
import { CrosshairIcon, SearchIcon, FilterIcon, LockIcon, CheckIcon, ArrowRightIcon, BellIcon, XIcon } from "@/components/icons";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { HeatGauge } from "@/components/HeatGauge";

type Lead = {
  id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  has_website: boolean | null;
  is_competitor: boolean;
  is_unlocked: boolean;
  heat_score: number | null;
};

const SEARCH_CATEGORIES = ["All categories", ...SECTION_NAMES];

// DLF Cyber City, Gurugram — default center when location access isn't granted, zoomed in to
// match Pindrop's own default (building-level, not a whole-city view).
const DEFAULT_CENTER = { lat: 28.495, lng: 77.089 };
const DEFAULT_ZOOM = 17;

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
  // Since has_website now resolves in the same call that discovers a business (see the
  // find/route.ts merge), there's no more real "found it, still checking" gap to show a grey
  // pin during — so instead of reverting that cost cut, the perceived-activity signal moves to
  // the frontend: which category is actually being searched right now, and a set of randomly
  // placed decorative grey pulsing dots that stand in for "still looking" until the first real
  // result of this search lands, at which point they fade out.
  const [currentSearchingSection, setCurrentSearchingSection] = useState<string | null>(null);
  const [foundAnyThisSearch, setFoundAnyThisSearch] = useState(true);
  const [decorativeDots, setDecorativeDots] = useState<Array<{ id: number; top: string; left: string }>>([]);
  const [zoomTooLow, setZoomTooLow] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  // Visual placeholder only — establishes the target layout ahead of the real chat/LLM
  // integration (a later phase). Submitting just surfaces a message, no backend call.
  const [chatDraft, setChatDraft] = useState("");
  const [chatComingSoon, setChatComingSoon] = useState(false);
  const [locating, setLocating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // Derived (see below), not its own state — a separately-held Lead snapshot would go stale the
  // moment refreshLeads() updates the underlying data (has_website resolving, is_unlocked
  // flipping after "Add to leads"), so the open card always reads through to current `leads`.
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  // The hovered/clicked pin's own screen pixel position (from PinOverlay.getScreenPosition()),
  // so the popup card renders directly above THAT pin instead of a fixed spot on screen.
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [addingLead, setAddingLead] = useState(false);
  // Lets the card survive the gap between leaving the pin and entering the card itself (hover
  // intent) — mouseleave on the pin schedules a hide, cancelled if the card is entered in time.
  const hideCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref mirrors of state that the map's `idle` listener needs to read — the listener is attached
  // once at map creation, so it would otherwise only ever see the state values from that first
  // render (a classic stale-closure trap).
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);
  const areaRef = useRef(area);
  useEffect(() => {
    areaRef.current = area;
  }, [area]);

  const lastAutoSearchRef = useRef(0);
  // Incremented on every handleFind call — a run checks this against the value it captured at
  // start and bails the moment it's no longer current, instead of a flat in-flight block. A pan to
  // a new area (or the real-location search resolving after an initial default-center race) must
  // immediately take over from whatever search was previously running, not queue behind it or get
  // silently blocked by it — matching "jaise jaise drag karta hoon, grids badhti jaati hain,
  // fetching hoti hai": the currently visible area always wins. Nothing already found is lost when
  // a run is cancelled mid-sweep — area_type_scans persists exactly which grid cells are still
  // pending, so revisiting that area later resumes instead of restarting.
  const searchGenerationRef = useRef(0);
  // The map's very first `idle` event fires the instant it finishes loading at DEFAULT_CENTER —
  // before the location modal is even answered. Without this gate, that fired a full wasted
  // "All categories" search loop against a throwaway location, then a second real one once
  // geolocation actually resolved a few seconds later (looked like a double-fire bug, but was
  // really two genuinely separate full loops).
  const initialLocationDecidedRef = useRef(false);
  // Declining location still calls setCenter(DEFAULT_CENTER)/setZoom to lay out the map, and that
  // programmatic move fires its own `idle` event just like a real user pan would — without this,
  // every user who declines location got an automatic, unrequested "All categories" sweep against
  // DLF Cyber City with zero interaction on their part (confirmed live: 10+ requests before any
  // drag). Set right before that one setCenter call, consumed by the very next idle event only —
  // every idle after that is a real pan/zoom and should auto-search normally.
  const suppressNextIdleSearchRef = useRef(false);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapDivRef.current || mapRef.current) return;
      PinOverlayClassRef.current = createPinOverlayClass();
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        // Dark, clean, no default POI icons — the only look now (no light/3D toggle). mapId is
        // deliberately not used: it would enable 3D, but Google Maps ignores inline `styles`
        // (this dark/no-POI theme) on any mapId-based map, and a clean map showing only our own
        // pins mattered more than 3D once that tradeoff was made explicit.
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        styles: MAP_STYLES,
      });
      setMapReady(true);

      // Drives the zoom-dependent pin cap (see the pin-rendering effect) — re-caps immediately on
      // zoom rather than waiting for the next search to complete and refresh `leads`.
      mapRef.current.addListener("zoom_changed", () => {
        setMapZoom(mapRef.current?.getZoom() ?? DEFAULT_ZOOM);
      });

      // Auto-search whenever the user finishes panning/zooming — matches Pindrop's actual
      // behavior (search the CURRENT visible area, not just the original pinned location).
      // `idle` fires once movement settles, not continuously during a drag, so this is already
      // naturally debounced by Google Maps itself. Safe to call this liberally because the
      // discovery route caches per area+category — repeat visits to the same spot reuse the
      // cache instead of re-paying Places API every time the map settles.
      mapRef.current.addListener("idle", () => {
        if (!initialLocationDecidedRef.current) return; // still waiting on the location modal/geolocation
        if (suppressNextIdleSearchRef.current) {
          suppressNextIdleSearchRef.current = false;
          return;
        }
        const now = Date.now();
        if (now - lastAutoSearchRef.current < 1500) return; // guards against rapid double-fires
        lastAutoSearchRef.current = now;
        void handleFind({ fromMapMove: true });
      });

      // If the location prompt was already resolved on a prior visit, don't show it again —
      // just silently re-attempt geolocation (browsers never re-prompt for permission once
      // granted or denied, so this is invisible either way) and re-center/search there.
      if (localStorage.getItem("gigzman_location_resolved") === "true" && navigator.geolocation) {
        initialLocationDecidedRef.current = true;
        centerOnRealLocationAndSearch();
      }
    });

    // Navigating away (Home -> LMS/Profile) unmounts this page, but a still-running discovery
    // loop is a plain async function with no idea the component is gone — it would keep firing
    // /api/leads/find requests into the void. Bumping the generation here makes the loop's own
    // "am I still the current search?" check (see handleFind) fail on its next iteration, so it
    // stops issuing new requests instead of continuing to burn API calls for a screen nobody is
    // looking at anymore.
    return () => {
      searchGenerationRef.current++;
    };
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
        // Geolocation failed/denied at the browser level (e.g. a returning user whose permission
        // was revoked) — same as declining in the modal, this falls back to DEFAULT_CENTER and
        // must not auto-search a location nobody asked to see results for.
        suppressNextIdleSearchRef.current = true;
        mapRef.current?.setCenter(DEFAULT_CENTER);
        mapRef.current?.setZoom(DEFAULT_ZOOM);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function resolveInitialLocation(useReal: boolean) {
    localStorage.setItem("gigzman_location_resolved", "true");
    setShowLocationModal(false);
    initialLocationDecidedRef.current = true;
    if (!useReal || !navigator.geolocation) {
      // No real location — nothing to auto-search around yet, wait for the user to actually pan
      // or search. The setCenter below still fires its own `idle` event though, which must not
      // be mistaken for a real pan (see suppressNextIdleSearchRef).
      suppressNextIdleSearchRef.current = true;
      mapRef.current?.setCenter(DEFAULT_CENTER);
      mapRef.current?.setZoom(DEFAULT_ZOOM);
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

  const selectedLead = selectedLeadId ? (leads.find((l) => l.id === selectedLeadId) ?? null) : null;

  function showLeadCard(lead: Lead, overlay: PinOverlayInstance) {
    if (hideCardTimeoutRef.current) {
      clearTimeout(hideCardTimeoutRef.current);
      hideCardTimeoutRef.current = null;
    }
    setSelectedLeadId(lead.id);
    setCardPosition(overlay.getScreenPosition());
  }

  function scheduleHideCard() {
    hideCardTimeoutRef.current = setTimeout(() => {
      setSelectedLeadId(null);
      setCardPosition(null);
    }, 250);
  }

  function cancelHideCard() {
    if (hideCardTimeoutRef.current) {
      clearTimeout(hideCardTimeoutRef.current);
      hideCardTimeoutRef.current = null;
    }
  }

  async function handleAddToLeads(lead: Lead) {
    setAddingLead(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/unlock`, { method: "POST" });
      if (res.status === 402) {
        window.dispatchEvent(new Event("gigzman:open-plans"));
        return;
      }
      const data = (await res.json()) as { unlocked?: boolean };
      if (data.unlocked) {
        window.dispatchEvent(new Event("gigzman:credits-changed"));
        await refreshLeads();
      }
    } finally {
      setAddingLead(false);
    }
  }

  useEffect(() => {
    if (!mapReady || !mapRef.current || !PinOverlayClassRef.current) return;
    const PinOverlay = PinOverlayClassRef.current;

    const filtered =
      noWebsiteOnly || activeCategory
        ? leads.filter(
            (l) =>
              (!noWebsiteOnly || l.has_website === false) &&
              (!activeCategory || (l.category && TYPE_TO_SECTION[l.category] === activeCategory))
          )
        : leads;

    // Dense categories can return 1,000+ real matches in one radius (confirmed via a live audit)
    // — rendering all of them at a zoomed-out view is an unreadable wall of pins. Cap how many
    // render based on zoom, keeping the highest-scored (or competitor) ones when capped; zooming
    // into a specific area raises the cap since there's less on screen to begin with.
    const PIN_CAP_BY_ZOOM: Array<[minZoom: number, cap: number]> = [
      [17, Infinity],
      [15, 150],
      [13, 60],
    ];
    const cap = PIN_CAP_BY_ZOOM.find(([minZoom]) => mapZoom >= minZoom)?.[1] ?? 40;
    const visible =
      filtered.length <= cap
        ? filtered
        : [...filtered]
            .sort((a, b) => {
              if (a.is_competitor !== b.is_competitor) return a.is_competitor ? -1 : 1;
              return (b.heat_score ?? 0) - (a.heat_score ?? 0);
            })
            .slice(0, cap);
    const visibleIds = new Set(visible.map((l) => l.id));

    for (const [id, overlay] of markersRef.current) {
      if (!visibleIds.has(id)) {
        overlay.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const lead of visible) {
      if (lead.lat == null || lead.lng == null) continue;

      // Competitors (web/app/software dev shops) are never leads — flagged red with a danger
      // glyph instead of going through the grey/green/amber has_website flow at all.
      const color = lead.is_competitor
        ? "#dc2626"
        : lead.has_website === null
          ? "#c7cad1"
          : lead.has_website
            ? "#3aa65c"
            : "#fdba3f";
      const pulsing = !lead.is_competitor && lead.has_website === null;
      const glow = !pulsing; // resolved pins (green/amber/red) glow, like Pindrop's; checking ones just pulse
      const glyph = lead.is_competitor ? "!" : undefined;

      const existing = markersRef.current.get(lead.id);
      if (existing) {
        existing.setColor(color, pulsing, glow);
        continue;
      }

      const overlay: PinOverlayInstance = new PinOverlay(
        { lat: lead.lat, lng: lead.lng },
        color,
        pulsing,
        () => showLeadCard(lead, overlay),
        glow,
        glyph,
        () => showLeadCard(lead, overlay),
        () => scheduleHideCard()
      );
      overlay.setMap(mapRef.current);
      markersRef.current.set(lead.id, overlay);
    }
  }, [leads, noWebsiteOnly, activeCategory, mapReady, mapZoom]);

  /** Finds businesses in the CURRENT MAP VIEWPORT (center + radius derived from visible
   * bounds) — matching Pindrop's actual "search this area, this zoomed in" behavior. Called
   * both on explicit search and automatically whenever the map's `idle` event fires (see the
   * mount effect). `fromMapMove` skips the address-geocoding step (there's nothing typed to
   * geocode when the trigger was a pan/zoom, not a search-box submit) and reads category/area
   * from refs instead of closed-over state, since the idle listener is attached once at mount. */
  async function handleFind(opts?: { fromMapMove?: boolean }) {
    if (!mapRef.current) return;
    const myGeneration = ++searchGenerationRef.current;
    setSearching(true);
    try {
      const currentArea = opts?.fromMapMove ? "" : areaRef.current;
      if (currentArea.trim()) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(currentArea)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const geoData = await geoRes.json();
        const loc = geoData.results?.[0]?.geometry?.location;
        if (loc) {
          mapRef.current.setCenter({ lat: loc.lat, lng: loc.lng });
          mapRef.current.setZoom(DEFAULT_ZOOM);
        }
      }

      // City/state/country-scale zoom levels must not silently keep fetching just because the
      // user panned while zoomed out that far — the radius clamp below already stops a single
      // request from scanning a huge area, but at low zoom the visible viewport itself covers so
      // much ground that even a repeatedly-reused small circle per pan adds up to scanning the
      // whole region over time. Below this zoom, discovery just doesn't fire at all.
      const ZOOM_FLOOR = 13;
      const currentZoom = mapRef.current.getZoom() ?? DEFAULT_ZOOM;
      if (currentZoom < ZOOM_FLOOR) {
        setZoomTooLow(true);
        return;
      }
      setZoomTooLow(false);

      const center = mapRef.current.getCenter();
      const bounds = mapRef.current.getBounds();
      if (!center || !bounds) return;

      // Nearby Search only accepts a circle, never a rectangle — using distance-to-corner (the
      // previous approach) draws a circle that CIRCUMSCRIBES the visible viewport, so it always
      // fetches real area beyond the screen edges too (wasted Places API calls for places the
      // user can't even see yet). Using half the SHORTER visible dimension instead draws a
      // circle inscribed within the viewport — it may miss a sliver near the far corners, but
      // never fetches off-screen area, which is the actual complaint this fixes.
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const { spherical } = google.maps.geometry;
      const heightMeters = spherical.computeDistanceBetween(
        new google.maps.LatLng(sw.lat(), center.lng()),
        new google.maps.LatLng(ne.lat(), center.lng())
      );
      const widthMeters = spherical.computeDistanceBetween(
        new google.maps.LatLng(center.lat(), sw.lng()),
        new google.maps.LatLng(center.lat(), ne.lng())
      );
      // At the default zoom (18, building-level) the viewport-matched radius is only ~200-300m —
      // far too tight to reach genuinely nearby but sparser categories (entertainment venues,
      // real estate agencies) that a normal Google Maps user would still call "nearby". A floor
      // keeps zooming in for pin density from also silently shrinking the search net to nothing.
      const MIN_SEARCH_RADIUS_METERS = 1200;
      // MAX mirrors the server-side clamp in /api/leads/find — panning/zooming out must not
      // balloon the scanned area toward city/state/country scale, it stays bounded to roughly a
      // "default zoom" neighborhood regardless of viewport size.
      const MAX_SEARCH_RADIUS_METERS = 3000;
      const radius = Math.min(
        Math.max(Math.min(heightMeters, widthMeters) / 2, MIN_SEARCH_RADIUS_METERS),
        MAX_SEARCH_RADIUS_METERS
      );

      const sectionsToRun = categoryRef.current === "All categories" ? SEARCH_ORDER : [categoryRef.current];

      // Fresh decorative "still looking" dots for this search — random screen positions within
      // the current viewport, purely cosmetic (not real business locations). They disappear the
      // moment the first real result of this search lands (see foundAnyThisSearch below).
      setFoundAnyThisSearch(false);
      setDecorativeDots(
        Array.from({ length: 10 }, (_, i) => ({
          id: i,
          top: `${15 + Math.random() * 55}%`,
          left: `${8 + Math.random() * 78}%`,
        }))
      );

      // Each request now does exactly one grid cell's worth of discovery per type-batch (see
      // /api/leads/find) and reports `hasMore` — so a section is drained in a tight loop of small,
      // fast requests instead of one long call that silently does a whole section's grid search
      // before the frontend hears back. has_website is set directly from the Nearby Search
      // response now (see /api/leads/find) — pins render already resolved (green/amber), no
      // separate enrichment pass, no per-lead API cost.
      for (const section of sectionsToRun) {
        setCurrentSearchingSection(section);
        let hasMore = true;
        while (hasMore) {
          // A newer handleFind (a pan, or the real-location search finally resolving) has taken
          // over — stop working toward this now-stale area immediately rather than finishing it.
          if (searchGenerationRef.current !== myGeneration) return;

          const res = await fetch("/api/leads/find", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: center.lat(), lng: center.lng(), radius, category: section }),
          });
          const data = (await res.json()) as { found?: number; hasMore?: boolean };
          hasMore = data.hasMore ?? false;
          if ((data.found ?? 0) > 0) setFoundAnyThisSearch(true);
          await refreshLeads();
        }
      }
    } finally {
      // Only the run that's still current should clear the indicator — an older, superseded run
      // finishing its early-return must not hide "Finding businesses..." out from under whatever
      // newer search took over.
      if (searchGenerationRef.current === myGeneration) {
        setSearching(false);
        setCurrentSearchingSection(null);
        setFoundAnyThisSearch(true);
      }
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
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--g-ink)", margin: "0 0 8px" }}>
              Find businesses in your area
            </h2>
            <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px", lineHeight: 1.4 }}>
              Mantis uses your location to show the businesses near you that still need a
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

      {/* Top bar — one row: locate + search + filters on the left, bell + credits on the
          right, matching the target layout's single unified top bar instead of two
          separately-positioned pieces. Every control's underlying state/handler is
          unchanged — this is a chrome-only restyle. */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1, maxWidth: 620 }}>
          <ToolbarButton onClick={handleLocateMe} active={locating}>
            <CrosshairIcon />
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

          <ToolbarButton onClick={() => handleFind()}>
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
                {SECTION_NAMES.map((c) => (
                  <FilterRow key={c} label={c} checked={activeCategory === c} onClick={() => setActiveCategory(c)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          {/* Non-functional placeholder — no notification system exists yet */}
          <ToolbarButton>
            <BellIcon />
          </ToolbarButton>
          <CreditsIndicator />
        </div>
      </div>

      {/* Pin popup card — positioned directly above the hovered/clicked pin's own screen
          position (see PinOverlay.getScreenPosition()), not a fixed spot on screen. The
          translate(-100%) on Y is percentage-of-own-height, so it sits correctly above the pin
          regardless of the card's actual rendered height (varies by state/content). Clamped so
          it can't render above the toolbar near the top edge. */}
      {selectedLead && cardPosition && (
        <div
          onMouseEnter={cancelHideCard}
          onMouseLeave={scheduleHideCard}
          style={{
            position: "absolute",
            left: cardPosition.x,
            top: Math.max(cardPosition.y, 220),
            transform: "translate(-50%, calc(-100% - 16px))",
            width: 300,
            background: "linear-gradient(180deg, #fffaf0, var(--g-amber-tint))",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: 20,
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              cancelHideCard();
              setSelectedLeadId(null);
              setCardPosition(null);
            }}
            style={{ position: "absolute", top: 12, right: 12, border: "none", background: "none", cursor: "pointer", display: "flex" }}
          >
            <XIcon />
          </button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)" }}>{selectedLead.business_name}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", marginTop: 2 }}>
            {selectedLead.category ?? "Business"}
          </div>

          {selectedLead.is_competitor && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#dc2626" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
              Competitor — not a lead
            </div>
          )}

          {!selectedLead.is_competitor && selectedLead.is_unlocked && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)" }}>
                <CheckIcon /> Added to your leads
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--g-ink-soft)", lineHeight: 1.5 }}>
                {selectedLead.phone ?? "No phone found"}
                {selectedLead.email ? <><br />{selectedLead.email}</> : null}
                {selectedLead.address ? <><br />{selectedLead.address}</> : null}
              </div>
            </div>
          )}

          {!selectedLead.is_competitor && !selectedLead.is_unlocked && selectedLead.has_website === false && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: "#b45309" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--g-amber-core)" }} />
                No website found
              </div>
              {selectedLead.heat_score !== null && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
                  <HeatGauge score={selectedLead.heat_score} size={140} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ paddingTop: 2 }}>
                  <LockIcon />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", margin: 0, lineHeight: 1.4 }}>
                  A prime lead with no website. Add it to unlock full contact details.
                </p>
              </div>
              <button
                type="button"
                disabled={addingLead}
                onClick={() => handleAddToLeads(selectedLead)}
                style={{
                  marginTop: 14,
                  width: "100%",
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
                  border: "none",
                  cursor: addingLead ? "default" : "pointer",
                  opacity: addingLead ? 0.7 : 1,
                }}
              >
                {addingLead ? "Adding…" : "Add to leads"} <ArrowRightIcon />
              </button>
            </>
          )}
          {!selectedLead.is_competitor && !selectedLead.is_unlocked && selectedLead.has_website === true && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--g-gray-500)" }}>
              This business already has a website.
            </div>
          )}
          {!selectedLead.is_competitor && !selectedLead.is_unlocked && selectedLead.has_website === null && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--g-gray-500)" }}>Checking…</div>
          )}
        </div>
      )}

      {/* Decorative-only "still looking" dots — random screen positions, not real business
          locations. Since has_website now resolves in the same call that finds a business (see
          /api/leads/find), there's no genuine "found it, still checking" gap left to show a real
          grey pin during; this stands in for that activity instead, purely on the frontend, and
          fades out the instant a real result of this search lands. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: searching && !foundAnyThisSearch ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {decorativeDots.map((dot) => (
          <div
            key={dot.id}
            className="g-pin-pulse"
            style={{
              position: "absolute",
              top: dot.top,
              left: dot.left,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#c7cad1",
              border: "2px solid #fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            }}
          />
        ))}
      </div>

      {searching && (
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--g-green-mint)",
            color: "var(--g-green-text)",
            padding: "9px 18px",
            borderRadius: "var(--radius-pill)",
            fontSize: 12.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "var(--shadow-toolbar)",
          }}
        >
          <span
            className="g-pin-pulse"
            style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--g-green)", flexShrink: 0 }}
          />
          <TypewriterText
            text={`Finding businesses in ${currentSearchingSection ?? "this area"}…`}
          />
        </div>
      )}

      {zoomTooLow && !searching && (
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
          Zoom in to search this area
        </div>
      )}

      {/* Floating chat panel — visual placeholder for the future LLM/multi-service phase.
          Establishes the target layout now so later phases only need to wire in behavior. */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 560,
          padding: "0 16px",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!chatDraft.trim()) return;
            setChatComingSoon(true);
            setChatDraft("");
          }}
          style={{
            background: "var(--g-white)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: 14,
          }}
        >
          {chatComingSoon && (
            <div style={{ fontSize: 12, color: "var(--g-gray-500)", padding: "0 4px 10px" }}>
              Chat is coming soon — this will decide which sources to pull leads from.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Ask anything about leads, companies, or markets…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13.5, color: "var(--g-ink)", background: "transparent", padding: "6px 8px" }}
            />
            <button
              type="submit"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "var(--g-green)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ArrowRightIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Reveals `text` character-by-character whenever it changes — used for the "Finding businesses
 * in [category]…" status so switching categories reads as an active retype, not an abrupt swap. */
function TypewriterText({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{shown}</span>;
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
