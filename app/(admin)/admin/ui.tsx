import type { ReactNode } from "react";

/** Shared read-only building blocks for the admin pages.
 *
 * These were Tabler markup; they render on the console's own tokens now (see kit.tsx and the
 * `.mantis-admin` block in app/globals.css). **The signatures did not change** — that is the whole
 * point. Nine pages were written against this API, and reimplementing it moved all of them at once
 * instead of rewriting each by hand and getting nine slightly different results.
 *
 * `col` props still arrive as Bootstrap strings ("col-lg-6", "col-sm-6 col-lg-3") because the
 * pages pass them. Rather than edit every call site, colBasis() reads the widest hint out of the
 * string and turns it into a flex basis — so the old vocabulary keeps working and no page had to
 * know the grid underneath was replaced.
 *
 * Server components: no state, no handlers. Anything interactive would contradict the console's
 * analysis-only contract. */

/**
 * "col-sm-6 col-lg-3" -> a quarter-width cell.
 *
 * Returns basis AND a ceiling. Basis alone was not enough: on a row of six quarter-width tiles the
 * last two wrap onto their own line and flex-grow hands them all the leftover space, so four tiles
 * sit above two visibly wider ones. The max-width stops a tile claiming more than the share its
 * `col` asked for, which is what the Bootstrap grid these strings came from always guaranteed.
 */
function colCell(col?: string): { flex: string; maxWidth?: string; minWidth: number } {
  if (!col) return { flex: "0 0 auto", minWidth: 0 };
  const lg = col.match(/col-(?:lg|xl)-(\d{1,2})/);
  const any = col.match(/col-(?:sm-|md-)?(\d{1,2})/);
  const n = Number(lg?.[1] ?? any?.[1] ?? 12);
  const share = (n / 12) * 100;
  return {
    flex: `1 1 calc(${share}% - 12px)`,
    maxWidth: n >= 12 ? undefined : `calc(${share}% - 12px)`,
    minWidth: n <= 3 ? 170 : 260,
  };
}

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
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="m-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-faint)]">{pretitle}</p>
        <h1 className="m-0 mt-1 text-[26px] font-semibold leading-none tracking-[-0.01em] text-[var(--ink)]">{title}</h1>
        {sub && <p className="m-0 mt-1.5 text-[11.5px] text-[var(--ink-faint)]">{sub}</p>}
      </div>
      {actions}
    </header>
  );
}

export function CardRow({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap gap-3">{children}</div>;
}

export function StatCard({
  label, value, detail, tone, icon, spark, col = "col-sm-6 col-lg-3",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Kept as the original union ("bad", not "down") — nine pages already pass these strings. */
  tone?: "up" | "bad";
  icon?: ReactNode;
  spark?: ReactNode;
  col?: string;
}) {
  const toneColour = tone === "up" ? "var(--ok)" : tone === "bad" ? "var(--critical)" : "var(--ink-faint)";
  return (
    <div style={colCell(col)}>
      <div className="h-full rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">{label}</p>
          {icon != null && <span className="shrink-0 leading-none text-[var(--ink-faint)]">{icon}</span>}
        </div>
        <p className="tnum m-0 mt-1.5 text-[22px] font-semibold leading-none text-[var(--ink)]">{value}</p>
        {detail != null && <p className="m-0 mt-1 text-[11px]" style={{ color: toneColour }}>{detail}</p>}
        {spark != null && <div className="mt-2">{spark}</div>}
      </div>
    </div>
  );
}

export function MiniStatCard({
  icon, tone = "primary", title, sub, col = "col-sm-6 col-lg-3",
}: {
  icon?: ReactNode; tone?: string; title: ReactNode; sub?: string; col?: string;
}) {
  return (
    <div style={colCell(col)}>
      <div className="flex h-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
        {icon && (
          <span className="sunk grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ink-muted)]" data-tone={tone}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="tnum m-0 truncate text-[13.5px] font-semibold text-[var(--ink)]">{title}</p>
          {sub && <p className="m-0 text-[11px] text-[var(--ink-faint)]">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function Section({ title, note, children, actions, col = "col-12" }: { title: string; note?: ReactNode; children: ReactNode; actions?: ReactNode; col?: string }) {
  return (
    <div style={colCell(col)}>
      <div className="flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
        <div className="rule-b flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-semibold text-[var(--ink)]">{title}</p>
            {note && <p className="m-0 mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{note}</p>}
          </div>
          {actions}
        </div>
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}

export function Table({
  title, note, head, rows, empty, col = "col-12", actions,
}: {
  title?: string; note?: ReactNode;
  head: (string | { label: string; num?: boolean })[];
  rows: ReactNode[][]; empty: string; col?: string; actions?: ReactNode;
}) {
  const cols = head.map((h) => (typeof h === "string" ? { label: h, num: false } : { label: h.label, num: !!h.num }));
  const table = rows.length ? (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="sunk">
            {cols.map((c) => (
              <th key={c.label} className={`whitespace-nowrap px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]${c.num ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum">
          {rows.map((r, ri) => (
            <tr key={ri} className="rule-t">
              {r.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2 align-top${cols[ci]?.num ? "text-right text-[var(--ink-muted)]" : "text-left text-[var(--ink)]"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="m-0 px-4 py-8 text-center text-[12px] text-[var(--ink-faint)]">{empty}</p>
  );

  if (!title) return <div style={colCell(col)}>{table}</div>;
  return (
    <div style={colCell(col)}>
      <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
        <div className="rule-b flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-semibold text-[var(--ink)]">{title}</p>
            {note && <p className="m-0 mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{note}</p>}
          </div>
          {actions}
        </div>
        {table}
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  ok: "var(--ok)", warn: "var(--warn)", bad: "var(--critical)",
  mut: "var(--ink-faint)", info: "#3987e5",
};

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "mut" | "info"; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ borderColor: `color-mix(in oklab, ${TONE[tone]} 45%, transparent)`, color: TONE[tone] }}
    >
      {children}
    </span>
  );
}

/** Status never rests on the dot alone — the title and sub beside it carry the meaning. */
export function HealthItem({ tone, title, sub, col = "col-sm-6 col-lg-3" }: { tone: "ok" | "warn" | "bad" | "mut"; title: string; sub: string; col?: string }) {
  return (
    <div style={colCell(col)}>
      <div className="flex h-full items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
        <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: TONE[tone] }} aria-hidden="true" />
        <div className="min-w-0">
          <p className="m-0 text-[12.5px] text-[var(--ink)]">{title}</p>
          <p className="m-0 text-[11px] text-[var(--ink-faint)]">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function ActivityRow({ when, label, tone = "mut", badge }: { when: string; label: ReactNode; tone?: "ok" | "warn" | "bad" | "mut" | "info"; badge?: string }) {
  return (
    <div className="rule-b flex items-start gap-3 py-2 last:border-0">
      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[tone] }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-[var(--ink)]">{label}</div>
        <div className="text-[10.5px] text-[var(--ink-faint)]">{when}</div>
      </div>
      {badge && <Pill tone={tone}>{badge}</Pill>}
    </div>
  );
}

export function ProgressStat({ label, pct, sub, tone = "primary" }: { label: string; pct: number; sub?: string; tone?: "primary" | "yellow" | "red" | "green" }) {
  const colour = tone === "red" ? "var(--critical)" : tone === "yellow" ? "var(--warn)" : tone === "green" ? "var(--ok)" : "var(--accent)";
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-[var(--ink-muted)]">{label}</span>
        <span className="tnum text-[var(--ink)]">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunk)]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: colour }} />
      </div>
      {sub && <p className="m-0 mt-1 text-[10.5px] text-[var(--ink-faint)]">{sub}</p>}
    </div>
  );
}

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
