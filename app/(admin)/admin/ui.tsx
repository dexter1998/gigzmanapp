import type { ReactNode } from "react";

/** Shared read-only building blocks for the admin pages — real Tabler markup (card, card-header,
 * table card-table, badge, status-dot, page-header) so every /admin page inherits the actual
 * Tabler component library, not a look-alike. Server components — no state, no handlers; anything
 * interactive would contradict the panel's analysis-only contract. See
 * docs/MANTIS_ADMIN_TABLER_SYSTEM.md for the full component/class reference. */

const IST = "Asia/Kolkata";

export function fmtDT(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function fmtAgo(d: Date | string | null | undefined): string {
  if (!d) return "kabhi nahi";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "abhi";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const fmtN = (n: number) => n.toLocaleString("en-IN");

/** Tabler's real page-header: pretitle/title on the left, page-level actions on the right. Every
 * /admin page opens with exactly one of these — it is the section's ".adm-head" equivalent, just
 * built from `page-header`/`page-pretitle`/`page-title` instead of a hand-rolled div. */
export function PageHeader({ pretitle, title, sub, actions }: { pretitle: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header d-print-none">
      <div className="container-xl">
        <div className="row g-2 align-items-center">
          <div className="col">
            <div className="page-pretitle">{pretitle}</div>
            <h2 className="page-title">{title}</h2>
            {sub != null && <div className="text-secondary mt-1" style={{ fontSize: 12.5 }}>{sub}</div>}
          </div>
          {actions != null && <div className="col-auto ms-auto d-print-none"><div className="btn-list">{actions}</div></div>}
        </div>
      </div>
    </div>
  );
}

/** A row of metric cards — real Bootstrap grid (`row row-deck row-cards`), so every card in the
 * row stretches to the tallest one, exactly like Tabler's own dashboard. Children are usually
 * StatCard/MiniStatCard, which supply their own `col-*` wrapper. */
export function CardRow({ children }: { children: ReactNode }) {
  return (
    <div className="row row-deck row-cards mb-3">
      {children}
    </div>
  );
}

/** The big metric card — Tabler's `subheader` + `h1` + optional trend + optional sparkline. Owns
 * its own grid column so callers just list StatCards inside a CardRow, same call shape as before
 * this redesign. */
export function StatCard({
  label, value, detail, tone, icon, spark, col = "col-sm-6 col-lg-3",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "up" | "bad";
  icon?: ReactNode;
  spark?: ReactNode;
  col?: string;
}) {
  return (
    <div className={col}>
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="subheader">{label}</div>
            {icon != null && <div className="ms-auto text-secondary lh-1">{icon}</div>}
          </div>
          <div className="h1 mb-0 mt-1">{value}</div>
          {detail != null && (
            <div className={`mt-1 ${tone === "up" ? "text-success" : tone === "bad" ? "text-danger" : "text-secondary"}`} style={{ fontSize: 12.5 }}>
              {detail}
            </div>
          )}
          {spark != null && <div className="mt-2">{spark}</div>}
        </div>
      </div>
    </div>
  );
}

/** The compact "avatar + two lines" card — Tabler's `card-sm` pattern used for the smaller status
 * row (132 Sales / 78 Orders style in the reference). */
export function MiniStatCard({
  icon, tone = "primary", title, sub, col = "col-sm-6 col-lg-3",
}: {
  icon: ReactNode;
  tone?: "primary" | "green" | "red" | "yellow" | "azure";
  title: ReactNode;
  sub: ReactNode;
  col?: string;
}) {
  return (
    <div className={col}>
      <div className="card card-sm h-100">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto"><span className={`bg-${tone} text-white avatar`}>{icon}</span></div>
            <div className="col">
              <div className="font-weight-medium">{title}</div>
              <div className="text-secondary" style={{ fontSize: 12.5 }}>{sub}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Generic content card (chart cards, list cards, anything that isn't a table). Table gets its
 * own component below because Tabler's table cards omit card-body padding around the table. */
export function Section({ title, note, children, actions, col = "col-12" }: { title: string; note?: ReactNode; children: ReactNode; actions?: ReactNode; col?: string }) {
  return (
    <div className={col}>
      <div className="card h-100">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {actions != null && <div className="card-actions">{actions}</div>}
        </div>
        <div className="card-body">
          {note != null && <div className="text-secondary mb-3" style={{ fontSize: 12 }}>{note}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Tabler's real table card: `card > card-header (title) > table-responsive > table card-table
 * table-vcenter`. No card-body padding wrapper — the table sits flush, exactly like the reference. */
export function Table({
  title, note, head, rows, empty, col = "col-12",
}: {
  title?: string;
  note?: ReactNode;
  head: (string | { label: string; num?: boolean })[];
  rows: ReactNode[][];
  empty: string;
  col?: string;
}) {
  const body = rows.length === 0 ? (
    <div className="card-body text-secondary" style={{ fontSize: 12.5 }}>{empty}</div>
  ) : (
    <div className="table-responsive">
      <table className="table card-table table-vcenter">
        <thead>
          <tr>{head.map((h, i) => (typeof h === "string" ? <th key={i}>{h}</th> : <th key={i} className={h.num ? "text-end" : undefined}>{h.label}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>{cells.map((c, j) => {
              const numHead = typeof head[j] === "object" && (head[j] as { num?: boolean }).num;
              return <td key={j} className={numHead ? "text-end" : undefined}>{c}</td>;
            })}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!title) return <div className={col}><div className="card">{body}</div></div>;

  return (
    <div className={col}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
        {note != null && <div className="card-body py-2 text-secondary" style={{ fontSize: 12 }}>{note}</div>}
        {body}
      </div>
    </div>
  );
}

/** The only badge component — Tabler's soft `badge bg-{color}-lt`. Every status in the admin
 * section (payment status, PRO domain flag, dashboard mode, cron result) routes through this. */
export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "mut" | "info"; children: ReactNode }) {
  const cls = { ok: "bg-green-lt", warn: "bg-yellow-lt", bad: "bg-red-lt", mut: "bg-secondary-lt", info: "bg-blue-lt" }[tone];
  return <span className={`badge ${cls}`}>{children}</span>;
}

/** Health tile — Tabler's `status-dot` + card-sm. Green only from real evidence; grey means "no
 * signal", never a fake green. */
export function HealthItem({ tone, title, sub, col = "col-sm-6 col-lg-3" }: { tone: "ok" | "warn" | "bad" | "mut"; title: string; sub: string; col?: string }) {
  const dot = { ok: "bg-green", warn: "bg-yellow", bad: "bg-red", mut: "bg-secondary" }[tone];
  const animated = tone === "ok" ? " status-dot-animated" : "";
  return (
    <div className={col}>
      <div className="card card-sm h-100">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto"><span className={`status-dot${animated} ${dot}`} /></div>
            <div className="col">
              <div className="font-weight-medium" style={{ fontSize: 12.5 }}>{title}</div>
              <div className="text-secondary" style={{ fontSize: 11.5 }}>{sub}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tabler `list-group` activity row — timestamp + label + a tone-colored badge, used for cron
 * runs / recent-error style feeds. */
export function ActivityRow({ when, label, tone, badge }: { when: string; label: ReactNode; tone?: "ok" | "warn" | "bad" | "mut" | "info"; badge?: string }) {
  return (
    <div className="list-group-item">
      <div className="row align-items-center">
        <div className="col-auto text-secondary" style={{ fontSize: 11.5, minWidth: 108 }}>{when}</div>
        <div className="col text-truncate">{label}</div>
        {badge != null && tone != null && <div className="col-auto"><Pill tone={tone}>{badge}</Pill></div>}
      </div>
    </div>
  );
}

/** Tabler `progress` bar — quota/budget-style metrics (Places API spend, credit pool usage). */
export function ProgressStat({ label, pct, sub, tone = "primary" }: { label: string; pct: number; sub?: string; tone?: "primary" | "yellow" | "red" | "green" }) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12.5 }}>
        <span>{label}</span>
        <span className="text-secondary">{sub ?? `${pct}%`}</span>
      </div>
      <div className="progress progress-sm">
        <div className={`progress-bar bg-${tone}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} role="progressbar" />
      </div>
    </div>
  );
}

/** 30 day buckets (oldest→newest) from rows of {day, n}. */
export function toDayBuckets(rows: { day: string | Date; n: number }[], days = 30): number[] {
  const map = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.n)]));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push(map.get(d) ?? 0);
  }
  return out;
}

/** Short day labels (e.g. "24 Sep") aligned to toDayBuckets' output, for chart x-axes. */
export function dayLabels(days = 30): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push(d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: IST }));
  }
  return out;
}
