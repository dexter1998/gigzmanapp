"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditsIndicator } from "@/components/CreditsIndicator";
import { DashboardModeBadge } from "@/components/DashboardModeBadge";
import { APPLICATION_SECTIONS, type ApplicationField } from "@/lib/jobs/application-form";
import { JOB_FAMILY_LABEL } from "@/lib/jobs/normalize";

/**
 * The application profile — the standardized form, filled once.
 *
 * Its completeness is what unlocks the opportunity match on every job card, so the completion
 * meter is the page's headline rather than a footnote: the payoff for finishing it has to be
 * visible while you are filling it in.
 */
export default function JobsProfilePage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [completion, setCompletion] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/jobs/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(d.profile)) {
            if (v !== null && v !== undefined) next[k] = String(v);
          }
          setValues(next);
        }
        setCompletion(d.completion ?? 0);
        setComplete(!!d.complete);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/jobs/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        setCompletion(data.completion ?? 0);
        setComplete(!!data.complete);
        setSavedAt(new Date().toLocaleTimeString());
      }
    } finally {
      setSaving(false);
    }
  }

  const pct = Math.round(completion * 100);

  return (
    <div style={{ padding: "28px 24px 100px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--g-ink)", margin: 0 }}>
          Application profile
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DashboardModeBadge />
          <CreditsIndicator />
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
        Fill this once. Every application you send from Mantis carries it, and it is what your
        opportunity match on each job is calculated from.
      </p>

      {/* Completion meter */}
      <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)" }}>
            {complete ? "Profile complete — matches unlocked" : `${pct}% complete`}
          </span>
          {complete && (
            <Link href="/jobs/map" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)" }}>
              See your matches →
            </Link>
          )}
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--g-cream)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: complete ? "var(--g-green)" : "var(--g-green-darker)", transition: "width 200ms" }} />
        </div>
      </div>

      {!loaded ? (
        <p style={{ fontSize: 13, color: "var(--g-gray-500)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {APPLICATION_SECTIONS.map((section) => (
            <div key={section.title} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
              <h2 style={{ fontSize: 14.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>{section.title}</h2>
              {section.note && (
                <p style={{ fontSize: 12, color: "var(--g-gray-500)", margin: "0 0 14px", lineHeight: 1.5 }}>{section.note}</p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: section.note ? 0 : 14 }}>
                {section.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={values[field.key] ?? ""}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                  />
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                padding: "12px 28px", borderRadius: "var(--radius-sm)", border: "none",
                background: "var(--g-green-darker)", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {savedAt && <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>Saved at {savedAt}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ field, value, onChange }: { field: ApplicationField; value: string; onChange: (v: string) => void }) {
  const label = (
    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", marginBottom: 5 }}>
      {field.label}
      {field.required && <span style={{ color: "var(--g-green-text)" }}> *</span>}
    </label>
  );

  // The job-profile select is populated from the same taxonomy the scraper normalizes listings
  // into, so a seeker's choice and a listing's label can actually be compared.
  const options =
    field.key === "job_family"
      ? Object.entries(JOB_FAMILY_LABEL).map(([v, l]) => ({ value: v, label: l }))
      : (field.options ?? []);

  return (
    <div style={{ gridColumn: field.type === "textarea" ? "1 / -1" : undefined }}>
      {label}
      {field.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      ) : field.type === "file" ? (
        // Storage for the file itself is not wired yet, so this takes a link rather than pretending
        // to accept an upload it would silently drop.
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Link to your resume (Drive, Dropbox, personal site)"
          style={inputStyle}
        />
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          style={inputStyle}
        />
      )}
      {field.help && <p style={{ fontSize: 11, color: "var(--g-gray-500)", margin: "4px 0 0" }}>{field.help}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 13,
  fontFamily: "inherit",
};
