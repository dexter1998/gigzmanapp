/** "Find. Verify. Apply. Track." — workspace table mock, matching 03-find-verify-apply-track.png. */

const ROWS = [
  { title: "Product Designer", company: "ZyloTech", location: "Gurugram", posted: "2h ago", match: 92, status: "New" },
  { title: "Data Analyst", company: "BrightScale", location: "Noida", posted: "1d ago", match: 88, status: "Saved" },
  { title: "Growth Marketer", company: "NovaMart", location: "Bengaluru", posted: "2d ago", match: 85, status: "Applied" },
  { title: "Backend Engineer", company: "PayHive", location: "Gurugram", posted: "3d ago", match: 78, status: "Interview" },
];

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  New: { bg: "var(--g-green-mint)", fg: "var(--g-green-text)" },
  Saved: { bg: "var(--g-cream)", fg: "var(--g-gray-500)" },
  Applied: { bg: "var(--g-green-mint)", fg: "var(--g-green-text)" },
  Interview: { bg: "#fdf1d8", fg: "#8a5c12" },
};

export function JobsPipeline() {
  return (
    <section style={{ padding: "96px 24px", background: "var(--g-cream)", textAlign: "center" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-pill)", background: "var(--g-white)", border: "1px solid var(--g-border)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.04em", color: "var(--g-green-text)", marginBottom: 18 }}>
          ONE WORKSPACE
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5.5vw, 50px)", fontWeight: 600, color: "var(--g-ink)", margin: "0 0 12px" }}>
          Find. Verify. <span style={{ color: "var(--g-green)" }}>Apply.</span> Track.
        </h2>
        <p style={{ fontSize: 15.5, color: "var(--g-gray-500)", margin: "0 0 40px" }}>
          Turn fresh opportunities into an organised job-search pipeline.
        </p>

        <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", textAlign: "left", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--g-border)" }}>
                  {["Job Title", "Company", "Location", "Posted", "Match", "Status"].map((h) => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--g-gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const tone = STATUS_TONE[r.status];
                  return (
                    <tr key={r.title} style={{ borderBottom: "1px solid var(--g-border)" }}>
                      <td style={{ padding: "14px 18px", fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)" }}>{r.title}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--g-ink)" }}>{r.company}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--g-gray-500)" }}>{r.location}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--g-gray-500)" }}>{r.posted}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13.5, fontWeight: 800, color: "var(--g-green-text)" }}>{r.match}%</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--radius-pill)", background: tone.bg, color: tone.fg }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
