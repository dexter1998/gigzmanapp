import type { Bucket, Slice, CohortRow } from "./queries";

/**
 * Plain SVG, rendered on the server.
 *
 * The admin console uses ApexCharts, but that is a client-only bundle behind a dynamic import and
 * this page has to paint instantly for someone who opened a link from a PDF on a phone. Six small
 * charts do not need a charting library, and server-rendering them means the numbers are in the
 * HTML -- visible even if the JS never runs.
 *
 * Colours come from a palette checked for colour-blind separation rather than chosen by eye:
 * the three categorical hues sit at OKLab dE 24.9-30.6 from each other under normal vision and
 * stay above 23 under both deuteranope and protanope simulation. The heatmap ramp is one hue,
 * light to dark, with every adjacent step at least 0.07 apart in OKLab lightness.
 */

export const C = {
  green: "#3f6420",
  blue: "#2563eb",
  grey: "#98a2b3",
  ramp: ["#eef4dc", "#cfe39a", "#a8d51e", "#6f9a1d", "#3f6420"],
  axis: "#d1d5db",
  ink: "#101214",
  soft: "#667085",
};

export function fmtN(n: number) {
  return n.toLocaleString("en-IN");
}

/* ---------------------------------------------------------------- area trend */

export function AreaTrend({ data, color = C.green, label }: {
  data: Bucket[]; color?: string; label: string;
}) {
  if (!data.length) return <Empty label={label} />;
  const W = 640, H = 160, P = 8;
  const max = Math.max(1, ...data.map(d => d.n));
  // One point would make step 0 and collapse the path onto the left edge; centre it instead.
  const single = data.length < 2;
  const step = single ? 0 : (W - P * 2) / (data.length - 1);
  if (single) {
    const only = data[0];
    return (
      <figure className="lv-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${only.n} on ${only.day}`} preserveAspectRatio="none">
          <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke={C.axis} strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <circle cx={W / 2} cy={H / 2} r="5" fill={color} stroke="#fff" strokeWidth="2" />
        </svg>
        <figcaption><span>{only.day.slice(5)}</span><span className="lv-peak">{fmtN(only.n)}</span><span /></figcaption>
      </figure>
    );
  }
  const pt = (d: Bucket, i: number) =>
    [P + i * step, H - P - (d.n / max) * (H - P * 2)] as const;
  const line = data.map((d, i) => { const [x, y] = pt(d, i); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
  const area = `${line} L${(P + (data.length - 1) * step).toFixed(1)} ${H - P} L${P} ${H - P} Z`;
  const peak = data.reduce((a, b) => (b.n > a.n ? b : a), data[0]);
  const [px, py] = pt(peak, data.indexOf(peak));

  return (
    <figure className="lv-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${data.length} days, peak ${peak.n}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${label.replace(/\W/g, "")})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={px} cy={py} r="4" fill={color} stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption>
        <span>{data[0]?.day.slice(5)}</span>
        <span className="lv-peak">peak {fmtN(peak.n)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- donut */

export function Donut({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, d) => s + d.n, 0);
  if (!total) return <Empty label="Account type" />;
  const colors = [C.green, C.blue, C.grey];
  const R = 60, SW = 22, CIRC = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="lv-donut">
      <svg viewBox="0 0 160 160" role="img" aria-label="Agency versus freelancer split">
        <g transform="translate(80,80) rotate(-90)">
          {slices.slice(0, 3).map((s, i) => {
            const frac = s.n / total;
            const dash = `${(frac * CIRC).toFixed(2)} ${CIRC.toFixed(2)}`;
            const el = (
              <circle key={s.label} r={R} fill="none" stroke={colors[i]} strokeWidth={SW}
                strokeDasharray={dash} strokeDashoffset={(-acc * CIRC).toFixed(2)} />
            );
            acc += frac;
            return el;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="lv-donut-n">{fmtN(total)}</text>
        <text x="80" y="94" textAnchor="middle" className="lv-donut-l">users</text>
      </svg>
      {/* Legend always present, and each row carries its own number -- identity is never
          communicated by colour alone. */}
      <ul className="lv-legend">
        {slices.slice(0, 3).map((s, i) => (
          <li key={s.label}>
            <i style={{ background: colors[i] }} aria-hidden />
            <span className="lv-legend-label">{pretty(s.label)}</span>
            <b>{fmtN(s.n)}</b>
            <em>{Math.round((s.n / total) * 100)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- ranked bars */

export function RankedBars({ rows, color = C.green }: { rows: Slice[]; color?: string }) {
  if (!rows.length) return <Empty label="Breakdown" />;
  const max = Math.max(...rows.map(r => r.n));
  return (
    <ul className="lv-bars">
      {rows.map(r => (
        <li key={r.label}>
          <span className="lv-bar-label" title={pretty(r.label)}>{pretty(r.label)}</span>
          <span className="lv-bar-track">
            <span className="lv-bar-fill" style={{ width: `${Math.max(2, (r.n / max) * 100)}%`, background: color }} />
          </span>
          <b>{fmtN(r.n)}</b>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- cohort heatmap */

export function Cohorts({ rows }: { rows: CohortRow[] }) {
  if (!rows.length) return <Empty label="Cohorts" />;
  const weeks = 8;
  const pct = (c: number | null, size: number) => (c === null || !size ? null : (c / size) * 100);
  const bucket = (p: number | null) => {
    if (p === null) return -1;
    if (p <= 0) return 0;
    if (p < 10) return 1;
    if (p < 25) return 2;
    if (p < 50) return 3;
    return 4;
  };

  return (
    <div className="lv-cohort-wrap">
      <table className="lv-cohort">
        <thead>
          <tr>
            <th scope="col">Signup week</th>
            <th scope="col">Users</th>
            {Array.from({ length: weeks }, (_, i) => <th key={i} scope="col">W{i}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.cohort}>
              <th scope="row">{new Date(r.cohort).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</th>
              <td className="lv-cohort-size">{fmtN(r.size)}</td>
              {r.cells.map((c, i) => {
                const p = pct(c, r.size);
                const b = bucket(p);
                return (
                  <td key={i} className="lv-cell"
                      style={b < 0 ? undefined : { background: C.ramp[b], color: b >= 3 ? "#fff" : C.ink }}>
                    {p === null ? "" : `${Math.round(p)}%`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lv-cohort-key">
        <span>Less</span>
        {C.ramp.map(c => <i key={c} style={{ background: c }} aria-hidden />)}
        <span>More</span>
        <em>Share of each signup week that unlocked a lead in that later week.</em>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- bits */

function Empty({ label }: { label: string }) {
  return <p className="lv-empty">No data yet for {label.toLowerCase()}.</p>;
}

export function pretty(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
