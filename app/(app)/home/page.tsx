"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { createPinOverlayClass, MAP_STYLES, type PinOverlayInstance } from "@/lib/pin-overlay";
import { SECTION_NAMES, SEARCH_ORDER, TYPE_TO_SECTION, formatCategory } from "@/lib/categories";
import { CrosshairIcon, HelpIcon, FilterIcon, LockIcon, CheckIcon, ArrowRightIcon, BellIcon, XIcon, StarIcon, GlobeIcon, BuildingIcon } from "@/components/icons";
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
  rating: number | null;
  review_count: number | null;
};

const SEARCH_CATEGORIES = ["All categories", ...SECTION_NAMES];

// DLF Cyber City, Gurugram — default center when location access isn't granted, zoomed in to
// match Pindrop's own default (building-level, not a whole-city view).
const DEFAULT_CENTER = { lat: 28.495, lng: 77.089 };
const DEFAULT_ZOOM = 17;

// A fixed, absolutely-aligned grid — matches the backend's own cache-key rounding
// (area_type_scans keys on lat.toFixed(2)/lng.toFixed(2)) exactly, so a tile's snapped center
// always produces the identical cache key on every visit. Before this, the query center was
// whatever the live map center happened to be at that instant — confirmed live, three
// consecutive searches within meters of each other in Gurugram landed on three different cache
// keys (28.48_76.99, 28.49_77.00, 28.49_76.99), so "already-scanned" ground kept re-firing real
// Places API calls instead of hitting cache.
const GRID_STEP_DEG = 0.01;
// Covers one 0.01°-square tile (~1.1km per side near the equator) from its center with a little
// overlap into its neighbors, so tiles don't leave gaps between them.
const TILE_RADIUS_METERS = 800;
// Cost cap for a single search pass: at most the 4 tiles nearest to wherever the map is
// centered. A wide-zoomed, never-searched region only pays for its nearest ground on this pass —
// farther tiles fill in as the user pans/zooms closer, rather than one search silently paying
// for the whole visible region at once. (A 3x3/9-tile version was tried and reverted — it was
// meant to cut latency, but it only ever changes API cost/coverage, not how fast a single tile
// resolves, so it wasn't worth the ~2x worst-case cost.)
const MAX_TILES_PER_SEARCH = 4;

type SearchTile = { lat: number; lng: number };

/** The grid tiles nearest to `center`, snapped to the fixed absolute grid, nearest-first — so a
 * search fills in from wherever the user actually is outward, instead of surfacing whatever a
 * single big circle's first API page happened to return regardless of distance. */
function nearestSearchTiles(center: google.maps.LatLng, maxTiles: number): SearchTile[] {
  const snap = (v: number) => Math.round(v / GRID_STEP_DEG) * GRID_STEP_DEG;
  const centerLat = snap(center.lat());
  const centerLng = snap(center.lng());
  const candidates: SearchTile[] = [];
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      candidates.push({ lat: centerLat + dLat * GRID_STEP_DEG, lng: centerLng + dLng * GRID_STEP_DEG });
    }
  }
  const { spherical } = google.maps.geometry;
  return candidates
    .sort(
      (a, b) =>
        spherical.computeDistanceBetween(center, new google.maps.LatLng(a.lat, a.lng)) -
        spherical.computeDistanceBetween(center, new google.maps.LatLng(b.lat, b.lng))
    )
    .slice(0, maxTiles);
}

const DECORATIVE_DOT_COLOR = "#c7cad1";

/** A random point within `maxMeters` of `center` — used to scatter decorative "still looking"
 * dots around a tile being searched. Real lat/lng (not a screen position), so the dots ride the
 * map's own pan/zoom exactly like a real pin instead of visibly floating over it. */
function randomNearbyPoint(center: SearchTile, maxMeters: number): SearchTile {
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * maxMeters;
  const dLat = (dist * Math.cos(angle)) / 111320;
  const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

type Signal = { label: string; tone: "danger" | "warning" | "success" | "info" };

/** Short, honest chips summarizing why a lead is (or isn't) worth a credit — matches Pindrop's
 * own "Top Signals" row, but every chip here is derived from a real field this app actually
 * has (has_website/rating/review_count/heat_score), not invented activity we don't track (no
 * "Recent Enquiry"/"Social Active" — there's no data behind those). Capped at 3, most important
 * first, same as the reference. */
function topSignals(lead: Lead): Signal[] {
  const signals: Signal[] = [];
  if (lead.has_website === false) signals.push({ label: "No Website", tone: "danger" });
  else if (lead.has_website === true) signals.push({ label: "Website Found", tone: "success" });

  if (lead.heat_score !== null) {
    if (lead.heat_score >= 70) signals.push({ label: "High Potential", tone: "success" });
    else if (lead.heat_score < 35) signals.push({ label: "Low Potential", tone: "warning" });
  }

  if (lead.rating !== null) {
    if (lead.rating >= 4.5) signals.push({ label: "Excellent Rating", tone: "success" });
    else if (lead.rating >= 4) signals.push({ label: "High Rating", tone: "success" });
    else if (lead.rating < 3.5) signals.push({ label: "Low Rating", tone: "warning" });
  }

  if (lead.review_count !== null && lead.review_count >= 50) {
    signals.push({ label: "Well Reviewed", tone: "info" });
  }

  return signals.slice(0, 3);
}

const SIGNAL_TONE_COLORS: Record<Signal["tone"], { bg: string; text: string }> = {
  danger: { bg: "var(--g-amber-tint)", text: "#b45309" },
  warning: { bg: "var(--g-amber-tint-2)", text: "#b45309" },
  success: { bg: "var(--g-green-mint)", text: "var(--g-green-text)" },
  info: { bg: "var(--g-gray-100)", text: "var(--g-gray-500)" },
};

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
  const [category, setCategory] = useState(SEARCH_CATEGORIES[0]);
  const [searching, setSearching] = useState(false);
  // Since has_website now resolves in the same call that discovers a business (see the
  // find/route.ts merge), there's no more real "found it, still checking" gap to show a grey
  // pin during — so instead of reverting that cost cut, the perceived-activity signal moves to
  // the frontend: which category is actually being searched right now, and a set of randomly
  // placed decorative grey pulsing dots that stand in for "still looking" until the first real
  // result of this search lands, at which point they fade out.
  const [currentSearchingSection, setCurrentSearchingSection] = useState<string | null>(null);
  // Real map overlays (see PinOverlay), not a screen-position CSS layer — a fixed-to-viewport
  // overlay visibly detaches from the map during a pan/zoom (confirmed live: it stayed glued to
  // the screen while the map slid underneath it), which is exactly what gave away that these
  // dots weren't real. Anchoring them to actual lat/lng through the same overlay class real pins
  // use makes them pan and zoom identically — only their grey, unclickable look sets them apart.
  const decorativeDotOverlaysRef = useRef<PinOverlayInstance[]>([]);
  const dotsSpawnedAtRef = useRef(0);
  const dotsClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoomTooLow, setZoomTooLow] = useState(false);
  // A real, user-visible state, not a silent no-op — SESSION_REQUEST_BUDGET is account-wide (not
  // per-area), so hitting it from active exploring meant every later search, anywhere, including
  // the user's own real location, was silently returning zero results with no indication why.
  // Confirmed against real production activity: an account made 40 requests in ~2 minutes, then
  // reported "not a single result, even at my own location" for the next several minutes — that
  // window lines up exactly with the 5-minute budget this was silently enforcing.
  const [sessionThrottled, setSessionThrottled] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  // Visual placeholder only — establishes the target layout ahead of the real chat/LLM
  // integration (a later phase). Submitting just surfaces a message, no backend call.
  const [chatDraft, setChatDraft] = useState("");
  const [chatComingSoon, setChatComingSoon] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mapKeyOpen, setMapKeyOpen] = useState(false);
  const [websiteFilter, setWebsiteFilter] = useState<"any" | "no_website" | "has_website">("any");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [minHeatScore, setMinHeatScore] = useState<number | null>(null);
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
  const labelPassTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref mirrors of state that the map's `idle` listener needs to read — the listener is attached
  // once at map creation, so it would otherwise only ever see the state values from that first
  // render (a classic stale-closure trap).
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

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

  /** Finds businesses in the fixed grid tiles nearest to the CURRENT MAP CENTER (see
   * nearestSearchTiles), nearest tile first. Called both on explicit search and automatically
   * whenever the map's `idle` event fires (see the mount effect below), which reads category
   * from a ref instead of closed-over state since that listener is attached once at mount.
   * Declared here (above the mount effect) rather than further down with the other map helpers
   * so the effect's own reference to it isn't a forward reference. */
  async function handleFind() {
    if (!mapRef.current) return;
    const myGeneration = ++searchGenerationRef.current;
    setSearching(true);
    try {
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
      if (!center) return;

      // Nearest-to-farthest grid tiles around wherever the map is actually centered — see
      // nearestSearchTiles above for why this replaced a single circle centered on the raw,
      // slightly-jittery map center.
      const tiles = nearestSearchTiles(center, MAX_TILES_PER_SEARCH);

      const sectionsToRun = categoryRef.current === "All categories" ? SEARCH_ORDER : [categoryRef.current];

      // Optimistic reset — re-set immediately below if this attempt is still inside the
      // throttle window, but a fresh attempt deserves a fresh chance rather than an indefinitely
      // stuck warning from a previous one.
      setSessionThrottled(false);

      // Fresh decorative "still looking" dots for this search — real map overlays scattered
      // around the tiles being searched, purely cosmetic (not real business locations). They
      // disappear the moment the first real result of this search lands, or the search ends.
      clearDecorativeDots();
      spawnDecorativeDots(tiles);

      // Each request now does exactly one grid cell's worth of discovery per type-batch (see
      // /api/leads/find) and reports `hasMore` — so a tile is drained in a tight loop of small,
      // fast requests instead of one long call that silently does a whole tile's grid search
      // before the frontend hears back. has_website is set directly from the Nearby Search
      // response now (see /api/leads/find) — pins render already resolved (green/amber), no
      // separate enrichment pass, no per-lead API cost.
      for (const section of sectionsToRun) {
        setCurrentSearchingSection(section);
        for (const tile of tiles) {
          let hasMore = true;
          while (hasMore) {
            // A newer handleFind (a pan, or the real-location search finally resolving) has taken
            // over — stop working toward this now-stale area immediately rather than finishing it.
            if (searchGenerationRef.current !== myGeneration) return;

            const res = await fetch("/api/leads/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: tile.lat, lng: tile.lng, radius: TILE_RADIUS_METERS, category: section }),
            });
            const data = (await res.json()) as { found?: number; hasMore?: boolean; throttled?: string };
            hasMore = data.hasMore ?? false;
            if ((data.found ?? 0) > 0) clearDecorativeDotsAfterMinDuration();
            if (data.throttled === "session_budget") {
              // Every remaining request this search would make is going to get throttled the
              // same way — stop immediately instead of burning through the rest of the tiles/
              // categories for nothing.
              setSessionThrottled(true);
              return;
            }
            await refreshLeads();
          }
        }
      }
    } finally {
      // Only the run that's still current should clear the indicator — an older, superseded run
      // finishing its early-return must not hide "Finding businesses..." out from under whatever
      // newer search took over.
      if (searchGenerationRef.current === myGeneration) {
        setSearching(false);
        setCurrentSearchingSection(null);
        clearDecorativeDots();
      }
    }
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
        void handleFind();
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

  function clearDecorativeDots() {
    if (dotsClearTimeoutRef.current) {
      clearTimeout(dotsClearTimeoutRef.current);
      dotsClearTimeoutRef.current = null;
    }
    for (const dot of decorativeDotOverlaysRef.current) dot.setMap(null);
    decorativeDotOverlaysRef.current = [];
  }

  // A well-cached area can return its first real result within a couple hundred ms — fast enough
  // that the decorative dots (meant to read as "still looking") were clearing before a user could
  // register them at all, which just looked broken rather than fast. This keeps them up for at
  // least MIN_DOT_VISIBLE_MS from when they were spawned, delaying the actual clear rather than
  // skipping it.
  const MIN_DOT_VISIBLE_MS = 500;
  function clearDecorativeDotsAfterMinDuration() {
    const elapsed = Date.now() - dotsSpawnedAtRef.current;
    if (elapsed >= MIN_DOT_VISIBLE_MS || decorativeDotOverlaysRef.current.length === 0) {
      clearDecorativeDots();
      return;
    }
    if (dotsClearTimeoutRef.current) clearTimeout(dotsClearTimeoutRef.current);
    dotsClearTimeoutRef.current = setTimeout(() => {
      dotsClearTimeoutRef.current = null;
      clearDecorativeDots();
    }, MIN_DOT_VISIBLE_MS - elapsed);
  }

  function spawnDecorativeDots(tiles: SearchTile[]) {
    if (!mapRef.current || !PinOverlayClassRef.current) return;
    dotsSpawnedAtRef.current = Date.now();
    const PinOverlay = PinOverlayClassRef.current;
    for (const tile of tiles) {
      for (let i = 0; i < 3; i++) {
        const pos = randomNearbyPoint(tile, TILE_RADIUS_METERS * 0.7);
        const dot = new PinOverlay(pos, DECORATIVE_DOT_COLOR, true, () => {});
        dot.setMap(mapRef.current);
        decorativeDotOverlaysRef.current.push(dot);
      }
    }
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

  useEffect(() => {
    fetch("/api/chat-suggestions")
      .then((res) => res.json())
      .then((data: { suggestions?: string[] }) => setChatSuggestions(data.suggestions ?? []))
      .catch(() => {});
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

    const filtered = leads.filter((l) => {
      if (websiteFilter === "no_website" && l.has_website !== false) return false;
      if (websiteFilter === "has_website" && l.has_website !== true) return false;
      if (minRating !== null && (l.rating === null || l.rating < minRating)) return false;
      if (minHeatScore !== null && (l.heat_score === null || l.heat_score < minHeatScore)) return false;
      if (category !== "All categories" && (!l.category || TYPE_TO_SECTION[l.category] !== category)) return false;
      return true;
    });

    // Dense categories can return 1,000+ real matches in one radius (confirmed via a live audit)
    // — rendering all of them at a zoomed-out view is an unreadable wall of pins. Cap how many
    // render based on zoom, keeping the highest-scored (or competitor) ones when capped; zooming
    // into a specific area raises the cap since there's less on screen to begin with.
    // No tier is uncapped, even at close zoom — /api/leads returns every lead this account has
    // ever found across every area it's searched (no viewport bound), so an account with a long
    // history could otherwise push thousands of overlays through both the create/update loop and
    // the label-crowding pass below on every single search tick, regardless of how many are
    // anywhere near what's on screen. Confirmed live: this pushed a real slowdown once the
    // account's lead count grew past a few hundred.
    const PIN_CAP_BY_ZOOM: Array<[minZoom: number, cap: number]> = [
      [17, 300],
      [15, 150],
      [13, 60],
    ];
    const cap = PIN_CAP_BY_ZOOM.find(([minZoom]) => mapZoom >= minZoom)?.[1] ?? 40;
    // Proximity to the current map view, not heat_score, decides who survives the cap — /api/
    // leads returns every lead this account has ever found, account-wide, with no geographic
    // bound, so sorting purely by heat_score let a high-scoring lead from a city tested weeks ago
    // crowd out real, cached leads sitting right near where the user actually is now (confirmed
    // live against production data — a real lead 150-500m from the search center was missing
    // from a capped view while unrelated leads from elsewhere still rendered).
    const mapCenter = mapRef.current.getCenter();
    const visible =
      filtered.length <= cap
        ? filtered
        : [...filtered]
            .sort((a, b) => {
              if (a.lat == null || a.lng == null) return 1;
              if (b.lat == null || b.lng == null) return -1;
              if (!mapCenter) return 0;
              const { spherical } = google.maps.geometry;
              const distA = spherical.computeDistanceBetween(mapCenter, new google.maps.LatLng(a.lat, a.lng));
              const distB = spherical.computeDistanceBetween(mapCenter, new google.maps.LatLng(b.lat, b.lng));
              return distA - distB;
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
            ? "#7cb342"
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

    // Labels are decided by on-screen crowding, not by has_website — matching Pindrop's own map
    // (confirmed live against its reference screenshots): a pin with room around it shows its
    // full name, one packed in with neighbors shows a short truncated name instead, so nothing
    // overlaps. A fixed PIXEL threshold naturally does the "based on zoom" behavior asked for
    // without any explicit zoom branching — the same pins spread out (more room, more full
    // names) at higher zoom and pack in (more truncation) at lower zoom for free.
    //
    // This is an O(n²) pass, and `leads` changes on every single request inside an active
    // search's per-tile loop (dozens of times in one search) — running it on every one of those
    // was real, measurable main-thread work stacking up (confirmed live: it was the actual cause
    // behind "fetching feels slow" and dropped frames during a search, not the network requests
    // themselves). Debounced to run once ~250ms after leads/filters actually stop changing,
    // instead of on every intermediate update.
    if (labelPassTimeoutRef.current) clearTimeout(labelPassTimeoutRef.current);
    labelPassTimeoutRef.current = setTimeout(() => {
      // One frame after the timeout so every overlay's draw() has actually positioned it — a
      // brand new overlay's getScreenPosition() has nothing to fall back on before that.
      requestAnimationFrame(() => {
        const MIN_LABEL_SPACING_PX = 70;
        const positioned = visible
          .map((lead) => {
            if (lead.lat == null || lead.lng == null || lead.is_competitor || lead.has_website === null) return null;
            const overlay = markersRef.current.get(lead.id);
            const pos = overlay?.getScreenPosition();
            return overlay && pos ? { lead, overlay, pos } : null;
          })
          .filter((x): x is { lead: Lead; overlay: PinOverlayInstance; pos: { x: number; y: number } } => x !== null);

        for (const item of positioned) {
          const crowded = positioned.some(
            (other) =>
              other !== item && Math.hypot(other.pos.x - item.pos.x, other.pos.y - item.pos.y) < MIN_LABEL_SPACING_PX
          );
          const muted = item.lead.has_website === false;
          item.overlay.setLabel(
            crowded ? { text: `${item.lead.business_name.slice(0, 3)}····`, muted } : { text: item.lead.business_name, muted }
          );
        }
      });
    }, 250);
  }, [leads, websiteFilter, minRating, minHeatScore, category, mapReady, mapZoom]);

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
              Not now, I&apos;ll find it on the map
            </button>
          </div>
        </div>
      )}

      {/* Top bar — a single right-aligned row (locate, map key, search category, filter, bell,
          credits). The address search bar that used to live center-left is gone — the floating
          chat panel at the bottom is meant to take over "search this area" once it's wired to a
          real backend, so a second, redundant search control up here had no benefit. */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "flex-end", alignItems: "flex-start", gap: 10 }}>
        <ToolbarButton onClick={handleLocateMe} active={locating}>
          <CrosshairIcon />
        </ToolbarButton>

        <div style={{ position: "relative" }}>
          <ToolbarButton onClick={() => setMapKeyOpen((v) => !v)} active={mapKeyOpen}>
            <HelpIcon />
          </ToolbarButton>
          {mapKeyOpen && (
            <div
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                width: 240,
                background: "var(--g-white)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--g-gray-500)", letterSpacing: "0.04em", marginBottom: 12 }}>
                MAP KEY
              </div>
              <MapKeyRow color="#fdba3f" title="No website" description="A business with no site yet. Tap it to build one." />
              <MapKeyRow color="var(--g-green)" title="Website" description="This business already has a site." />
              <MapKeyRow color="#2563eb" title="You" description="Your current location." />
            </div>
          )}
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            border: "1px solid var(--g-green)",
            outline: "none",
            fontSize: 12.5,
            fontWeight: 700,
            color: category === "All categories" ? "var(--g-green-text)" : "var(--g-ink)",
            background: "var(--g-white)",
            borderRadius: "var(--radius-pill)",
            padding: "0 16px",
            height: 44,
            boxShadow: "var(--shadow-toolbar)",
            cursor: "pointer",
          }}
        >
          {SEARCH_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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
                width: 240,
                background: "var(--g-white)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
                padding: "8px 0",
                maxHeight: 420,
                overflowY: "auto",
              }}
            >
              <FilterSectionLabel>Website</FilterSectionLabel>
              <FilterRow label="Any" checked={websiteFilter === "any"} onClick={() => setWebsiteFilter("any")} />
              <FilterRow label="No website" checked={websiteFilter === "no_website"} onClick={() => setWebsiteFilter("no_website")} />
              <FilterRow label="Has website" checked={websiteFilter === "has_website"} onClick={() => setWebsiteFilter("has_website")} />

              <FilterSectionLabel>Min rating</FilterSectionLabel>
              <FilterRow label="Any" checked={minRating === null} onClick={() => setMinRating(null)} />
              {[3.5, 4, 4.5].map((r) => (
                <FilterRow key={r} label={`${r}+ stars`} checked={minRating === r} onClick={() => setMinRating(r)} />
              ))}

              <FilterSectionLabel>Min heat score</FilterSectionLabel>
              <FilterRow label="Any" checked={minHeatScore === null} onClick={() => setMinHeatScore(null)} />
              {[50, 70, 85].map((h) => (
                <FilterRow key={h} label={`${h}+`} checked={minHeatScore === h} onClick={() => setMinHeatScore(h)} />
              ))}
              {/* Category is controlled by the category dropdown itself now, not a second,
                  separately-settable list in here — one control for what gets searched AND
                  shown instead of two that could disagree with each other. */}
            </div>
          )}
        </div>

        {/* Non-functional placeholder — no notification system exists yet */}
        <ToolbarButton>
          <BellIcon />
        </ToolbarButton>
        <CreditsIndicator />
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
            // Clamped so the card (340px wide, centered on the pin) can't run off either
            // viewport edge — confirmed live: a pin near the right edge was clipping the card's
            // whole right half, cutting off Top Signals and the Add to leads button.
            left: Math.min(Math.max(cardPosition.x, 190), window.innerWidth - 190),
            // The redesigned card (heat gauge + signals + button) runs noticeably taller than
            // the old one — 260 was tuned for that shorter card and was still clipping the top
            // of this one for a pin near the top of the viewport.
            top: Math.max(cardPosition.y, 370),
            transform: "translate(-50%, calc(-100% - 16px))",
            width: 340,
            background: "var(--g-white)",
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
            style={{ position: "absolute", top: 14, right: 14, border: "none", background: "none", cursor: "pointer", display: "flex" }}
          >
            <XIcon />
          </button>

          {/* Icon badge + name/category/location — same shape as Pindrop's card header, colored
              by has_website (our own palette, not their per-category rainbow). */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingRight: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: selectedLead.is_competitor
                  ? "#fee2e2"
                  : selectedLead.has_website === false
                    ? "var(--g-amber-tint)"
                    : selectedLead.has_website === true
                      ? "var(--g-green-mint)"
                      : "var(--g-gray-100)",
              }}
            >
              <BuildingIcon
                color={
                  selectedLead.is_competitor
                    ? "#dc2626"
                    : selectedLead.has_website === false
                      ? "#b45309"
                      : selectedLead.has_website === true
                        ? "var(--g-green-text)"
                        : "var(--g-gray-500)"
                }
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.25 }}>{selectedLead.business_name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 3 }}>
                {formatCategory(selectedLead.category) ?? "Business"}
              </div>
              <div style={{ fontSize: 12, color: "var(--g-ink-soft)", marginTop: 3 }}>
                {selectedLead.address ?? "Add to leads to see the address"}
              </div>
            </div>
          </div>

          {selectedLead.is_competitor && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 12.5, fontWeight: 700, color: "#dc2626" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
              Competitor — not a lead
            </div>
          )}

          {!selectedLead.is_competitor && (
            <>
              {/* Heat gauge + website status/rating, side by side — matches Pindrop's card body. */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                <HeatGauge score={selectedLead.heat_score ?? 0} size={104} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: selectedLead.has_website === false ? "#b45309" : "var(--g-green-text)" }}>
                    <GlobeIcon color={selectedLead.has_website === false ? "#b45309" : "var(--g-green-text)"} size={14} />
                    {selectedLead.has_website === false
                      ? "No website found"
                      : selectedLead.has_website === true
                        ? "Has a website"
                        : "Checking…"}
                  </div>
                  {selectedLead.rating !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", marginTop: 8 }}>
                      <StarIcon />
                      {selectedLead.rating.toFixed(1)}
                      <span style={{ fontWeight: 500, color: "var(--g-gray-500)" }}>
                        ({selectedLead.review_count ?? 0})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Signals — derived from real fields only (has_website/heat_score/rating/
                  review_count), no invented activity data. */}
              {topSignals(selectedLead).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    Top Signals
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {topSignals(selectedLead).map((s) => (
                      <span
                        key={s.label}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "var(--radius-pill)",
                          background: SIGNAL_TONE_COLORS[s.tone].bg,
                          color: SIGNAL_TONE_COLORS[s.tone].text,
                        }}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedLead.is_competitor && selectedLead.is_unlocked && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)" }}>
                <CheckIcon /> Added to your leads
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--g-ink-soft)", lineHeight: 1.5 }}>
                {selectedLead.phone ?? "No phone found"}
                {selectedLead.email ? <><br />{selectedLead.email}</> : null}
              </div>
              <EnrichmentPanel leadId={selectedLead.id} />
            </div>
          )}

          {!selectedLead.is_competitor && !selectedLead.is_unlocked && selectedLead.has_website !== null && (
            <button
              type="button"
              disabled={addingLead}
              onClick={() => handleAddToLeads(selectedLead)}
              style={{
                marginTop: 16,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: selectedLead.has_website === false ? "var(--g-green)" : "var(--g-white)",
                color: selectedLead.has_website === false ? "#fff" : "var(--g-ink)",
                border: selectedLead.has_website === false ? "none" : "1px solid var(--g-border)",
                borderRadius: "var(--radius-pill)",
                padding: "11px 0",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: addingLead ? "default" : "pointer",
                opacity: addingLead ? 0.7 : 1,
              }}
            >
              {selectedLead.has_website === false && <LockIcon />}
              {addingLead ? "Adding…" : "Add to leads"} <ArrowRightIcon />
            </button>
          )}
        </div>
      )}

      {searching && (
        <div
          style={{
            position: "absolute",
            // Position alone isn't reliable here — the chat panel's badge row wraps to a
            // different number of lines depending on how the suggestions happen to fit, so any
            // fixed offset can still land underneath it. zIndex makes sure this pill wins that
            // stacking regardless (it's later in the DOM than the pill, so without an explicit
            // zIndex it paints on top by default) — confirmed live the pill was rendering behind
            // the chat panel.
            bottom: 172,
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
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
            zIndex: 25,
          }}
        >
          <span
            className="g-pin-pulse"
            style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--g-green)", flexShrink: 0 }}
          />
          <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>Finding businesses in</span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <BlurSwapText text={currentSearchingSection ?? "this area"} color="var(--g-amber)" />
          </span>
        </div>
      )}

      {zoomTooLow && !searching && (
        <div
          style={{
            position: "absolute",
            bottom: 172,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--g-ink)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            fontSize: 12.5,
            fontWeight: 600,
            zIndex: 25,
          }}
        >
          Zoom in to search this area
        </div>
      )}

      {sessionThrottled && !searching && (
        <div
          style={{
            position: "absolute",
            bottom: 172,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--g-amber-tint)",
            color: "#b45309",
            padding: "9px 18px",
            borderRadius: "var(--radius-pill)",
            fontSize: 12.5,
            fontWeight: 700,
            boxShadow: "var(--shadow-toolbar)",
            zIndex: 25,
          }}
        >
          Search paused — too many searches in a short time. Try again in a few minutes.
        </div>
      )}

      {/* Floating chat panel — visual placeholder for the future LLM/multi-service phase.
          Establishes the target layout now so later phases only need to wire in behavior. */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "96vw",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
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
            width: "100%",
            maxWidth: 600,
            background: "var(--g-white)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-card)",
            padding: 20,
          }}
        >
          {chatComingSoon && (
            <div style={{ fontSize: 12, color: "var(--g-gray-500)", padding: "0 2px 12px" }}>
              Chat is coming soon — this will decide which sources to pull leads from.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Ask anything about leads, companies, or markets…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "var(--g-ink)", background: "transparent", padding: "8px 10px" }}
            />
            <button
              type="submit"
              style={{
                width: 36,
                height: 36,
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

        {/* Example prompts, pulled from chat_suggestions (see /api/chat-suggestions) so they can
            later be ranked by ICP instead of picked at random — clicking one just fills the
            input, same "no backend yet" placeholder as the chat box itself. */}
        {!chatDraft && chatSuggestions.length > 0 && (
          // One row, wider than the chat box if it has to be — wrapping to a second row read as
          // broken/cramped, and there's open space on either side of the (narrower) chat box to
          // use. overflowX is a safety net for a very small viewport, not the normal case.
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 8, maxWidth: "100%", overflowX: "auto", paddingBottom: 2 }}>
            {chatSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setChatDraft(s)}
                style={{
                  border: "1px solid var(--g-border)",
                  background: "var(--g-white)",
                  borderRadius: "var(--radius-pill)",
                  padding: "9px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--g-ink)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-toolbar)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Blurs `text` out, swaps it, then blurs it back in whenever it changes — used for the "Finding
 * businesses in [category]" status so switching categories reads as a deliberate transition
 * rather than either an abrupt swap or a text box that keeps resizing to fit each name. */
type EnrichmentStatus = "not_started" | "pending" | "starting_instance" | "scraping" | "done" | "failed";
type Enrichment = { status: EnrichmentStatus; website_url?: string | null; open_hours?: unknown; error?: string | null };

const ENRICHMENT_STATUS_LABEL: Record<EnrichmentStatus, string> = {
  not_started: "",
  pending: "Starting…",
  starting_instance: "Starting the scraper…",
  scraping: "Fetching more details…",
  done: "",
  failed: "",
};

/** Website URL / hours for an unlocked lead, pulled from the self-hosted gosom scraper (Nearby
 * Search's response doesn't include either). Polls /api/leads/[id]/enrich every few seconds
 * while a job is in flight — a Vercel function can't stay alive for the full EC2-boot-plus-scrape
 * duration this can take, so the job's state lives server-side and this just checks in on it. */
function EnrichmentPanel({ leadId }: { leadId: string }) {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const res = await fetch(`/api/leads/${leadId}/enrich`).catch(() => null);
      const data = (await res?.json().catch(() => null)) as Enrichment | null;
      if (cancelled || !data) return;
      setEnrichment(data);
      if (data.status === "pending" || data.status === "starting_instance" || data.status === "scraping") {
        timeout = setTimeout(poll, 4000);
      }
    }
    void poll();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [leadId]);

  async function start() {
    setEnrichment({ status: "pending" });
    const res = await fetch(`/api/leads/${leadId}/enrich`, { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as Enrichment | null;
    if (data) setEnrichment(data);
  }

  if (!enrichment || enrichment.status === "not_started") {
    return (
      <button
        type="button"
        onClick={start}
        style={{
          marginTop: 10,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--g-green-text)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        Get more details (website, hours) →
      </button>
    );
  }

  if (enrichment.status === "failed") {
    return (
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--g-gray-500)" }}>
        Couldn&apos;t fetch more details.{" "}
        <button
          type="button"
          onClick={start}
          style={{ fontWeight: 700, color: "var(--g-green-text)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (enrichment.status === "done") {
    if (!enrichment.website_url) {
      return <div style={{ marginTop: 10, fontSize: 12, color: "var(--g-gray-500)" }}>No additional details found.</div>;
    }
    return (
      <div style={{ marginTop: 10, fontSize: 12.5 }}>
        <a href={enrichment.website_url} target="_blank" rel="noreferrer" style={{ color: "var(--g-green-text)", fontWeight: 700 }}>
          {enrichment.website_url}
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--g-gray-500)" }}>
      <span className="g-pin-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--g-green)", flexShrink: 0 }} />
      {ENRICHMENT_STATUS_LABEL[enrichment.status]}
    </div>
  );
}

function BlurSwapText({ text, color }: { text: string; color?: string }) {
  const [shown, setShown] = useState(text);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (text === shown) return;
    setVisible(false);
    const timeout = setTimeout(() => {
      setShown(text);
      setVisible(true);
    }, 180);
    return () => clearTimeout(timeout);
  }, [text, shown]);

  return (
    <span
      style={{
        display: "inline-block",
        color,
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(4px)",
        transition: "opacity 0.18s ease, filter 0.18s ease",
      }}
    >
      {shown}
    </span>
  );
}

function MapKeyRow({ color, title, description }: { color: string; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, marginTop: 3, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", lineHeight: 1.4, marginTop: 1 }}>{description}</div>
      </div>
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

function FilterSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 16px 4px" }}>
      {children}
    </div>
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
