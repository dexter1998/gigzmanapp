"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadGoogleMaps } from "@/lib/google-maps";
import { LIGHT_MAP_STYLES } from "@/lib/pin-overlay";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DashboardModeBadge } from "@/components/DashboardModeBadge";
import { JobCard, type JobCardData } from "@/components/jobs/JobCard";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { JOB_FAMILY_LABEL } from "@/lib/jobs/normalize";

/**
 * Jobs dashboard — the map half of jobs mode.
 *
 * Same two-pane shape as the leads dashboard (map on the left, results beside it) so switching
 * modes does not mean relearning the app. What differs is what a pin means: here it is a company
 * with open roles, and the list is roles rather than businesses.
 *
 * Discovery now fires automatically on pan/idle, same as leads — debounced so a drag settles
 * before anything is billed, exactly the IDLE_SETTLE_MS pattern in app/(app)/home/page.tsx. It used
 * to be manual-only ("Find jobs here"), which combined badly with discovery depending on the leads
 * table already having data for the viewport: a never-before-scanned area produced zero candidates
 * no matter how many times the button was clicked, with a misleading "already scanned" message.
 * /api/jobs/discover now backfills its own candidates with a real Places sweep when the leads table
 * is empty there, so auto-triggering it is no longer "crawl 25 sites on every idle" — most idles
 * hit the free, already-registered-companies path, and the ones that don't are now correctly priced
 * (see CREDIT_COST.billed_places_call) and rate-limited the same way leads/find already is. The
 * button stays as a manual "search now, skip the debounce" escape hatch.
 */

const DEFAULT_CENTER = { lat: 28.4595, lng: 77.0266 }; // Gurugram — same default as leads
const DEFAULT_ZOOM = 13;
const IDLE_SETTLE_MS = 1200;

type Filters = { family: string; industry: string; workMode: string; goldenOnly: boolean };

/** A discovered company with no open role yet -- the favicon-only dot, distinct from the green/
 * gold circle markers `jobs` drives (those already imply at least one open role). */
type CompanyPin = {
  id: string; domain: string; name: string; faviconUrl: string | null;
  lat: number | null; lng: number | null; goldenTier: string | null;
  scrapeStatus: string | null; hasOpenJobs: boolean;
};

/**
 * Two markers, not an SVG with an embedded <image href> pointing at the favicon -- that was tried
 * first and rendered nothing on screen. Google Maps rasterizes a marker icon via canvas, and a
 * cross-origin image (Google's own favicon service, a different origin from mantisai.in) referenced
 * from inside a data: URI SVG hits canvas tainting/CORS rules that a bare `icon: {url: ...}` on an
 * external image URL does not -- the latter is the same pattern the old 20px favicon dot already
 * used successfully. Splitting into a background disc (a vector Symbol, no external image, always
 * renders) plus the favicon as its own image marker on top (native external-URL icon, same as
 * before) sidesteps the whole problem. Both markers share one lat/lng; only the top one (favicon,
 * or the disc itself if there is no favicon) gets click/hover listeners.
 */
function backgroundDiscIcon(size: number, ringColor: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: size / 2,
    fillColor: "#ffffff",
    fillOpacity: 1,
    strokeColor: ringColor,
    strokeWeight: 2.5,
  };
}
function faviconOverlayIcon(faviconUrl: string, discSize: number): google.maps.Icon {
  const inner = discSize - discSize * 0.34;
  return {
    url: faviconUrl,
    scaledSize: new google.maps.Size(inner, inner),
    anchor: new google.maps.Point(inner / 2, inner / 2),
  };
}

type SearchTile = { lat: number; lng: number };

// Paired with MAX_FALLBACK_RADIUS_METERS (3000) in app/api/jobs/discover/route.ts -- tiles land
// close enough together to not leave gaps between each one's search circle, without so much
// overlap that neighboring tiles keep re-covering the same ground.
const JOBS_GRID_STEP_DEG = 0.025;
const TILES_PER_ROUND = 4;
const TARGET_JOBS = 20;

/** A 5x5 candidate grid around `center`, nearest-first -- same shape as home/page.tsx's own
 * nearestSearchTiles, sized to comfortably cover several rounds of "Find more" (5x5 = 25 tiles,
 * 4 at a time = 6+ rounds) before a viewport is genuinely exhausted. */
function nearbyJobTiles(center: google.maps.LatLng): SearchTile[] {
  const snap = (v: number) => Math.round(v / JOBS_GRID_STEP_DEG) * JOBS_GRID_STEP_DEG;
  const centerLat = snap(center.lat());
  const centerLng = snap(center.lng());
  const candidates: SearchTile[] = [];
  for (let dLat = -2; dLat <= 2; dLat++) {
    for (let dLng = -2; dLng <= 2; dLng++) {
      candidates.push({ lat: centerLat + dLat * JOBS_GRID_STEP_DEG, lng: centerLng + dLng * JOBS_GRID_STEP_DEG });
    }
  }
  const { spherical } = google.maps.geometry;
  return candidates.sort(
    (a, b) =>
      spherical.computeDistanceBetween(center, new google.maps.LatLng(a.lat, a.lng)) -
      spherical.computeDistanceBetween(center, new google.maps.LatLng(b.lat, b.lng))
  );
}

export default function JobsPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [jobs, setJobs] = useState<JobCardData[]>([]);
  // Mirrors `jobs` synchronously for the discovery loop below -- setJobs's re-render isn't
  // guaranteed to land before the loop's next await resumes, and checking a stale `jobs` closure
  // against TARGET_JOBS would let the loop run past the target it's meant to stop at.
  const jobsRef = useRef<JobCardData[]>([]);
  const [companyPins, setCompanyPins] = useState<CompanyPin[]>([]);
  const companyMarkersRef = useRef<google.maps.Marker[]>([]);
  const [profileComplete, setProfileComplete] = useState(true);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobCardData | null>(null);
  const [filters, setFilters] = useState<Filters>({ family: "", industry: "", workMode: "", goldenOnly: false });
  // What the dropdowns actually offer -- built from real open listings on screen (see
  // /api/jobs's facet query), not the full static taxonomy. Accumulated across loads rather than
  // replaced, so picking a filter doesn't shrink the other options out from under the dropdown the
  // user is still looking at (the facet query itself ignores the current family/industry selection,
  // but a pan to a new area should still only ever ADD options, not lose ones a prior area had).
  const [availableFamilies, setAvailableFamilies] = useState<Set<string>>(new Set());
  const [availableIndustries, setAvailableIndustries] = useState<Set<string>>(new Set());
  const idleSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveringRef = useRef(false);
  // The tile queue for wherever the map is centered right now -- reset whenever the center moves
  // to a different snapped grid cell, otherwise consumed TILES_PER_ROUND at a time so a "Find
  // more" click continues outward from where the last round left off instead of re-covering the
  // same nearest tiles.
  const tileQueueRef = useRef<{ centerKey: string; tiles: SearchTile[]; cursor: number } | null>(null);
  const [canFindMore, setCanFindMore] = useState(false);
  // Company id + position, not a frozen jobs snapshot -- so clicking "Add" inside the card updates
  // its own label immediately (derived live from `jobs` below) instead of only after a re-hover.
  const [hovered, setHovered] = useState<{ companyId: string; x: number; y: number } | null>(null);
  const hoveredJobs = hovered ? jobs.filter((j) => j.company.id === hovered.companyId) : [];
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoverHide() {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }
  function scheduleHoverHide() {
    clearHoverHide();
    hoverHideTimerRef.current = setTimeout(() => setHovered(null), 180);
  }

  /** Reads stored listings for whatever the map is currently showing. Cheap — no crawling. */
  const loadJobs = useCallback(async () => {
    const map = mapRef.current;
    const bounds = map?.getBounds();
    if (!bounds) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const params = new URLSearchParams({
      sw_lat: String(sw.lat()), sw_lng: String(sw.lng()),
      ne_lat: String(ne.lat()), ne_lng: String(ne.lng()),
    });
    if (filters.family) params.set("family", filters.family);
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.workMode) params.set("work_mode", filters.workMode);
    if (filters.goldenOnly) params.set("golden", "true");

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      jobsRef.current = data.jobs ?? [];
      setJobs(jobsRef.current);
      setCompanyPins(data.companies ?? []);
      setProfileComplete(data.profileComplete !== false);
      if (data.availableFamilies?.length) {
        setAvailableFamilies((prev) => new Set([...prev, ...data.availableFamilies]));
      }
      if (data.availableIndustries?.length) {
        setAvailableIndustries((prev) => new Set([...prev, ...data.availableIndustries]));
      }
    } catch {
      setNotice("Could not load jobs. Try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Map bootstrap.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      const map = new google.maps.Map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        styles: LIGHT_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      map.addListener("idle", () => {
        // Stored listings for the new viewport go up first — free, and shouldn't wait on the
        // debounce below (matches app/(app)/home/page.tsx's own leads-first-then-discover order).
        void loadJobs();

        if (idleSearchTimerRef.current) clearTimeout(idleSearchTimerRef.current);
        idleSearchTimerRef.current = setTimeout(() => {
          idleSearchTimerRef.current = null;
          if (!discoveringRef.current) void discoverHere();
        }, IDLE_SETTLE_MS);
      });
    });
    return () => {
      cancelled = true;
      if (idleSearchTimerRef.current) clearTimeout(idleSearchTimerRef.current);
      if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
    };
    // loadJobs/discoverHere intentionally not deps: the idle listener closes over the first
    // instance, and re-registering it on every filter/discovering change would stack duplicate
    // listeners. Filter changes are handled by the effect below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read when filters change (the map itself has not moved, so no idle event will fire).
  useEffect(() => {
    if (mapRef.current) void loadJobs();
  }, [filters, loadJobs]);

  // Pins follow whatever the list currently holds, so filtering the list filters the map too.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const byCompany = new Map<string, JobCardData[]>();
    for (const job of jobs) {
      if (job.company.lat == null || job.company.lng == null) continue;
      const list = byCompany.get(job.company.id) ?? [];
      list.push(job);
      byCompany.set(job.company.id, list);
    }

    for (const [, companyJobs] of byCompany) {
      const first = companyJobs[0];
      const golden = !!first.company.goldenTier;
      const position = { lat: first.company.lat as number, lng: first.company.lng as number };
      const size = golden ? 68 : 60;
      const ringColor = golden ? "#d4a72c" : "#1f8a54";
      const title = `${first.company.name} — ${companyJobs.length} open role${companyJobs.length > 1 ? "s" : ""}`;

      const disc = new google.maps.Marker({ position, map, zIndex: 1, icon: backgroundDiscIcon(size, ringColor) });
      markersRef.current.push(disc);

      // Listeners go on whichever marker is visually on top -- the favicon if there is one,
      // otherwise the disc itself.
      const topMarker = first.company.faviconUrl
        ? new google.maps.Marker({
            position, map, title, zIndex: 2,
            icon: faviconOverlayIcon(first.company.faviconUrl, size),
          })
        : disc;
      if (topMarker !== disc) markersRef.current.push(topMarker);
      topMarker.setTitle(title);
      topMarker.addListener("click", () => setSelected(first));
      // Hover shows a compact, scrollable list of this company's own roles (not the full detail
      // panel — that stays a click-through action). `domEvent` is a plain MouseEvent on a classic
      // Marker, so its client coordinates position the card without a separate projection lookup.
      topMarker.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
        clearHoverHide();
        const box = mapDivRef.current?.getBoundingClientRect();
        const dom = e.domEvent as MouseEvent | undefined;
        if (!box || !dom) return;
        setHovered({ companyId: first.company.id, x: dom.clientX - box.left, y: dom.clientY - box.top });
      });
      topMarker.addListener("mouseout", scheduleHoverHide);
    }
  }, [jobs]);

  // Favicon-only dots for companies discovered but with zero open roles right now -- matches the
  // leads map showing a pin for every business found, has-website or not. Skips anything already
  // covered by the circle markers above (hasOpenJobs=true there) so a company never gets two pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    companyMarkersRef.current.forEach((m) => m.setMap(null));
    companyMarkersRef.current = [];

    for (const c of companyPins) {
      if (c.hasOpenJobs || c.lat == null || c.lng == null) continue;
      const position = { lat: c.lat, lng: c.lng };
      const title = `${c.name} — no open roles right now`;

      const disc = new google.maps.Marker({ position, map, zIndex: 1, opacity: 0.9, icon: backgroundDiscIcon(60, "#d8dcd0") });
      companyMarkersRef.current.push(disc);

      if (c.faviconUrl) {
        const favicon = new google.maps.Marker({
          position, map, title, zIndex: 2, opacity: 0.9,
          icon: faviconOverlayIcon(c.faviconUrl, 60),
        });
        companyMarkersRef.current.push(favicon);
      } else {
        disc.setTitle(title);
      }
    }
  }, [companyPins]);

  // Hard ceiling on how many small crawl batches ONE tile will chase before moving on, in case
  // something upstream keeps claiming hasMore (a stuck company, a bug) -- caps worst-case latency
  // per tile rather than looping indefinitely.
  const MAX_ROUNDS_PER_TILE = 10;

  function currentTileQueue(center: google.maps.LatLng) {
    const key = `${Math.round(center.lat() / JOBS_GRID_STEP_DEG)}_${Math.round(center.lng() / JOBS_GRID_STEP_DEG)}`;
    if (tileQueueRef.current?.centerKey !== key) {
      tileQueueRef.current = { centerKey: key, tiles: nearbyJobTiles(center), cursor: 0 };
    }
    return tileQueueRef.current;
  }

  /** A small bounds box around one tile, sized so the backend's own radius cap (3000m in
   * app/api/jobs/discover/route.ts) is what actually bounds the search -- overshooting slightly
   * here is fine since that cap clamps it back down. */
  function tileBounds(tile: SearchTile) {
    const radiusMeters = 3000;
    const dLat = radiusMeters / 111320;
    const dLng = radiusMeters / (111320 * Math.cos((tile.lat * Math.PI) / 180));
    return { swLat: tile.lat - dLat, swLng: tile.lng - dLng, neLat: tile.lat + dLat, neLng: tile.lng + dLng };
  }

  /**
   * The crawl. Fires automatically on pan (debounced, see the idle listener above) as well as from
   * the manual button, which doubles as "Find more" once a round finishes under TARGET_JOBS.
   *
   * Searches a handful of grid tiles around the map's center (same shape as home/page.tsx's own
   * nearestSearchTiles), not the entire visible viewport in one shot -- a single 3km-radius circle
   * at a zoomed-out center covered only a sliver of what was on screen, which is why a wide view of
   * Delhi NCR was turning up almost nothing despite plenty of real businesses being visible. Each
   * tile is searched (registering + crawling a couple of companies at a time, see CRAWL_BATCH_SIZE)
   * until either its candidates run out or the running job count reaches TARGET_JOBS, at which
   * point this stops and leaves the rest of the tile queue for an explicit "Find more" click --
   * mirrors leads' own free-search-then-stop-at-a-count shape instead of unlimited auto-billing.
   */
  async function discoverHere() {
    const map = mapRef.current;
    if (!map || discoveringRef.current) return;
    const center = map.getCenter();
    if (!center) return;
    const queue = currentTileQueue(center);
    if (queue.cursor >= queue.tiles.length) {
      setCanFindMore(false);
      return;
    }

    discoveringRef.current = true;
    setDiscovering(true);
    setNotice(null);
    let totalCompanies = 0;
    let totalJobs = 0;
    let anyPlacesCalls = false;
    let anyCharged = false;
    try {
      const roundTiles = queue.tiles.slice(queue.cursor, queue.cursor + TILES_PER_ROUND);
      for (const tile of roundTiles) {
        queue.cursor++;
        const body = JSON.stringify(tileBounds(tile));

        for (let round = 0; round < MAX_ROUNDS_PER_TILE; round++) {
          const res = await fetch("/api/jobs/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const data = await res.json();
          if (res.status === 402 || data.throttled === "credits_required") {
            setNotice("Not enough credits to search a new area.");
            window.dispatchEvent(new Event("gigzman:open-plans"));
            return;
          }
          if (!res.ok) break; // one bad tile shouldn't stop the whole round
          // area_cooldown/session_budget fire whenever a tile was already searched recently —
          // silent, matching how the leads map treats the same throttles, rather than flashing a
          // message for ground that's already covered.
          if (data.throttled === "area_cooldown" || data.throttled === "session_budget") break;

          totalCompanies += data.companies ?? 0;
          totalJobs += data.jobs ?? 0;
          if (data.placesCalls > 0) anyPlacesCalls = true;
          if (data.charged) anyCharged = true;

          // Refresh after every round, not just at the end -- this is what makes discovery feel
          // incremental instead of one long wait.
          if (data.companies > 0 || data.placesCalls > 0) await loadJobs();
          if (anyCharged) window.dispatchEvent(new Event("gigzman:credits-changed"));

          if (!data.hasMore) break;
          if (jobsRef.current.length >= TARGET_JOBS) break;
        }
        if (jobsRef.current.length >= TARGET_JOBS) break;
      }

      setCanFindMore(queue.cursor < queue.tiles.length);
      if (jobsRef.current.length >= TARGET_JOBS) {
        setNotice(`Found ${jobsRef.current.length} roles nearby.`);
      } else if (totalCompanies === 0 && !anyPlacesCalls) {
        setNotice("Every business here has already been scanned. Listings refresh every 10 days.");
      } else if (jobsRef.current.length === 0) {
        setNotice(
          queue.cursor < queue.tiles.length
            ? "No hiring businesses found yet — try Find more."
            : "No hiring businesses found in this area."
        );
      } else {
        setNotice(`Found ${jobsRef.current.length} roles so far${queue.cursor < queue.tiles.length ? " — try Find more." : "."}`);
      }
    } finally {
      discoveringRef.current = false;
      setDiscovering(false);
    }
  }

  async function toggleSave(job: JobCardData) {
    const saved = !!job.applicationStatus;
    if (saved) {
      await fetch(`/api/jobs/applications?jobId=${job.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, status: "saved", matchScore: job.matchScore }),
      });
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, applicationStatus: saved ? null : "saved" } : j)),
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--g-cream)" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        {hovered && hoveredJobs.length > 0 && (
          <div
            onMouseEnter={clearHoverHide}
            onMouseLeave={scheduleHoverHide}
            style={{
              position: "absolute",
              left: hovered.x + 14,
              top: hovered.y - 10,
              width: 260,
              maxHeight: 280,
              overflowY: "auto",
              background: "var(--g-white)",
              border: "1px solid var(--g-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-card)",
              zIndex: 10,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 8, paddingLeft: 2 }}>
              {hoveredJobs[0].company.name} · {hoveredJobs.length} open role{hoveredJobs.length > 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hoveredJobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 9px",
                    borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)", cursor: "pointer",
                  }}
                  onClick={() => setSelected(job)}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {job.title}
                    </div>
                    {job.location && (
                      <div style={{ fontSize: 10.5, color: "var(--g-gray-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {job.location}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleSave(job);
                    }}
                    style={{
                      flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: "5px 9px",
                      borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
                      background: job.applicationStatus ? "var(--g-green-mint)" : "var(--g-green-darker)",
                      color: job.applicationStatus ? "var(--g-green-text)" : "#fff",
                    }}
                  >
                    {job.applicationStatus ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside
        style={{
          width: 420,
          flexShrink: 0,
          borderLeft: "1px solid var(--g-border)",
          background: "var(--g-white)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--g-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 600, margin: 0, color: "var(--g-ink)" }}>
              Jobs
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DashboardModeBadge />
              <CreditsIndicator />
            </div>
          </div>

          {!profileComplete && (
            <Link
              href="/jobs/profile"
              style={{
                display: "block", marginBottom: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)",
                background: "var(--g-green-mint)", color: "var(--g-green-text)", textDecoration: "none",
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              Add your resume to unlock your match on every job →
            </Link>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <select
              value={filters.family}
              onChange={(e) => setFilters((f) => ({ ...f, family: e.target.value }))}
              style={selectStyle}
              aria-label="Job profile"
            >
              <option value="">All job profiles</option>
              {Array.from(availableFamilies).map((k) => (
                <option key={k} value={k}>{JOB_FAMILY_LABEL[k] ?? k}</option>
              ))}
            </select>
            <select
              value={filters.industry}
              onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))}
              style={selectStyle}
              aria-label="Industry"
            >
              <option value="">All industries</option>
              {Array.from(availableIndustries).map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <select
              value={filters.workMode}
              onChange={(e) => setFilters((f) => ({ ...f, workMode: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Any mode</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, goldenOnly: !f.goldenOnly }))}
              style={{
                ...selectStyle,
                cursor: "pointer",
                background: filters.goldenOnly ? "#f5e6bf" : "var(--g-white)",
                color: filters.goldenOnly ? "#7a5c12" : "var(--g-ink)",
                fontWeight: 700,
              }}
            >
              ★ Golden only
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={discoverHere}
              disabled={discovering}
              style={{
                flex: 1, padding: "9px 0", borderRadius: "var(--radius-sm)", border: "none",
                background: "var(--g-green-darker)", color: "#fff", fontSize: 12.5, fontWeight: 700,
                cursor: discovering ? "wait" : "pointer", opacity: discovering ? 0.7 : 1,
              }}
            >
              {discovering
                ? `Finding ${filters.family ? `${JOB_FAMILY_LABEL[filters.family] ?? ""} ` : ""}jobs near you…`
                : canFindMore
                  ? "Find more jobs"
                  : "Find jobs here"}
            </button>
            <Link href="/jobs/applications" style={{ ...selectStyle, textDecoration: "none", fontWeight: 700, lineHeight: "20px" }}>
              Applications
            </Link>
          </div>

          {notice && (
            <p style={{ fontSize: 11.5, color: "var(--g-gray-500)", margin: "10px 0 0" }}>{notice}</p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {(loading || discovering) && !jobs.length && <Empty>{discovering ? "Searching this area…" : "Loading…"}</Empty>}
          {!loading && !discovering && !jobs.length && (
            <Empty>
              No roles found here yet. Pan the map to where you want to work — Mantis searches
              automatically as you move.
            </Empty>
          )}
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onOpen={setSelected} onSave={toggleSave} />
          ))}
        </div>
      </aside>

      {selected && <JobDetailPanel job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12,
  fontFamily: "inherit",
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", textAlign: "center", padding: "40px 20px", lineHeight: 1.6 }}>
      {children}
    </p>
  );
}
