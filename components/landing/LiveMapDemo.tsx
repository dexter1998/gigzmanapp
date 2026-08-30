"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadGoogleMaps } from "@/lib/google-maps";
import { createPinOverlayClass, LIGHT_MAP_STYLES, type PinOverlayInstance } from "@/lib/pin-overlay";
import { formatCategory } from "@/lib/categories";
import { PinIcon, ShieldIcon, ClipboardIcon, UserIcon, GlobeIcon, FilterIcon, LockIcon, ChevronRightIcon } from "@/components/icons";

type PublicLead = {
  id: string;
  business_name: string;
  category: string | null;
  section: string | null;
  lat: number | null;
  lng: number | null;
  has_website: boolean | null;
  rating: number | null;
  review_count: number | null;
  heat_score: number;
};

// The densest real cached cluster in production as of this build (see the query used to find
// it) — DLF Cyber City, Gurugram, close to the dashboard's own DEFAULT_CENTER. Chosen so an
// anonymous visitor always sees a full, real, already-cached map on first paint instead of an
// empty one — this demo never fetches anything beyond what's already stored.
const DEFAULT_CENTER = { lat: 28.49, lng: 77.09 };
const DEFAULT_ZOOM = 15;
const DEMO_RADIUS_METERS = 1600;
// How far the visitor is allowed to drag the map from DEFAULT_CENTER before it's gently pulled
// back — panning around the cached cluster a little is part of the demo, but wandering off to
// "search a new area" is exactly the real product behavior this page must not give away for
// free (see /api/public/leads — it only ever reads, there is nowhere to discover new ground).
const MAX_PAN_METERS = 1800;

export function LiveMapDemo() {
  const router = useRouter();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, PinOverlayInstance>>(new Map());
  const PinOverlayClassRef = useRef<ReturnType<typeof createPinOverlayClass> | null>(null);
  const [leads, setLeads] = useState<PublicLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const recenteringRef = useRef(false);

  function goToSignup() {
    router.push("/login");
  }

  async function loadLeadsNear(lat: number, lng: number) {
    const res = await fetch(`/api/public/leads?lat=${lat}&lng=${lng}&radius=${DEMO_RADIUS_METERS}`);
    const data = (await res.json()) as { leads?: PublicLead[] };
    setLeads(data.leads ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    const host = mapDivRef.current;
    if (!host) return;

    const start = () => loadGoogleMaps().then(() => {
      if (cancelled || !mapDivRef.current || mapRef.current) return;
      PinOverlayClassRef.current = createPinOverlayClass();
      mapRef.current = new google.maps.Map(mapDivRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: "greedy",
        styles: LIGHT_MAP_STYLES,
      });

      mapRef.current.addListener("idle", () => {
        if (recenteringRef.current) {
          recenteringRef.current = false;
          return;
        }
        const map = mapRef.current;
        const center = map?.getCenter();
        if (!map || !center) return;
        const dist = google.maps.geometry.spherical.computeDistanceBetween(center, new google.maps.LatLng(DEFAULT_CENTER));
        if (dist > MAX_PAN_METERS) {
          recenteringRef.current = true;
          map.panTo(DEFAULT_CENTER);
          return;
        }
        void loadLeadsNear(center.lat(), center.lng());
      });

      void loadLeadsNear(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    });

    // The Maps SDK is 590 KiB and 226 ms of main thread — by a wide margin the most expensive thing
    // on the landing page, and the top entry in every "unused JavaScript" and "long task" audit.
    // Holding it until the canvas is near the viewport and the browser has gone idle takes it off
    // the critical path; the visitor still gets the same map, just not before the page is usable.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 200));
        idle(() => {
          if (!cancelled) void start();
        }, { timeout: 2500 });
      },
      { rootMargin: "300px" }
    );
    io.observe(host);

    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !PinOverlayClassRef.current) return;
    const PinOverlay = PinOverlayClassRef.current;

    const visibleIds = new Set(leads.map((l) => l.id));
    for (const [id, overlay] of markersRef.current) {
      if (!visibleIds.has(id)) {
        overlay.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const lead of leads) {
      if (lead.lat == null || lead.lng == null) continue;
      const color = "#a8d51e";
      if (markersRef.current.has(lead.id)) continue;
      const overlay: PinOverlayInstance = new PinOverlay(
        { lat: lead.lat, lng: lead.lng },
        color,
        false,
        () => setSelectedId(lead.id),
        true
      );
      overlay.setMap(mapRef.current);
      markersRef.current.set(lead.id, overlay);
    }
  }, [leads]);

  const selected = selectedId ? (leads.find((l) => l.id === selectedId) ?? null) : null;
  const visibleLeads = leads.slice(0, 8);

  return (
    <div
      style={{
        background: "var(--g-white)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      {/* Toolbar — every control here represents a real action the demo can't actually do
          (search a new area, apply a real discovery filter), so each one goes straight to
          signup instead of pretending to work. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderBottom: "1px solid var(--g-border)",
          flexWrap: "wrap",
        }}
      >
        <button type="button" onClick={goToSignup} style={toolbarPill}>
          <PinIcon size={15} color="var(--g-green-text)" /> Gurugram <span style={{ color: "var(--g-gray-500)" }}>▾</span>
        </button>
        <button type="button" onClick={goToSignup} style={toolbarPillOutline}>
          <ShieldIcon size={15} /> Website Gap
        </button>
        <button type="button" onClick={goToSignup} style={toolbarPillOutline}>
          <ClipboardIcon size={15} /> Profile Enrichment
        </button>
        <button type="button" onClick={goToSignup} style={toolbarPillOutline} className="landing-toolbar-optional">
          <UserIcon /> Founder Finder
        </button>
        <button type="button" onClick={goToSignup} style={{ ...toolbarPillOutline, marginLeft: "auto" }}>
          <FilterIcon /> Filters
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "row" }} className="landing-map-layout">
        {/* Map */}
        <div style={{ position: "relative", flex: "1 1 64%", minHeight: 540 }}>
          <div ref={mapDivRef} style={{ position: "absolute", inset: 0 }} />
        </div>

        {/* Leads sidebar */}
        <div
          style={{
            flex: "1 1 36%",
            maxWidth: 380,
            borderLeft: "1px solid var(--g-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 12px" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)" }}>Leads in this area</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g-green-text)", background: "var(--g-green-mint)", padding: "3px 10px", borderRadius: "var(--radius-pill)" }}>
              {leads.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
            {selected ? (
              <LeadDetail lead={selected} onBack={() => setSelectedId(null)} />
            ) : visibleLeads.length === 0 ? (
              <div style={{ padding: "20px 8px", fontSize: 12.5, color: "var(--g-gray-500)" }}>No cached leads in this pocket yet — pan around a little.</div>
            ) : (
              visibleLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "13px 6px",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--g-border)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: lead.has_website ? "var(--g-green-mint)" : "var(--g-amber-tint)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <GlobeIcon size={19} color={lead.has_website ? "var(--g-green-text)" : "#b45309"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--g-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.business_name}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>{formatCategory(lead.category) ?? lead.section ?? "Business"}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                      <span style={pillTag(lead.has_website === false)}>{lead.has_website === false ? "No Website" : "Has Website"}</span>
                      {lead.heat_score >= 60 && <span style={pillTag(false)}>High Intent</span>}
                    </div>
                  </div>
                  <ChevronRightIcon size={14} color="var(--g-gray-300)" />
                </button>
              ))
            )}
          </div>

          <div style={{ padding: 20, borderTop: "1px solid var(--g-border)" }}>
            <button
              type="button"
              onClick={goToSignup}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "14px 0",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--g-green)",
                background: "var(--g-green-mint)",
                color: "var(--g-green-text)",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <LockIcon /> Unlock Lead Details
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--g-gray-500)", marginTop: 9 }}>View contact, email, phone & more</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onBack }: { lead: PublicLead; onBack: () => void }) {
  return (
    <div style={{ padding: "8px 6px" }}>
      <button type="button" onClick={onBack} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Back to list
      </button>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>{lead.business_name}</div>
      <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>{formatCategory(lead.category) ?? lead.section ?? "Business"}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <span style={pillTag(lead.has_website === false)}>{lead.has_website === false ? "No Website" : "Has Website"}</span>
        {lead.rating !== null && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-ink-soft)" }}>
            ★ {lead.rating.toFixed(1)} ({lead.review_count ?? 0})
          </span>
        )}
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--g-gray-500)", lineHeight: 1.5 }}>
        Contact, address and verified details for this business are available once you unlock it.
      </div>
    </div>
  );
}

function pillTag(danger: boolean): React.CSSProperties {
  return {
    fontSize: 10.5,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    background: danger ? "var(--g-red-tint)" : "var(--g-green-mint)",
    color: danger ? "var(--g-red-text)" : "var(--g-green-text)",
  };
}

const toolbarPill: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-green)",
  background: "var(--g-green-mint)",
  color: "var(--g-ink)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const toolbarPillOutline: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};
