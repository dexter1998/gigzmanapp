"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadGoogleMaps } from "@/lib/google-maps";
import { MAP_STYLES } from "@/lib/pin-overlay";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DashboardModeBadge } from "@/components/DashboardModeBadge";
import { JobCard, type JobCardData } from "@/components/jobs/JobCard";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { JOB_FAMILY_LABEL } from "@/lib/jobs/normalize";
import { TableIcon, MapsPinIcon, XIcon } from "@/components/icons";

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
 * used successfully. Splitting into a background card (a plain SVG data URI with no external image
 * inside it, so nothing to taint -- just a shape) plus the favicon as its own image marker on top
 * (native external-URL icon) sidesteps the whole problem. Both markers share one lat/lng; only the
 * top one (favicon, or the card itself if there is no favicon) gets click/hover listeners.
 *
 * Rounded-square card, not a circle -- matches the reference (nextdoor.company/discover) style of
 * showing a company favicon in a small white card rather than a bare dot.
 */
// Measured directly off nextdoor.company/discover's own `.company-marker` computed styles, logged
// in via Playwright: a 48px card carries a 12px border-radius, 6px padding, and a single
// `0 2px 4px rgba(0,0,0,0.3)` shadow -- flatter than the gradient+deep-shadow tried here initially,
// which read closer to a floating chip than the reference's own thin-card-with-real-edge look.
const CARD_RADIUS_RATIO = 12 / 48;

function backgroundCardIcon(size: number, ringColor: string, elevated = false): google.maps.Icon {
  const pad = 9;
  const canvas = size + pad * 2;
  const r = size * CARD_RADIUS_RATIO;
  const dy = elevated ? 4 : 2;
  const blur = elevated ? 6 : 4;
  const opacity = elevated ? 0.36 : 0.3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    <defs>
      <filter id="s" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000000" flood-opacity="${opacity}"/>
      </filter>
    </defs>
    <rect x="${pad}" y="${pad}" width="${size}" height="${size}" rx="${r}" fill="#ffffff" stroke="${ringColor}" stroke-width="2" filter="url(#s)"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(canvas, canvas),
    anchor: new google.maps.Point(canvas / 2, canvas / 2),
  };
}
/** A background-only card (no gradient/shadow needed -- it's a shadow layer itself, sitting behind
 * the front card) for the 2nd/3rd sliver of a fanned stack. Flat and slightly duller so it reads as
 * "behind", not another real target. */
function fanSliverIcon(size: number): google.maps.Icon {
  const r = size * CARD_RADIUS_RATIO;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${r}" fill="#f4f5ef" stroke="#dde0d4" stroke-width="1.5"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}
// The reference's own card is 48px (44px for one inside a stack). The 105/120px tried before was
// far too heavy on a real viewport -- a handful of companies swallowed the map.
const ORDINARY_CARD_SIZE = 48;
const GOLDEN_CARD_SIZE = 56;
// How much a card grows under the cursor. Small on purpose: enough to read as a lift, not enough to
// shove neighbouring cards around at the zoom levels where they already nearly touch.
const HOVER_SCALE = 1.18;

/** Pixel offsets (front-to-back) for a fanned stack of up to 3 cards. The reference's own stack
 * (watched directly at nextdoor.company/discover, fully zoomed out) is a same-direction diagonal
 * staircase -- each sliver behind the last one step further up-and-right -- not a symmetric V. */
const FAN_OFFSETS = [
  { dx: 0, dy: 0 }, // front -- gets the favicon
  { dx: 6, dy: -5 }, // 2nd sliver, up-right
  { dx: 12, dy: -10 }, // 3rd sliver, further up-right
];
// The reference's 48px card is border-box with a 2px border and 6px padding, leaving a 32px logo --
// so the favicon fills 2/3 of the card, not the 44/60 measured earlier off the detail panel's own
// (much larger) logo rather than the marker's.
function faviconOverlayIcon(faviconUrl: string, cardSize: number): google.maps.Icon {
  const inner = cardSize * (32 / 48);
  return {
    url: faviconUrl,
    scaledSize: new google.maps.Size(inner, inner),
    anchor: new google.maps.Point(inner / 2, inner / 2),
  };
}
/** A small white name-label pill under an individual (non-clustered) company card -- the reference
 * shows one under every unlocked company ("Wingify", "Mintifi", "M2P Fintech" etc, confirmed via
 * Playwright), not just on hover. Width is estimated from character count since this is a data-URI
 * SVG icon, not real DOM text that can measure itself. */
function nameLabelIcon(name: string): google.maps.Icon {
  const label = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  // Reference values: 13px/500 on a 90%-white chip, 4px radius, 2px 6px padding, soft drop shadow
  // (no border). A shadow rather than a stroke keeps the chip legible over both light and dark map
  // tiles, which a 1px light-grey border does not.
  const fontSize = 12;
  const charWidth = fontSize * 0.55;
  const padX = 6;
  const pad = 4; // canvas breathing room so the shadow is not clipped
  const width = Math.round(label.length * charWidth + padX * 2);
  const height = 19;
  const canvasW = width + pad * 2;
  const canvasH = height + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
    <defs>
      <filter id="l" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.2"/>
      </filter>
    </defs>
    <rect x="${pad}" y="${pad}" width="${width}" height="${height}" rx="4" fill="rgba(255,255,255,0.92)" filter="url(#l)" />
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="500" fill="#101214">${label}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(canvasW, canvasH),
    anchor: new google.maps.Point(canvasW / 2, canvasH / 2),
  };
}
/** Small red count badge for a cluster of 2+ companies at (near enough) the same spot -- offset to
 * the card's top-right corner. Also a plain SVG with no external image, for the same canvas-taint
 * reason as the card above. */
function clusterBadgeIcon(count: number): google.maps.Icon {
  const size = 24; // reference's own badge diameter
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#e0483e" stroke="#ffffff" stroke-width="2"/>
    <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">${count > 99 ? "99+" : count}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

/** Meters represented by one screen pixel at this latitude/zoom -- the standard Web Mercator
 * approximation, used to cluster by an on-screen distance (a fixed pixel radius) rather than a
 * fixed lat/lng distance that would look right at one zoom level and wrong at every other. */
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}
// Must be at least ORDINARY_CARD_SIZE -- two un-clustered card centers closer together than the
// card's own width still visually overlap regardless of the clustering decision. The original 26px
// was sized for the old 60px card and became the actual cause of the favicon-bleeding-onto-the-
// next-card bug once cards grew to ORDINARY_CARD_SIZE: pairs between 26px and ~105px apart stayed
// un-clustered (two separate full-size markers) while still being close enough on screen to overlap.
// A fanned stack also spreads FAN_OFFSETS' full diagonal beyond its front card, and a golden card
// is wider than an ordinary one -- so the separation has to clear the largest card plus that spread,
// not just one ordinary card's width, or a neighbor still lands inside the stack's visual footprint.
const FAN_SPREAD = Math.max(...FAN_OFFSETS.map((o) => Math.hypot(o.dx, o.dy)));
const CLUSTER_PIXEL_RADIUS = GOLDEN_CARD_SIZE + FAN_SPREAD + 8;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Groups items within CLUSTER_PIXEL_RADIUS screen pixels of each other at the given zoom --
 * tighter as you zoom in (matches the reference's stacked-card-to-individual-cards behavior),
 * looser zoomed out. Simple greedy single-pass grouping, fine at map-viewport marker counts. */
function clusterByPixelDistance<T extends { lat: number; lng: number }>(items: T[], zoom: number): T[][] {
  const clusters: T[][] = [];
  for (const item of items) {
    const home = clusters.find((c) => {
      const rep = c[0];
      const thresholdMeters = CLUSTER_PIXEL_RADIUS * metersPerPixel(rep.lat, zoom);
      return haversineMeters(rep.lat, rep.lng, item.lat, item.lng) < thresholdMeters;
    });
    if (home) home.push(item);
    else clusters.push([item]);
  }
  return clusters;
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
  // Clicking a company pin opens this -- a right-docked panel listing ALL of that company's open
  // roles (matching the reference's own click-to-detail panel), rather than jumping straight into
  // one job's full-screen modal. `selected`/JobDetailPanel stays as the deeper "view this specific
  // role" step, reached from a row inside this panel.
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  /**
   * The panel's roles come from the company endpoint, not from the viewport list.
   *
   * Filtering by `jobs` meant the panel could only ever show roles that survived the active
   * family/work-mode filters and the list's own LIMIT -- never the "all of a company's open roles"
   * it claims -- and companies absent from that array could not open at all.
   */
  const [companyDetail, setCompanyDetail] = useState<
    { company: { id: string; name: string; faviconUrl: string | null; goldenTier: string | null; careersUrl: string | null }; jobs: JobCardData[] } | null
  >(null);
  const [companyLoading, setCompanyLoading] = useState(false);
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
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  // Company id + position, not a frozen jobs snapshot -- so clicking "Add" inside the card updates
  // its own label immediately (derived live from `jobs` below) instead of only after a re-hover.
  // A list, not one id: a fanned stack is several companies under one marker, and it had no hover
  // behaviour at all because this could only ever describe a single company.
  const [hovered, setHovered] = useState<{ companyIds: string[]; x: number; y: number } | null>(null);
  const hoveredJobs = hovered?.companyIds.length === 1
    ? jobs.filter((j) => j.company.id === hovered.companyIds[0])
    : [];
  /**
   * Name/tier for any pin on the map, whether or not it currently has roles in `jobs`.
   *
   * The hover card and the detail panel both used to key off `jobs` alone, so the majority of pins
   * -- the "found, not hiring right now" companies, which never appear in that array -- silently
   * did nothing on hover or click. companyPins is the set that is actually rendered, so it is the
   * right source for "what is this pin".
   */
  const companyById = useMemo(() => {
    const m = new Map<string, { name: string; goldenTier: string | null }>();
    for (const p of companyPins) m.set(p.id, { name: p.name, goldenTier: p.goldenTier });
    for (const j of jobs) m.set(j.company.id, { name: j.company.name, goldenTier: j.company.goldenTier ?? null });
    return m;
  }, [companyPins, jobs]);
  const hoveredCompany =
    hovered?.companyIds.length === 1 ? companyById.get(hovered.companyIds[0]) ?? null : null;
  /** Every company under a fanned stack, so the hover card can list them and let one be picked. */
  const hoveredStack = hovered && hovered.companyIds.length > 1
    ? hovered.companyIds
        .map((id) => ({ id, ...(companyById.get(id) ?? { name: id, goldenTier: null }) }))
        .map((c) => ({ ...c, roles: jobs.filter((j) => j.company.id === c.id).length }))
    : [];

  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyDetail(null);
      return;
    }
    let cancelled = false;
    setCompanyLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/company?id=${encodeURIComponent(selectedCompanyId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const company = data.company;
        // applicationStatus only exists on the viewport list (it is per-user state the company
        // endpoint does not carry), so it is merged back in rather than lost on open.
        const statusById = new Map(jobs.map((j) => [j.id, j.applicationStatus]));
        setCompanyDetail({
          company,
          jobs: (data.jobs ?? []).map((j: Record<string, unknown>) => ({
            ...j,
            company,
            applicationStatus: statusById.get(j.id as string) ?? null,
          })) as JobCardData[],
        });
      } finally {
        if (!cancelled) setCompanyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `jobs` is intentionally not a dep: it changes on every pan, and re-fetching the open panel
    // each time would fight the user's scroll position for no new information.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);
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
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      map.addListener("zoom_changed", () => setMapZoom(map.getZoom() ?? DEFAULT_ZOOM));
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

  /** Pixel-offset a lat/lng -- used to place a cluster's count badge at the card's corner rather
   * than dead center, at whatever zoom is currently active. */
  function offsetLatLng(lat: number, lng: number, dxPixels: number, dyPixels: number, zoom: number) {
    const mpp = metersPerPixel(lat, zoom);
    return {
      lat: lat + (dyPixels * mpp) / 111320,
      lng: lng + (dxPixels * mpp) / (111320 * Math.cos((lat * Math.PI) / 180)),
    };
  }

  /**
   * Renders one always-individual company card (golden-tier companies, and any singleton cluster)
   * with click -> the right-docked company panel (not the single-job modal -- there may be several
   * open roles here) and a hover elevation (a deeper drop shadow, same card, no size change) that
   * lifts it slightly off the map -- the "slight shadow highlight on hover" from the reference.
   */
  function renderIndividualCard(
    refArr: google.maps.Marker[],
    position: { lat: number; lng: number },
    companyId: string,
    faviconUrl: string | null,
    size: number,
    ringColor: string,
    title: string,
    map: google.maps.Map,
    name: string,
  ) {
    const card = new google.maps.Marker({ position, map, zIndex: 2, icon: backgroundCardIcon(size, ringColor) });
    refArr.push(card);
    const topMarker = faviconUrl
      ? new google.maps.Marker({ position, map, title, zIndex: 3, icon: faviconOverlayIcon(faviconUrl, size) })
      : card;
    if (topMarker !== card) refArr.push(topMarker);
    topMarker.setTitle(title);
    topMarker.addListener("click", () => setSelectedCompanyId(companyId));
    // Card edge, then the reference's 4px gap, then half the label chip's own height.
    const labelPosition = offsetLatLng(position.lat, position.lng, 0, size / 2 + 4 + 13, mapZoom);
    refArr.push(
      new google.maps.Marker({ position: labelPosition, map, zIndex: 3, clickable: false, icon: nameLabelIcon(name) }),
    );
    topMarker.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
      // Grow the card and its logo slightly as well as deepening the shadow -- a shadow change
      // alone is easy to miss on a busy map, and the lift should read as "this one is under the
      // cursor" at a glance.
      const grown = Math.round(size * HOVER_SCALE);
      card.setIcon(backgroundCardIcon(grown, ringColor, true));
      if (topMarker !== card && faviconUrl) topMarker.setIcon(faviconOverlayIcon(faviconUrl, grown));
      card.setZIndex(6);
      topMarker.setZIndex(7);
      clearHoverHide();
      const box = mapDivRef.current?.getBoundingClientRect();
      const dom = e.domEvent as MouseEvent | undefined;
      if (!box || !dom) return;
      setHovered({ companyIds: [companyId], x: dom.clientX - box.left, y: dom.clientY - box.top });
    });
    topMarker.addListener("mouseout", () => {
      card.setIcon(backgroundCardIcon(size, ringColor, false));
      if (topMarker !== card && faviconUrl) topMarker.setIcon(faviconOverlayIcon(faviconUrl, size));
      card.setZIndex(2);
      topMarker.setZIndex(3);
      scheduleHoverHide();
    });
  }

  /** A fanned stack (up to 3 offset slivers, matching the reference's tiled-deck look) for a
   * cluster of 2+ ordinary (non-golden) companies too close together to tell apart at this zoom --
   * clicking it zooms in rather than opening one company's detail, since there is no single company
   * to show yet. Golden companies are never in this cluster to begin with (see the split below). */
  function renderClusterFan(
    refArr: google.maps.Marker[],
    front: { lat: number; lng: number; faviconUrl: string | null },
    count: number,
    title: string,
    map: google.maps.Map,
    memberIds: string[],
  ) {
    const size = ORDINARY_CARD_SIZE;
    const slivers = Math.min(count, 3);
    for (let i = slivers - 1; i >= 1; i--) {
      const offset = offsetLatLng(front.lat, front.lng, FAN_OFFSETS[i].dx, FAN_OFFSETS[i].dy, mapZoom);
      refArr.push(new google.maps.Marker({ position: offset, map, zIndex: 1, clickable: false, icon: fanSliverIcon(size) }));
    }
    const frontOffset = offsetLatLng(front.lat, front.lng, FAN_OFFSETS[0].dx, FAN_OFFSETS[0].dy, mapZoom);
    const card = new google.maps.Marker({ position: frontOffset, map, zIndex: 2, icon: backgroundCardIcon(size, "#1f8a54") });
    refArr.push(card);
    const topMarker = front.faviconUrl
      ? new google.maps.Marker({ position: frontOffset, map, title, zIndex: 3, icon: faviconOverlayIcon(front.faviconUrl, size) })
      : card;
    if (topMarker !== card) refArr.push(topMarker);
    topMarker.setTitle(title);
    topMarker.addListener("click", () => {
      map.panTo(frontOffset);
      map.setZoom(Math.min((map.getZoom() ?? DEFAULT_ZOOM) + 3, 20));
    });
    // A stack had no hover behaviour at all, so everything below individual-card zoom felt dead.
    // It lists its companies instead of one company's roles -- there is no single company to show
    // yet, and picking one from the list is the step that opens a panel.
    topMarker.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
      const grown = Math.round(size * HOVER_SCALE);
      card.setIcon(backgroundCardIcon(grown, "#1f8a54", true));
      if (topMarker !== card && front.faviconUrl) topMarker.setIcon(faviconOverlayIcon(front.faviconUrl, grown));
      card.setZIndex(6);
      topMarker.setZIndex(7);
      clearHoverHide();
      const box = mapDivRef.current?.getBoundingClientRect();
      const dom = e.domEvent as MouseEvent | undefined;
      if (!box || !dom) return;
      setHovered({ companyIds: memberIds, x: dom.clientX - box.left, y: dom.clientY - box.top });
    });
    topMarker.addListener("mouseout", () => {
      card.setIcon(backgroundCardIcon(size, "#1f8a54", false));
      if (topMarker !== card && front.faviconUrl) topMarker.setIcon(faviconOverlayIcon(front.faviconUrl, size));
      card.setZIndex(2);
      topMarker.setZIndex(3);
      scheduleHoverHide();
    });
    // Reference pins its badge at top:-8px right:-8px on a 48px card -- i.e. 20px out from centre.
    const badgeOffset = offsetLatLng(frontOffset.lat, frontOffset.lng, size * (20 / 48), -size * (20 / 48), mapZoom);
    refArr.push(new google.maps.Marker({ position: badgeOffset, map, zIndex: 4, icon: clusterBadgeIcon(count), clickable: false }));
  }

  // Pins follow whatever the list currently holds, so filtering the list filters the map too.
  // Golden-tier companies never cluster -- they stay individually visible and clickable at every
  // zoom (the reference's own "notable companies always shown individually" pattern; Anthropic,
  // Figma etc. keep their own card even in a dense area). Everything else clusters by on-screen
  // distance (see clusterByPixelDistance): a fanned stack + count badge at a wide zoom, separating
  // into individual cards once zoomed in enough to tell them apart.
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
    const companies = Array.from(byCompany.values()).map((companyJobs) => ({
      lat: companyJobs[0].company.lat as number,
      lng: companyJobs[0].company.lng as number,
      companyJobs,
    }));
    const golden = companies.filter((c) => c.companyJobs[0].company.goldenTier);
    const ordinary = companies.filter((c) => !c.companyJobs[0].company.goldenTier);

    for (const g of golden) {
      const first = g.companyJobs[0];
      const totalRoles = g.companyJobs.length;
      renderIndividualCard(
        markersRef.current, { lat: g.lat, lng: g.lng }, first.company.id, first.company.faviconUrl, GOLDEN_CARD_SIZE, "#d4a72c",
        `${first.company.name} — ${totalRoles} open role${totalRoles > 1 ? "s" : ""}`, map, first.company.name,
      );
    }

    for (const cluster of clusterByPixelDistance(ordinary, mapZoom)) {
      const front = [...cluster].sort((a, b) => b.companyJobs.length - a.companyJobs.length)[0];
      const first = front.companyJobs[0];
      const totalRoles = cluster.reduce((n, c) => n + c.companyJobs.length, 0);
      if (cluster.length > 1) {
        renderClusterFan(
          markersRef.current, { lat: front.lat, lng: front.lng, faviconUrl: first.company.faviconUrl }, cluster.length,
          `${cluster.length} companies here — ${totalRoles} open role${totalRoles > 1 ? "s" : ""}`, map,
          cluster.map((c) => c.companyJobs[0].company.id),
        );
      } else {
        renderIndividualCard(
          markersRef.current, { lat: front.lat, lng: front.lng }, first.company.id, first.company.faviconUrl, ORDINARY_CARD_SIZE, "#1f8a54",
          `${first.company.name} — ${totalRoles} open role${totalRoles > 1 ? "s" : ""}`, map, first.company.name,
        );
      }
    }
  }, [jobs, mapZoom]);

  // Favicon-only cards for companies discovered but with zero open roles right now -- matches the
  // leads map showing a pin for every business found, has-website or not. Skips anything already
  // covered by the cards above (hasOpenJobs=true there) so a company never gets two pins. Same
  // golden-never-clusters + fanned-stack rules as the has-jobs cards above. Still clickable (opens
  // the company panel, which shows its empty state) -- the reference lets you open any company
  // regardless of whether it's currently hiring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    companyMarkersRef.current.forEach((m) => m.setMap(null));
    companyMarkersRef.current = [];

    const withoutJobs = companyPins.filter((c) => !c.hasOpenJobs && c.lat != null && c.lng != null) as Array<
      CompanyPin & { lat: number; lng: number }
    >;
    const golden = withoutJobs.filter((c) => c.goldenTier);
    const ordinary = withoutJobs.filter((c) => !c.goldenTier);

    for (const c of golden) {
      renderIndividualCard(
        companyMarkersRef.current, { lat: c.lat, lng: c.lng }, c.id, c.faviconUrl, GOLDEN_CARD_SIZE, "#d4a72c",
        `${c.name} — no open roles right now`, map, c.name,
      );
    }

    for (const cluster of clusterByPixelDistance(ordinary, mapZoom)) {
      const front = cluster[0];
      if (cluster.length > 1) {
        renderClusterFan(
          companyMarkersRef.current, { lat: front.lat, lng: front.lng, faviconUrl: front.faviconUrl }, cluster.length,
          `${cluster.length} companies here — no open roles right now`, map,
          cluster.map((c) => c.id),
        );
      } else {
        renderIndividualCard(
          companyMarkersRef.current, { lat: front.lat, lng: front.lng }, front.id, front.faviconUrl, ORDINARY_CARD_SIZE, "#d8dcd0",
          `${front.name} — no open roles right now`, map, front.name,
        );
      }
    }
  }, [companyPins, mapZoom]);

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

  const totalCompanies = companyPins.length;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--g-cream)" }}>

      <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
        <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

        {/* Floating top bar: filters on the left, view toggle + credits on the right -- always
            over the map so filtering doesn't require the list panel to be open. */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, pointerEvents: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, pointerEvents: "auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <select value={filters.family} onChange={(e) => setFilters((f) => ({ ...f, family: e.target.value }))} style={floatingSelectStyle} aria-label="Job profile">
                <option value="">All job profiles</option>
                {Array.from(availableFamilies).map((k) => (
                  <option key={k} value={k}>{JOB_FAMILY_LABEL[k] ?? k}</option>
                ))}
              </select>
              <select value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))} style={floatingSelectStyle} aria-label="Industry">
                <option value="">All industries</option>
                {Array.from(availableIndustries).map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
              <select value={filters.workMode} onChange={(e) => setFilters((f) => ({ ...f, workMode: e.target.value }))} style={floatingSelectStyle}>
                <option value="">Any mode</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, goldenOnly: !f.goldenOnly }))}
                style={{ ...floatingSelectStyle, cursor: "pointer", background: filters.goldenOnly ? "#f5e6bf" : "var(--g-white)", color: filters.goldenOnly ? "#7a5c12" : "var(--g-ink)", fontWeight: 700 }}
              >
                ★ Golden only
              </button>
              <button
                type="button"
                onClick={discoverHere}
                disabled={discovering}
                style={{
                  padding: "8px 16px", borderRadius: "var(--radius-pill)", border: "none",
                  background: "var(--g-green-darker)", color: "#fff", fontSize: 12.5, fontWeight: 700,
                  cursor: discovering ? "wait" : "pointer", opacity: discovering ? 0.7 : 1, boxShadow: "var(--shadow-card)",
                }}
              >
                {discovering
                  ? `Finding ${filters.family ? `${JOB_FAMILY_LABEL[filters.family] ?? ""} ` : ""}jobs near you…`
                  : canFindMore
                    ? "Find more jobs"
                    : "Find jobs here"}
              </button>
            </div>
            {notice && (
              <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--g-ink-soft)", background: "var(--g-white)", padding: "6px 12px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-card)", margin: 0, maxWidth: 340 }}>
                {notice}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
            <div style={{ display: "flex", background: "var(--g-white)", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-card)", padding: 3, gap: 2 }}>
              <ViewToggleButton active={viewMode === "map"} onClick={() => setViewMode("map")} icon={<MapsPinIcon size={14} color={viewMode === "map" ? "#fff" : "var(--g-ink-soft)"} />} label="Map" />
              <ViewToggleButton active={viewMode === "list"} onClick={() => setViewMode("list")} icon={<TableIcon size={14} color={viewMode === "list" ? "#fff" : "var(--g-ink-soft)"} />} label="List" />
            </div>
            <DashboardModeBadge />
            <CreditsIndicator />
          </div>
        </div>

        {/* Floating bottom-left stats pill -- what's actually on screen right now. A spinner +
            "Loading…" while the count is still settling (matches the reference's own stat pills,
            which show the same mid-fetch rather than jumping straight from blank to a number). */}
        <div style={{ position: "absolute", bottom: 16, left: 14, zIndex: 5, display: "flex", gap: 8 }}>
          {loading ? (
            <>
              <StatPill loading label="companies" />
              <StatPill loading label="jobs" />
            </>
          ) : (
            <>
              <StatPill label={`${totalCompanies.toLocaleString("en-IN")} ${totalCompanies === 1 ? "company" : "companies"}`} />
              <StatPill label={`${jobs.length.toLocaleString("en-IN")} ${jobs.length === 1 ? "job" : "jobs"}`} />
            </>
          )}
        </div>

        {hovered && hoveredStack.length > 0 && (
          <div
            onMouseEnter={clearHoverHide}
            onMouseLeave={scheduleHoverHide}
            style={{
              position: "absolute", left: hovered.x + 14, top: hovered.y - 10,
              width: 250, maxHeight: 300, overflowY: "auto",
              background: "var(--g-white)", border: "1px solid var(--g-border)",
              borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", zIndex: 10, padding: 10,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--g-ink)", marginBottom: 8, paddingLeft: 2 }}>
              {hoveredStack.length} companies here
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {hoveredStack.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(c.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    padding: "7px 9px", borderRadius: "var(--radius-sm)", cursor: "pointer",
                    border: `1px solid ${c.goldenTier ? "#d4a72c" : "var(--g-border)"}`,
                    background: "var(--g-white)", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--g-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.name}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 10.5, color: "var(--g-gray-500)" }}>
                    {c.roles > 0 ? `${c.roles} role${c.roles > 1 ? "s" : ""}` : "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hovered && hoveredCompany && (
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
              {hoveredCompany.name}
              {hoveredJobs.length > 0
                ? ` · ${hoveredJobs.length} open role${hoveredJobs.length > 1 ? "s" : ""}`
                : ""}
            </div>
            {hoveredJobs.length === 0 && (
              <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", paddingLeft: 2, paddingBottom: 2 }}>
                No open roles right now — click to see the company.
              </div>
            )}
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

      {viewMode === "list" && (
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
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 600, margin: "0 0 10px", color: "var(--g-ink)" }}>
              Jobs
            </h1>
            {!profileComplete && (
              <Link
                href="/jobs/profile"
                style={{
                  display: "block", padding: "9px 12px", borderRadius: "var(--radius-sm)",
                  background: "var(--g-green-mint)", color: "var(--g-green-text)", textDecoration: "none",
                  fontSize: 12.5, fontWeight: 700,
                }}
              >
                Add your resume to unlock your match on every job →
              </Link>
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
      )}

      {selectedCompanyId && companyDetail && (
        <CompanyJobsPanel
          company={companyDetail.company}
          jobs={companyDetail.jobs}
          loading={companyLoading}
          onClose={() => setSelectedCompanyId(null)}
          onOpenJob={setSelected}
          onSave={toggleSave}
        />
      )}

      {selected && <JobDetailPanel job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/**
 * Right-docked, all of a company's open roles at once -- what "click a pin" opens on the reference
 * (a company bar with its openings listed), instead of jumping straight into one role's full-screen
 * modal. A row's own "View details" step is what opens JobDetailPanel for a deeper look + apply.
 */
function CompanyJobsPanel({
  company, jobs, loading, onClose, onOpenJob, onSave,
}: {
  company: { id: string; name: string; faviconUrl: string | null; goldenTier: string | null; careersUrl: string | null };
  jobs: JobCardData[];
  loading: boolean;
  onClose: () => void; onOpenJob: (job: JobCardData) => void; onSave: (job: JobCardData) => void;
}) {
  // The company is passed in rather than read off jobs[0]: a pin with no open roles has no jobs to
  // read it from, and those are the majority of pins on the map.
  const golden = !!company.goldenTier;
  return (
    <aside
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)", zIndex: 40,
        background: "var(--g-white)", boxShadow: "-8px 0 24px rgba(20,32,20,0.12)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ padding: "10px 16px", textAlign: "center", fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: golden ? "#d4a72c" : jobs.length ? "var(--g-green-darker)" : "var(--g-gray-500)" }}>
        {golden ? "Golden opportunity" : jobs.length ? "Hiring" : "No open roles"}
      </div>
      <div style={{ padding: 16, borderBottom: "1px solid var(--g-border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {company.faviconUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote favicon, no loader needed
          <img src={company.faviconUrl} alt="" width={40} height={40} style={{ borderRadius: 8, border: "1px solid var(--g-border)", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--g-ink)" }}>{company.name}</div>
          <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>
            {loading ? "Loading roles…" : `${jobs.length} open role${jobs.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}>
          <XIcon />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {!loading && jobs.length === 0 && (
          <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.6 }}>
            Nothing open at {company.name} right now. Mantis re-checks this company on a schedule, so
            it will appear here when it starts hiring.
            {company.careersUrl && (
              <>
                {" "}
                <a href={company.careersUrl} target="_blank" rel="noreferrer" style={{ color: "var(--g-green-text)" }}>
                  Careers page
                </a>
              </>
            )}
          </div>
        )}
        {jobs.map((job) => (
          <div key={job.id} style={{ border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", marginBottom: 3 }}>{job.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {job.jobFamily && <ChipTag>{JOB_FAMILY_LABEL[job.jobFamily] ?? job.jobFamily}</ChipTag>}
              {job.location && <ChipTag>{job.location}</ChipTag>}
              {job.workMode && <ChipTag>{job.workMode.charAt(0).toUpperCase() + job.workMode.slice(1)}</ChipTag>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => onOpenJob(job)}
                style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)", background: "var(--g-white)", color: "var(--g-ink)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => onSave(job)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: job.applicationStatus ? "var(--g-green-mint)" : "var(--g-green-darker)",
                  color: job.applicationStatus ? "var(--g-green-text)" : "#fff",
                }}
              >
                {job.applicationStatus ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ChipTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-ink-soft)", background: "var(--g-cream)", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>
      {children}
    </span>
  );
}


function ViewToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
        borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
        background: active ? "var(--g-green-darker)" : "transparent",
        color: active ? "#fff" : "var(--g-ink-soft)", fontSize: 12, fontWeight: 700,
      }}
    >
      {icon} {label}
    </button>
  );
}

function StatPill({ label, loading }: { label: string; loading?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--g-white)", padding: "7px 14px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-card)", fontSize: 12, fontWeight: 700, color: loading ? "var(--g-gray-500)" : "var(--g-ink)" }}>
      {loading && <Spinner />}
      {loading ? `Loading ${label}…` : label}
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 11, height: 11, borderRadius: "50%", flexShrink: 0,
        border: "2px solid var(--g-border)", borderTopColor: "var(--g-gray-500)",
        animation: "gigzman-spin 0.7s linear infinite",
      }}
    />
  );
}

const floatingSelectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12,
  fontFamily: "inherit",
  boxShadow: "var(--shadow-card)",
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", textAlign: "center", padding: "40px 20px", lineHeight: 1.6 }}>
      {children}
    </p>
  );
}
