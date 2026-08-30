"use client";

import { useEffect, useRef, useState } from "react";
import { HeatGauge } from "@/components/HeatGauge";
import { StarIcon, LockIcon, GlobeIcon, ClockIcon, PhoneIcon, MailIcon } from "@/components/icons";
import { formatCategory } from "@/lib/categories";
import type { Lead } from "./LeadsTable";

type Enrichment = {
  status: "not_started" | "pending" | "starting_instance" | "scraping" | "done" | "failed";
  website_url?: string | null;
  open_hours?: unknown;
  popular_times?: unknown;
  error?: string | null;
};

const POLL_MS = 3000;
const IN_PROGRESS: Enrichment["status"][] = ["pending", "starting_instance", "scraping"];

const STATUS_LABEL: Record<Enrichment["status"], string> = {
  not_started: "",
  pending: "Queued…",
  starting_instance: "Starting up…",
  scraping: "Fetching live details…",
  done: "Enriched",
  failed: "Couldn't fetch extra details",
};

/** Right-side detail panel for whichever row is active in the Leads table. Unlocked leads
 * trigger the gosom-based enrichment job (real website/hours/popular-times, beyond what the
 * original Places search returned) and poll it to completion; locked leads show an unlock CTA
 * instead — gosom enrichment only runs for a lead the user has already paid to reveal (see
 * app/api/leads/[id]/enrich/route.ts's own assertUnlocked check). */
export function LeadDetailPanel({ lead, onUnlocked }: { lead: Lead | null; onUnlocked: () => void }) {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEnrichment(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (!lead || !lead.is_unlocked) return;

    let cancelled = false;
    async function kickOff() {
      // POST starts (or advances) the job; the route accepts either verb for the same effect,
      // but POST reads more naturally as "start this."
      const res = await fetch(`/api/leads/${lead!.id}/enrich`, { method: "POST" });
      const data = (await res.json()) as Enrichment;
      if (!cancelled) setEnrichment(data);
    }
    kickOff();

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/leads/${lead!.id}/enrich`);
      const data = (await res.json()) as Enrichment;
      if (cancelled) return;
      setEnrichment(data);
      if (!IN_PROGRESS.includes(data.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [lead]);

  async function unlock() {
    if (!lead) return;
    setUnlocking(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/unlock`, { method: "POST" });
      if (res.status === 402) {
        window.dispatchEvent(new Event("gigzman:open-plans"));
        return;
      }
      window.dispatchEvent(new Event("gigzman:credits-changed"));
      onUnlocked();
    } finally {
      setUnlocking(false);
    }
  }

  if (!lead) {
    return (
      <div style={panelStyle}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--g-gray-500)", fontSize: 13 }}>
          Select a lead to see its details.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>{lead.business_name}</h2>
      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginBottom: 16 }}>{formatCategory(lead.category) ?? "Business"}</div>

      {lead.heat_score !== null && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <HeatGauge score={lead.heat_score} size={100} />
        </div>
      )}

      {lead.rating !== null && (
        <Row icon={<StarIcon size={13} />} label="Rating">
          {lead.rating.toFixed(1)} ({lead.review_count ?? 0} reviews)
        </Row>
      )}

      {!lead.is_unlocked ? (
        <div style={{ marginTop: 16, padding: 16, borderRadius: "var(--radius-md)", background: "var(--g-cream)", textAlign: "center" }}>
          <LockIcon />
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "8px 0 12px" }}>
            Unlock this lead to see its name, address, contact details, and live enrichment.
          </p>
          <button type="button" onClick={unlock} disabled={unlocking} style={unlockBtn}>
            {unlocking ? "Unlocking…" : "Unlock (1 credit)"}
          </button>
        </div>
      ) : (
        <>
          <Row icon={<GlobeIcon size={13} />} label="Address">
            {lead.address ?? "No address found"}
          </Row>
          {lead.phone && (
            <Row icon={<PhoneIcon size={13} />} label="Phone">
              {lead.phone}
            </Row>
          )}
          {lead.email && (
            <Row icon={<MailIcon size={13} />} label="Email">
              {lead.email}
            </Row>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--g-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
              <ClockIcon size={13} color="var(--g-gray-500)" />
              Live details
            </div>

            {!enrichment && <p style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>Starting…</p>}

            {enrichment && IN_PROGRESS.includes(enrichment.status) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--g-gray-500)" }}>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  <span className="chat-searching-dot" style={{ animationDelay: "0ms" }} />
                  <span className="chat-searching-dot" style={{ animationDelay: "150ms" }} />
                  <span className="chat-searching-dot" style={{ animationDelay: "300ms" }} />
                </span>
                {STATUS_LABEL[enrichment.status]}
              </div>
            )}

            {enrichment?.status === "done" && (
              <div>
                {enrichment.website_url ? (
                  <Row icon={<GlobeIcon size={13} />} label="Website">
                    <a href={enrichment.website_url} target="_blank" rel="noreferrer" style={{ color: "var(--g-green-text)" }}>
                      {enrichment.website_url}
                    </a>
                  </Row>
                ) : (
                  <p style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>No additional details found for this business.</p>
                )}
              </div>
            )}

            {enrichment?.status === "failed" && (
              <p style={{ fontSize: 12.5, color: "#b45309" }}>{STATUS_LABEL.failed}{enrichment.error ? ` — ${enrichment.error}` : ""}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--g-ink)" }}>{children}</div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--g-white)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-lg)",
  padding: 20,
  position: "sticky",
  top: 20,
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
};

const unlockBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "var(--g-green-darker)",
  color: "#fff",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};
