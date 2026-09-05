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
 * Discovery is explicit ("Find jobs here") rather than automatic on pan, unlike leads. Scraping a
 * viewport is a real crawl of ~25 sites; firing it on every idle would hammer other people's
 * servers and burn credits for someone who was only scrolling past.
 */

const DEFAULT_CENTER = { lat: 28.4595, lng: 77.0266 }; // Gurugram — same default as leads
const DEFAULT_ZOOM = 13;

type Filters = { family: string; workMode: string; goldenOnly: boolean };

export default function JobsPage() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [profileComplete, setProfileComplete] = useState(true);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobCardData | null>(null);
  const [filters, setFilters] = useState<Filters>({ family: "", workMode: "", goldenOnly: false });

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
    if (filters.workMode) params.set("work_mode", filters.workMode);
    if (filters.goldenOnly) params.set("golden", "true");

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setProfileComplete(data.profileComplete !== false);
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
      map.addListener("idle", () => void loadJobs());
    });
    return () => {
      cancelled = true;
    };
    // loadJobs is intentionally not a dep: the idle listener closes over the first instance, and
    // re-registering it on every filter change would stack duplicate listeners. Filter changes are
    // handled by the effect below instead.
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
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: golden ? 9 : 7,
          fillColor: golden ? "#d4a72c" : "#1f8a54",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => setSelected(first));
      markersRef.current.push(marker);
    }
  }, [jobs]);

  /** The crawl. Explicit, charged, and bounded — see the note at the top of this file. */
  async function discoverHere() {
    const bounds = mapRef.current?.getBounds();
    if (!bounds) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    setDiscovering(true);
    setNotice(null);
    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swLat: sw.lat(), swLng: sw.lng(), neLat: ne.lat(), neLng: ne.lng() }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setNotice("Not enough credits for a job scan.");
        window.dispatchEvent(new Event("gigzman:open-plans"));
        return;
      }
      if (!res.ok) {
        setNotice("Job scan failed. Try again.");
        return;
      }
      if (data.scanned === 0) {
        setNotice("Every business here has already been scanned. Listings refresh every 10 days.");
      } else {
        setNotice(`Scanned ${data.companies} businesses · found ${data.jobs} new roles.`);
        window.dispatchEvent(new Event("gigzman:credits-changed"));
      }
      await loadJobs();
    } finally {
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
      <div ref={mapDivRef} style={{ flex: 1, minWidth: 0, height: "100%" }} />

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
            >
              <option value="">All profiles</option>
              {Object.entries(JOB_FAMILY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
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
          {loading && !jobs.length && <Empty>Loading…</Empty>}
          {!loading && !jobs.length && (
            <Empty>
              No roles stored for this area yet. Move the map to where you want to work, then hit
              <strong> Find jobs here</strong>.
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
