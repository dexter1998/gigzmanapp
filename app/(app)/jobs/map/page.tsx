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

// On a white disc with a colored ring, so a dark or transparent-background favicon never
// disappears against the map tiles behind it, and the ring communicates status at a glance (green
// = open roles, gold = golden-tier company with open roles, gray = nothing open right now) the way
// leads' pins carry a color without needing the card open. Built as an inline SVG data URI rather
// than stacked markers -- one marker is one click/hover target, and Google Maps gives no reliable
// z-index guarantee for two markers sharing a single lat/lng.
function faviconMarkerIcon(
  faviconUrl: string | null,
  opts: { size: number; ringColor: string } = { size: 60, ringColor: "#d8dcd0" }
): google.maps.Icon | google.maps.Symbol {
  const { size, ringColor } = opts;
  if (!faviconUrl) {
    return {
      path: google.maps.SymbolPath.CIRCLE, scale: size / 4,
      fillColor: ringColor === "#d8dcd0" ? "#c7ccb8" : ringColor,
      fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2,
    };
  }
  const ringWidth = 2.5;
  const inset = size * 0.17; // favicon diameter within the disc
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - ringWidth}" fill="#ffffff" stroke="${ringColor}" stroke-width="${ringWidth}"/>
    <image href="${faviconUrl}" x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export default function JobsPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [jobs, setJobs] = useState<JobCardData[]>([]);
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
      setJobs(data.jobs ?? []);
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
      const marker = new google.maps.Marker({
        position: { lat: first.company.lat as number, lng: first.company.lng as number },
        map,
        title: `${first.company.name} — ${companyJobs.length} open role${companyJobs.length > 1 ? "s" : ""}`,
        icon: faviconMarkerIcon(first.company.faviconUrl, {
          size: golden ? 68 : 60,
          ringColor: golden ? "#d4a72c" : "#1f8a54",
        }),
      });
      marker.addListener("click", () => setSelected(first));
      // Hover shows a compact, scrollable list of this company's own roles (not the full detail
      // panel — that stays a click-through action). `domEvent` is a plain MouseEvent on a classic
      // Marker, so its client coordinates position the card without a separate projection lookup.
      marker.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
        clearHoverHide();
        const box = mapDivRef.current?.getBoundingClientRect();
        const dom = e.domEvent as MouseEvent | undefined;
        if (!box || !dom) return;
        setHovered({ companyId: first.company.id, x: dom.clientX - box.left, y: dom.clientY - box.top });
      });
      marker.addListener("mouseout", scheduleHoverHide);
      markersRef.current.push(marker);
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
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map,
        title: `${c.name} — no open roles right now`,
        icon: faviconMarkerIcon(c.faviconUrl, { size: 60, ringColor: "#d8dcd0" }),
        opacity: 0.9,
      });
      companyMarkersRef.current.push(marker);
    }
  }, [companyPins]);

  // Hard ceiling on how many small crawl batches one trigger will chase before stopping, in case
  // something upstream keeps claiming hasMore (a stuck company, a bug) -- caps worst-case latency
  // at ~10 * CRAWL_BATCH_SIZE companies rather than looping indefinitely.
  const MAX_DISCOVER_ROUNDS = 10;

  /**
   * The crawl. Fires automatically on pan (debounced, see the idle listener above) as well as from
   * the manual button. Each call only registers+scrapes a couple of companies at a time (see
   * CRAWL_BATCH_SIZE in app/api/jobs/discover/route.ts -- a single company's crawl can chain 10+
   * sequential fetches and blew past the request timeout when done 25 at once), so this loops,
   * refreshing the map after every round -- pins/favicon dots appear company by company as they're
   * found, the same incremental feel as the leads map's per-tile requests, instead of one long
   * silent wait that either times out or dumps everything at once at the end.
   */
  async function discoverHere() {
    const bounds = mapRef.current?.getBounds();
    if (!bounds || discoveringRef.current) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const body = JSON.stringify({ swLat: sw.lat(), swLng: sw.lng(), neLat: ne.lat(), neLng: ne.lng() });

    discoveringRef.current = true;
    setDiscovering(true);
    setNotice(null);
    let totalCompanies = 0;
    let totalJobs = 0;
    let anyPlacesCalls = false;
    let anyCharged = false;
    try {
      for (let round = 0; round < MAX_DISCOVER_ROUNDS; round++) {
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
        if (!res.ok) {
          setNotice("Job scan failed. Try again.");
          return;
        }
        // area_cooldown/session_budget fire on nearly every idle while dragging across new ground —
        // silent, matching how the leads map treats the same throttles, rather than flashing a
        // message the user didn't ask for on every settle.
        if (data.throttled === "area_cooldown" || data.throttled === "session_budget") {
          return;
        }
        totalCompanies += data.companies ?? 0;
        totalJobs += data.jobs ?? 0;
        if (data.placesCalls > 0) anyPlacesCalls = true;
        if (data.charged) anyCharged = true;

        // Refresh after every round, not just at the end -- this is what makes discovery feel
        // incremental instead of one long wait.
        if (data.companies > 0 || data.placesCalls > 0) await loadJobs();
        if (anyCharged) window.dispatchEvent(new Event("gigzman:credits-changed"));

        if (!data.hasMore) break;
      }

      if (totalCompanies === 0) {
        setNotice(
          anyPlacesCalls
            ? "No hiring businesses found in this area."
            : "Every business here has already been scanned. Listings refresh every 10 days."
        );
      } else {
        setNotice(`Scanned ${totalCompanies} businesses · found ${totalJobs} new roles.`);
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
              {discovering ? "Scanning…" : "Find jobs here"}
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
