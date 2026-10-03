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

/**
 * Zoom bounds. The map had none at all, so it could be zoomed out to a continent -- at which point
 * one `idle` asked the API for a bbox covering most of India (filling the 500-company LIMIT),
 * rendered every one of those into the same few hundred pixels, and then billed a Places sweep for
 * a "viewport" no user was actually looking at. The leads map has had a ZOOM_FLOOR since the same
 * thing happened there; this is that floor, plus a hard minZoom so the state is hard to reach in
 * the first place rather than merely handled once reached.
 */
const ZOOM_FLOOR = 11;
const MIN_ZOOM = 9;
const MAX_ZOOM = 19;

/** Same ladder as the leads map: how many pins may render at a given zoom. Dense viewports hold
 * several hundred companies and each one costs a marker plus an O(n^2) crowding comparison. */
const PIN_CAP_BY_ZOOM: Array<[minZoom: number, cap: number]> = [
  [17, 300],
  [15, 150],
  [13, 60],
];

/** A pin with this much clear space around it shows its full name; below it, a truncated one;
 * below LABEL_MIN_SPACING_PX, no label at all. A 48px card with a ~110px chip under it needs
 * appreciably more than the card's own width before two chips stop touching. */
const LABEL_FULL_SPACING_PX = 120;
const LABEL_MIN_SPACING_PX = 62;

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

/** Ring colours that earn a coloured halo: gold, and the green that means "has open roles". The
 * grey no-roles ring deliberately gets none -- the glow is the signal that there is something here
 * worth clicking, so putting it on every card would say nothing. */
const GLOW_RINGS = new Set(["#d4a72c", "#1f8a54"]);

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

const LABEL_FONT_SIZE = 12;
const LABEL_HEIGHT = 19;
const LABEL_GAP = 4; // reference's own card-edge-to-chip gap

/**
 * One SVG for the whole pin: fan slivers, card, glow, count badge and name chip together.
 *
 * Each of those used to be its OWN google.maps.Marker, positioned by converting a pixel offset
 * into a lat/lng (the old offsetLatLng). That had two costs. The cheap one: three to five markers
 * per company, which at a 500-company viewport meant well over a thousand legacy Markers. The
 * expensive one: a geographic offset is only correct at the zoom it was computed for, so the label
 * and the badge visibly slid away from their card during every zoom animation and only snapped
 * back once a re-render recomputed them.
 *
 * Drawing them into a single canvas fixes both. The offsets below are plain SVG coordinates, so
 * they are correct at every zoom by construction, and a pin is now at most two markers -- this one
 * plus the favicon, which has to stay separate because it is a cross-origin image (see the
 * canvas-tainting note on faviconOverlayIcon).
 */
type CompositeSpec = {
  size: number;
  ringColor: string;
  elevated: boolean;
  /** null hides the chip entirely -- what the crowding pass does when neighbours are too close. */
  label: string | null;
  /** >1 draws the red count badge at the card's top-right and a fanned stack behind it. */
  count: number;
};

function estimateLabelWidth(label: string): number {
  // A data-URI SVG cannot measure its own text, so the chip is sized from character count. 0.62em
  // rather than the 0.55em used before: 0.55 is about right for lowercase Latin and too narrow for
  // capitals, digits and Devanagari, which is why long/uppercase company names were spilling past
  // the chip's rounded edge. Over-wide is invisible (the chip is centred); under-wide is a bug.
  return Math.round(label.length * LABEL_FONT_SIZE * 0.62 + 12);
}

function compositeCardIcon(spec: CompositeSpec): google.maps.Icon {
  const { size, ringColor, elevated, label, count } = spec;
  const r = size * CARD_RADIUS_RATIO;
  const slivers = Math.min(count, 3);
  const fanSpreadX = slivers > 1 ? FAN_OFFSETS[slivers - 1].dx : 0;
  const fanSpreadY = slivers > 1 ? -FAN_OFFSETS[slivers - 1].dy : 0;

  // Room for the drop shadow, the badge sticking out of the top-right corner, and the fan.
  const padX = 12 + fanSpreadX;
  const padTop = 12 + fanSpreadY;
  const badge = count > 1 ? 24 : 0;

  const cardBoxW = size + padX * 2;
  const labelW = label ? estimateLabelWidth(label) : 0;
  const canvasW = Math.max(cardBoxW, labelW + 8);
  const cardX = (canvasW - size) / 2;
  const cardY = padTop;
  const labelTop = cardY + size + LABEL_GAP;
  const canvasH = labelTop + (label ? LABEL_HEIGHT + 6 : 0) + 12;

  const dy = elevated ? 4 : 2;
  const blur = elevated ? 6 : 4;
  const opacity = elevated ? 0.36 : 0.3;
  // A second, coloured shadow with no offset reads as a halo around the stroke rather than a
  // drop shadow. Kept low-opacity and tight: at map density anything stronger turns into a smear
  // where cards sit close together.
  const glow = GLOW_RINGS.has(ringColor)
    ? `<feDropShadow dx="0" dy="0" stdDeviation="${elevated ? 3 : 2}" flood-color="${ringColor}" flood-opacity="${elevated ? 0.75 : 0.55}"/>`
    : "";

  // Back-to-front: the deepest sliver first, so the real card ends up on top of its own stack.
  let fan = "";
  for (let i = slivers - 1; i >= 1; i--) {
    const sx = cardX + FAN_OFFSETS[i].dx;
    const sy = cardY + FAN_OFFSETS[i].dy;
    fan += `<rect x="${sx}" y="${sy}" width="${size}" height="${size}" rx="${r}" fill="#f4f5ef" stroke="#dde0d4" stroke-width="1.5"/>`;
  }

  // Reference pins its badge at top:-8px right:-8px on a 48px card.
  const badgeMarkup =
    count > 1
      ? `<circle cx="${cardX + size - badge * 0.25}" cy="${cardY + badge * 0.25}" r="${badge / 2 - 1}" fill="#e0483e" stroke="#ffffff" stroke-width="2"/>
         <text x="${cardX + size - badge * 0.25}" y="${cardY + badge * 0.25 + 1}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">${count > 99 ? "99+" : count}</text>`
      : "";

  // Reference values: 13px/500 on a 90%-white chip, 4px radius, soft drop shadow (no border). A
  // shadow rather than a stroke keeps the chip legible over both light and dark map tiles.
  const labelMarkup = label
    ? `<rect x="${(canvasW - labelW) / 2}" y="${labelTop}" width="${labelW}" height="${LABEL_HEIGHT}" rx="4" fill="rgba(255,255,255,0.92)" filter="url(#l)"/>
       <text x="${canvasW / 2}" y="${labelTop + LABEL_HEIGHT / 2 + 1}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${LABEL_FONT_SIZE}" font-weight="500" fill="#101214">${escapeXml(label)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
    <defs>
      <filter id="s" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000000" flood-opacity="${opacity}"/>
        ${glow}
      </filter>
      <filter id="l" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.2"/>
      </filter>
    </defs>
    ${fan}
    <rect x="${cardX}" y="${cardY}" width="${size}" height="${size}" rx="${r}" fill="#ffffff" stroke="${ringColor}" stroke-width="2" filter="url(#s)"/>
    ${badgeMarkup}
    ${labelMarkup}
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(canvasW, canvasH),
    // Anchored on the CARD's centre, not the canvas centre -- the canvas grows downwards for the
    // label and sideways for the fan, and the pin must stay nailed to its own coordinates.
    anchor: new google.maps.Point(canvasW / 2, cardY + size / 2),
  };
}

/** `&` and `<` in a company name would otherwise produce an SVG that silently fails to parse,
 * leaving a blank marker where a card should be. */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

/**
 * Icons are pure functions of their spec, and the same handful of specs recur across every pin on
 * screen (two sizes x four ring colours x labelled-or-not). Building one means serialising an SVG
 * and percent-encoding it, which was previously happening once per marker per render -- and twice
 * more per mousemove, since hover rebuilt both the grown and the resting icon. Memoised here so a
 * re-render is a Map lookup.
 */
const iconCache = new Map<string, google.maps.Icon>();

function cachedCompositeIcon(spec: CompositeSpec): google.maps.Icon {
  const key = `${spec.size}|${spec.ringColor}|${spec.elevated ? 1 : 0}|${spec.count}|${spec.label ?? ""}`;
  let icon = iconCache.get(key);
  if (!icon) {
    // Names make the key space unbounded over a long panning session; this is a plain bound, not an
    // LRU, because the working set is one viewport and a full rebuild is cheap.
    if (iconCache.size > 1500) iconCache.clear();
    icon = compositeCardIcon(spec);
    iconCache.set(key, icon);
  }
  return icon;
}

const faviconIconCache = new Map<string, google.maps.Icon>();

function cachedFaviconIcon(url: string, size: number): google.maps.Icon {
  const key = `${size}|${url}`;
  let icon = faviconIconCache.get(key);
  if (!icon) {
    if (faviconIconCache.size > 1500) faviconIconCache.clear();
    icon = faviconOverlayIcon(url, size);
    faviconIconCache.set(key, icon);
  }
  return icon;
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

/** One rendered pin: the composite card, the favicon on top of it when there is one, and enough
 * state to decide on the next render whether anything about it actually changed. */
type Pin = {
  card: google.maps.Marker;
  favicon: google.maps.Marker | null;
  spec: { size: number; ringColor: string; label: string | null; count: number };
  signature: string;
  members: Array<{ id: string; name: string; roles: number; faviconUrl: string | null }>;
};

function destroyPin(pin: Pin) {
  google.maps.event.clearInstanceListeners(pin.card);
  pin.card.setMap(null);
  if (pin.favicon) {
    google.maps.event.clearInstanceListeners(pin.favicon);
    pin.favicon.setMap(null);
  }
}

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
  /** Every rendered pin, keyed by cluster identity, so a re-render can diff instead of rebuild. */
  const pinsRef = useRef<Map<string, Pin>>(new Map());

  const [jobs, setJobs] = useState<JobCardData[]>([]);
  // Mirrors `jobs` synchronously for the discovery loop below -- setJobs's re-render isn't
  // guaranteed to land before the loop's next await resumes, and checking a stale `jobs` closure
  // against TARGET_JOBS would let the loop run past the target it's meant to stop at.
  const jobsRef = useRef<JobCardData[]>([]);
  /** Guards against an older /api/jobs response landing after a newer one. */
  const loadTokenRef = useRef(0);
  const [companyPins, setCompanyPins] = useState<CompanyPin[]>([]);
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
  const lastReloadRef = useRef(0);
  const pendingReloadRef = useRef(false);
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
    // Above the floor only. A continent-wide bbox fills the route's 500-company LIMIT with pins
    // that all land on the same few pixels, for a view nobody is reading individual cards in.
    if ((map?.getZoom() ?? DEFAULT_ZOOM) < ZOOM_FLOOR) {
      jobsRef.current = [];
      setJobs([]);
      setCompanyPins([]);
      setNotice("Zoom in to see companies and roles.");
      return;
    }
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

    // A pan during an in-flight read used to let the older response land last and repaint the map
    // with the previous viewport's pins. Each load now invalidates the one before it.
    const token = ++loadTokenRef.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      if (token !== loadTokenRef.current) return;
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
      if (token === loadTokenRef.current) setNotice("Could not load jobs. Try again.");
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }, [filters]);

  // Map bootstrap.
  useEffect(() => {
    let cancelled = false;
    const pins = pinsRef.current;
    loadGoogleMaps().then(() => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      const map = new google.maps.Map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      });
      mapRef.current = map;
      map.addListener("idle", () => {
        // Zoom is read here rather than from `zoom_changed`. That event fires repeatedly through a
        // smooth zoom, and since the render effect depends on this value, every one of those ticks
        // used to re-cluster and rebuild the whole map mid-animation. Markers are anchored to
        // lat/lng, so they follow the animation on their own; re-clustering once it settles is
        // both correct and the only moment the result can actually be read.
        setMapZoom(map.getZoom() ?? DEFAULT_ZOOM);

        // Stored listings for the new viewport go up first — free, and shouldn't wait on the
        // debounce below (matches app/(app)/home/page.tsx's own leads-first-then-discover order).
        void loadJobs();

        if (idleSearchTimerRef.current) clearTimeout(idleSearchTimerRef.current);
        // Never bill a sweep for a view the user cannot read individual companies in.
        if ((map.getZoom() ?? DEFAULT_ZOOM) < ZOOM_FLOOR) return;
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
      // Markers hold listeners that close over component state; leaving them attached to a map
      // this component no longer owns leaks both. Read into a local first: the lint rule is right
      // that `pinsRef.current` may be a different Map by the time a cleanup runs, and here it
      // genuinely is -- the render effect replaces entries throughout the component's life.
      for (const pin of pins.values()) destroyPin(pin);
      pins.clear();
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

  /**
   * Every pin on the map, in one pass.
   *
   * This used to be two independent effects -- one for companies with open roles, one for the
   * "found, nothing right now" pins -- each running its own clusterByPixelDistance over its own
   * half of the data. CLUSTER_PIXEL_RADIUS only ever separated a set from itself, so a has-roles
   * card and a no-roles card sitting at the same address stayed two full-size overlapping cards at
   * every zoom. Clustering the union is the fix, and merging the effects is what makes that
   * possible.
   *
   * It also no longer tears the map down to rebuild it. The old version called setMap(null) on
   * every marker and recreated all of them whenever `jobs`, `companyPins` or the zoom changed,
   * which at a few hundred companies was thousands of marker constructions per zoom tick. Pins are
   * now keyed by cluster identity and diffed: an unchanged pin is left completely alone, a changed
   * one gets setIcon, and only genuinely departed pins are destroyed.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Nothing is rendered below the floor. At a country-wide view every pin lands in the same few
    // pixels anyway, so the only thing a full render buys there is a stalled main thread.
    if (mapZoom < ZOOM_FLOOR) {
      for (const pin of pinsRef.current.values()) destroyPin(pin);
      pinsRef.current.clear();
      return;
    }

    type PinSource = {
      id: string;
      lat: number;
      lng: number;
      name: string;
      faviconUrl: string | null;
      goldenTier: string | null;
      roles: number;
    };

    // Roles first: a company with open listings is described by `jobs`, which carries the live
    // per-user application state the companies array does not.
    const byCompany = new Map<string, PinSource>();
    for (const job of jobs) {
      const c = job.company;
      if (c.lat == null || c.lng == null) continue;
      const existing = byCompany.get(c.id);
      if (existing) existing.roles++;
      else
        byCompany.set(c.id, {
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          name: c.name,
          faviconUrl: c.faviconUrl,
          goldenTier: c.goldenTier ?? null,
          roles: 1,
        });
    }
    // Then the discovered-but-not-hiring pins, skipping anything already described above so a
    // company never gets two cards.
    for (const c of companyPins) {
      if (c.lat == null || c.lng == null || byCompany.has(c.id)) continue;
      if (c.hasOpenJobs) continue;
      byCompany.set(c.id, {
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        name: c.name,
        faviconUrl: c.faviconUrl,
        goldenTier: c.goldenTier,
        roles: 0,
      });
    }

    // Dense viewports can hold several hundred companies, and every one of them is a marker plus
    // an O(n^2) crowding comparison below. The leads map hit exactly this and capped by zoom
    // (app/(app)/home/page.tsx); the same ladder applies here. Survivors are chosen by distance
    // from the map centre, not by tier, so zooming into a corner never shows pins from elsewhere
    // in preference to the ones actually under the viewport.
    const centre = map.getCenter();
    let all = Array.from(byCompany.values());
    const cap = PIN_CAP_BY_ZOOM.find(([minZoom]) => mapZoom >= minZoom)?.[1] ?? 40;
    if (all.length > cap && centre) {
      const cLat = centre.lat();
      const cLng = centre.lng();
      all = all
        .map((p) => ({ p, d: haversineMeters(cLat, cLng, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, cap)
        .map((x) => x.p);
    }

    // Golden-tier companies never cluster -- they stay individually visible and clickable at every
    // zoom (the reference's own "notable companies always shown individually" pattern). Everything
    // else clusters by on-screen distance.
    const golden = all.filter((c) => c.goldenTier);
    const ordinary = all.filter((c) => !c.goldenTier);

    type Rendered = {
      key: string;
      lat: number;
      lng: number;
      members: PinSource[];
      size: number;
      ringColor: string;
      title: string;
      /** Label text before the crowding pass has had its say. */
      name: string;
    };

    const rendered: Rendered[] = [];

    for (const g of golden) {
      rendered.push({
        key: `g:${g.id}`,
        lat: g.lat,
        lng: g.lng,
        members: [g],
        size: GOLDEN_CARD_SIZE,
        ringColor: "#d4a72c",
        title: g.roles
          ? `${g.name} — ${g.roles} open role${g.roles > 1 ? "s" : ""}`
          : `${g.name} — no open roles right now`,
        name: g.name,
      });
    }

    for (const cluster of clusterByPixelDistance(ordinary, mapZoom)) {
      // The company with the most open roles fronts the stack -- it is the one worth clicking.
      const front = [...cluster].sort((a, b) => b.roles - a.roles)[0];
      const totalRoles = cluster.reduce((n, c) => n + c.roles, 0);
      const hasRoles = totalRoles > 0;
      rendered.push({
        // Keyed by the whole membership, so a cluster that gains or loses a company is treated as a
        // different pin rather than silently keeping a stale badge count.
        key: `c:${cluster.map((c) => c.id).sort().join(",")}`,
        lat: front.lat,
        lng: front.lng,
        members: cluster,
        size: ORDINARY_CARD_SIZE,
        // Grey means "checked, nothing here right now" -- the same signal the single no-roles card
        // carried before, now also correct for a stack where none of the members are hiring.
        ringColor: hasRoles ? "#1f8a54" : "#d8dcd0",
        title:
          cluster.length > 1
            ? `${cluster.length} companies here${hasRoles ? ` — ${totalRoles} open role${totalRoles > 1 ? "s" : ""}` : " — no open roles right now"}`
            : hasRoles
              ? `${front.name} — ${totalRoles} open role${totalRoles > 1 ? "s" : ""}`
              : `${front.name} — no open roles right now`,
        name: front.name,
      });
    }

    // ── Label crowding ────────────────────────────────────────────────────────────────────────
    // Every pin used to carry its name unconditionally, which is what made the chips pile on top of
    // each other wherever companies sit close together. Same idea as the leads map's label pass: a
    // pin with room around it shows its full name, one with a near neighbour shows a truncated one,
    // and one in a genuinely packed spot shows none at all. Done here in geographic space rather
    // than against the DOM, so it needs no projection, no rAF and no second pass -- the pixel
    // thresholds are converted to metres at the current zoom exactly as the clusterer does it.
    const labels = new Map<string, string | null>();
    for (const item of rendered) {
      const mpp = metersPerPixel(item.lat, mapZoom);
      const fullMeters = LABEL_FULL_SPACING_PX * mpp;
      const anyMeters = LABEL_MIN_SPACING_PX * mpp;
      let nearest = Infinity;
      for (const other of rendered) {
        if (other === item) continue;
        const d = haversineMeters(item.lat, item.lng, other.lat, other.lng);
        if (d < nearest) nearest = d;
        if (nearest < anyMeters) break; // already as crowded as it gets; stop comparing
      }
      labels.set(
        item.key,
        nearest >= fullMeters
          ? item.name.length > 22
            ? `${item.name.slice(0, 21)}…`
            : item.name
          : nearest >= anyMeters
            ? `${item.name.slice(0, 3)}····`
            : null,
      );
    }

    // ── Diff ──────────────────────────────────────────────────────────────────────────────────
    const live = new Set(rendered.map((r) => r.key));
    for (const [key, pin] of pinsRef.current) {
      if (!live.has(key)) {
        destroyPin(pin);
        pinsRef.current.delete(key);
      }
    }

    for (const item of rendered) {
      const label = labels.get(item.key) ?? null;
      const count = item.members.length;
      // The stack's front card wears the favicon of whichever member has the most open roles.
      const faviconUrl = [...item.members].sort((a, b) => b.roles - a.roles)[0].faviconUrl;
      const signature = `${item.size}|${item.ringColor}|${count}|${label ?? ""}|${faviconUrl ?? ""}`;

      const existing = pinsRef.current.get(item.key);
      if (existing) {
        // The common case by far: same pin, same look, nothing to do. Even when the look has
        // changed (a label truncating as neighbours arrive) this is two setIcon calls rather than
        // a destroy-and-rebuild, so the marker never blinks.
        if (existing.signature !== signature) {
          existing.signature = signature;
          existing.spec = { size: item.size, ringColor: item.ringColor, label, count };
          existing.card.setIcon(cachedCompositeIcon({ ...existing.spec, elevated: false }));
          if (existing.favicon && faviconUrl) existing.favicon.setIcon(cachedFaviconIcon(faviconUrl, item.size));
        }
        existing.members = item.members;
        existing.card.setTitle(item.title);
        if (existing.favicon) existing.favicon.setTitle(item.title);
        continue;
      }

      const position = { lat: item.lat, lng: item.lng };
      const spec = { size: item.size, ringColor: item.ringColor, label, count };
      const card = new google.maps.Marker({
        position,
        map,
        title: item.title,
        zIndex: 2,
        icon: cachedCompositeIcon({ ...spec, elevated: false }),
      });
      const favicon = faviconUrl
        ? new google.maps.Marker({
            position,
            map,
            title: item.title,
            zIndex: 3,
            icon: cachedFaviconIcon(faviconUrl, item.size),
          })
        : null;

      const pin: Pin = { card, favicon, spec, signature, members: item.members };
      pinsRef.current.set(item.key, pin);

      // Listeners close over `pin`, not over this render's data, so a later diff that mutates
      // pin.members is picked up without re-registering anything.
      const topMarker = favicon ?? card;
      topMarker.addListener("click", () => {
        if (pin.members.length > 1) {
          // No single company to show yet -- zoom until the stack separates into its own cards.
          map.panTo(position);
          map.setZoom(Math.min((map.getZoom() ?? DEFAULT_ZOOM) + 3, MAX_ZOOM));
        } else {
          setSelectedCompanyId(pin.members[0].id);
        }
      });
      topMarker.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
        // Grow the card and its logo slightly as well as deepening the shadow -- a shadow change
        // alone is easy to miss on a busy map, and the lift should read as "this one is under the
        // cursor" at a glance.
        const grown = Math.round(pin.spec.size * HOVER_SCALE);
        pin.card.setIcon(cachedCompositeIcon({ ...pin.spec, size: grown, elevated: true }));
        if (pin.favicon && faviconUrl) pin.favicon.setIcon(cachedFaviconIcon(faviconUrl, grown));
        pin.card.setZIndex(6);
        pin.favicon?.setZIndex(7);
        clearHoverHide();
        const box = mapDivRef.current?.getBoundingClientRect();
        const dom = e.domEvent as MouseEvent | undefined;
        if (!box || !dom) return;
        setHovered({
          companyIds: pin.members.map((m) => m.id),
          x: dom.clientX - box.left,
          y: dom.clientY - box.top,
        });
      });
      topMarker.addListener("mouseout", () => {
        pin.card.setIcon(cachedCompositeIcon({ ...pin.spec, elevated: false }));
        if (pin.favicon && faviconUrl) pin.favicon.setIcon(cachedFaviconIcon(faviconUrl, pin.spec.size));
        pin.card.setZIndex(2);
        pin.favicon?.setZIndex(3);
        scheduleHoverHide();
      });
    }
    // clearHoverHide/scheduleHoverHide are intentionally not deps: they are re-created on every
    // render, and listing them would re-run this whole diff (and so re-register every listener)
    // on each one. They only ever touch a ref, so the instance captured here stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, companyPins, mapZoom]);

  // Hard ceiling on how many small crawl batches ONE tile will chase before moving on, in case
  // something upstream keeps claiming hasMore (a stuck company, a bug) -- caps worst-case latency
  // per tile rather than looping indefinitely.
  const MAX_ROUNDS_PER_TILE = 10;

  /** Floor on how often the incremental refresh inside a search may repaint the map. */
  const RELOAD_MIN_INTERVAL_MS = 1500;

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
    if ((map.getZoom() ?? DEFAULT_ZOOM) < ZOOM_FLOOR) {
      setNotice("Zoom in to search this area.");
      return;
    }
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

          // Refresh as the crawl progresses -- this is what makes discovery feel incremental
          // instead of one long wait. Rate-limited, though: a round can complete in well under a
          // second, and reloading on every one of them meant the API's four queries plus a full
          // re-render dozens of times inside a single search, which is most of what made searching
          // feel slow. At most one refresh per RELOAD_MIN_INTERVAL_MS; the final one below is
          // unconditional, so nothing is ever left unshown.
          if (data.companies > 0 || data.placesCalls > 0) {
            const now = Date.now();
            if (now - lastReloadRef.current >= RELOAD_MIN_INTERVAL_MS) {
              lastReloadRef.current = now;
              await loadJobs();
            } else {
              pendingReloadRef.current = true;
            }
          }
          if (anyCharged) window.dispatchEvent(new Event("gigzman:credits-changed"));

          if (!data.hasMore) break;
          if (jobsRef.current.length >= TARGET_JOBS) break;
        }
        if (jobsRef.current.length >= TARGET_JOBS) break;
      }

      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        lastReloadRef.current = Date.now();
        await loadJobs();
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
                style={{ ...floatingSelectStyle, cursor: "pointer", background: filters.goldenOnly ? "#f5e6bf" : "var(--g-white)", color: filters.goldenOnly ? "#7a5c12" : "var(--g-ink)", fontWeight: 600 }}
              >
                ★ Golden only
              </button>
              <button
                type="button"
                onClick={discoverHere}
                disabled={discovering}
                style={{
                  padding: "8px 16px", borderRadius: "var(--radius-pill)", border: "none",
                  background: "var(--g-green-darker)", color: "#fff", fontSize: 12.5, fontWeight: 600,
                  cursor: discovering ? "wait" : "pointer", opacity: discovering ? 0.7 : 1, boxShadow: "var(--shadow-pop)",
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
              <p style={{ fontSize: 11.5, fontWeight: 500, color: "var(--g-ink-soft)", background: "var(--g-white)", border: "1px solid var(--g-border)", padding: "6px 12px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-pop)", margin: 0, maxWidth: 340 }}>
                {notice}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
            <div style={{ display: "flex", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-pop)", padding: 3, gap: 2 }}>
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
              borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-pop)", zIndex: 10, padding: 10,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--g-ink)", marginBottom: 8, paddingLeft: 2 }}>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--g-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
              boxShadow: "var(--shadow-pop)",
              zIndex: 10,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--g-ink)", marginBottom: 8, paddingLeft: 2 }}>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--g-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                      flexShrink: 0, fontSize: 10.5, fontWeight: 600, padding: "5px 9px",
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
                  fontSize: 12.5, fontWeight: 600,
                }}
              >
                Add your resume to unlock your match on every job →
              </Link>
            )}
          </div>

          <div className="stagger" style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
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
      <div style={{ padding: "10px 16px", textAlign: "center", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: golden ? "#d4a72c" : jobs.length ? "var(--g-green-darker)" : "var(--g-gray-500)" }}>
        {golden ? "Golden opportunity" : jobs.length ? "Hiring" : "No open roles"}
      </div>
      <div style={{ padding: 16, borderBottom: "1px solid var(--g-border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {company.faviconUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote favicon, no loader needed
          <img src={company.faviconUrl} alt="" width={40} height={40} style={{ borderRadius: 8, border: "1px solid var(--g-border)", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--g-ink)" }}>{company.name}</div>
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
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--g-ink)", marginBottom: 3 }}>{job.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {job.jobFamily && <ChipTag>{JOB_FAMILY_LABEL[job.jobFamily] ?? job.jobFamily}</ChipTag>}
              {job.location && <ChipTag>{job.location}</ChipTag>}
              {job.workMode && <ChipTag>{job.workMode.charAt(0).toUpperCase() + job.workMode.slice(1)}</ChipTag>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => onOpenJob(job)}
                style={{ flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)", border: "1px solid var(--g-border)", background: "var(--g-white)", color: "var(--g-ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => onSave(job)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
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
    <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--g-ink-soft)", background: "var(--g-cream)", padding: "3px 8px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" }}>
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
        color: active ? "#fff" : "var(--g-ink-soft)", fontSize: 12, fontWeight: 600,
      }}
    >
      {icon} {label}
    </button>
  );
}

function StatPill({ label, loading }: { label: string; loading?: boolean }) {
  return (
    <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--g-white)", border: "1px solid var(--g-border)", padding: "6px 13px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-pop)", fontSize: 12, fontWeight: 600, color: loading ? "var(--g-gray-500)" : "var(--g-ink)" }}>
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
  padding: "7px 12px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12,
  fontFamily: "inherit",
  boxShadow: "var(--shadow-pop)",
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="sunk" style={{ fontSize: 12.5, color: "var(--g-gray-500)", textAlign: "center", padding: "40px 20px", lineHeight: 1.6, borderRadius: "var(--radius-md)", margin: 0 }}>
      {children}
    </p>
  );
}
