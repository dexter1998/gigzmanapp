import type { ReactNode } from "react";

/**
 * The admin console's component vocabulary.
 *
 * Deliberately small and deliberately not Tabler: a Panel, a head, a stat, a funnel, a status dot.
 * Everything is Tailwind over the `.mantis-admin` tokens in app/globals.css, so a colour decision
 * lives in one place rather than in a hundred `className="text-green"` calls.
 *
 * The thing this replaces mattered more than the styling: the old overview was Tabler's demo
 * layout with Mantis numbers poured into it — a welcome card, avatar tiles, a world map with no
 * data on it. Dense, comparative, and boring is the right target for a console someone reads to
 * decide something.
 */

export const fmtN = (n: number) => n.toLocaleString("en-IN");
export const fmtINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHead({ title, meta, action }: { title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rule-b flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="m-0 text-[13px] font-semibold text-[var(--ink)]">{title}</p>
        {meta && <p className="m-0 mt-0.5 text-[11.5px] text-[var(--ink-muted)]">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * One metric.
 *
 * `delta` is the change against the prior equal-length window and is a first-class slot, not an
 * optional note — a bare number cannot be read. Four signups is excellent or alarming depending
 * entirely on last week, and the old dashboard showed only the four.
 *
 * Direction is carried by an arrow as well as colour so it survives a colourblind reader and a
 * greyscale print, and `goodDirection` exists because falling is the good outcome for cost,
 * abandoned checkouts and errors.
 */
export function Stat({
  label, value, delta, deltaLabel = "vs prev 7d", sub, goodDirection = "up", accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  sub?: string;
  goodDirection?: "up" | "down";
  /** A thin top rule in a series colour, tying the tile to its chart below. */
  accent?: string;
}) {
  const dir = delta == null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const good = dir === "flat" ? null : dir === goodDirection;
  const colour = good === null ? "var(--ink-faint)" : good ? "var(--ok)" : "var(--critical)";

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
      {accent && <span className="absolute inset-x-0 top-0 h-px" style={{ background: accent }} />}
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-faint)]">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="tnum text-[22px] font-semibold leading-none text-[var(--ink)]">{value}</span>
        {delta != null && (
          <span className="tnum text-[11px] leading-none" style={{ color: colour }}>
            <span aria-hidden="true">{dir === "flat" ? "→" : dir === "up" ? "↑" : "↓"}</span>
            {fmtN(Math.abs(delta))}
          </span>
        )}
      </div>
      <p className="m-0 mt-1 text-[10.5px] text-[var(--ink-faint)]">{sub ?? (delta != null ? deltaLabel : " ")}</p>
    </div>
  );
}

export type FunnelStage = { label: string; value: number; note?: string };

/**
 * The acquisition funnel.
 *
 * The single biggest gap in the old overview: it showed users, unlocks and payments as three
 * unrelated tiles and never once showed what fraction of one becomes the next. The step-down
 * percentage between rows is the number anyone actually acts on.
 *
 * The bar ramp is a five-step single-hue ordinal scale validated against this console's dark
 * surface — monotone lightness, visible gaps between steps, darkest end still clearing 2:1. The
 * first ramp tried failed both of those and was re-stepped.
 */
const FUNNEL_RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf"];

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value ?? 0;
  return (
    <div className="flex flex-col gap-0 px-4 py-3">
      {stages.map((s, i) => {
        const width = top > 0 ? Math.min(100, (s.value / top) * 100) : 0;
        const prev = i > 0 ? stages[i - 1].value : null;
        const step = prev && prev > 0 ? (s.value / prev) * 100 : null;
        return (
          <div key={s.label}>
            {i > 0 && (
              <p className="m-0 flex items-center gap-1.5 py-1 pl-0.5 text-[10.5px] text-[var(--ink-faint)]">
                <span aria-hidden="true">↓</span>
                {step === null ? "—" : `${step.toFixed(step < 10 ? 1 : 0)}% carry through`}
              </p>
            )}
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-[var(--ink-muted)]">{s.label}</span>
              <span className="flex items-baseline gap-2">
                <strong className="tnum text-[13.5px] font-semibold text-[var(--ink)]">{fmtN(s.value)}</strong>
                {s.note && <span className="text-[10.5px] text-[var(--ink-faint)]">{s.note}</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunk)]">
              <div
                className="h-full rounded-full"
                role="progressbar"
                aria-valuenow={s.value}
                aria-label={`${s.label}: ${s.value}`}
                style={{ width: `${width}%`, background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A status line. The dot never carries the meaning alone — the words beside it do. */
export function StatusLine({ tone, title, sub }: { tone: "ok" | "warn" | "bad" | "mut"; title: string; sub: string }) {
  const colour = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--critical)" : "var(--ink-faint)";
  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5">
      <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: colour }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="m-0 text-[12.5px] text-[var(--ink)]">{title}</p>
        <p className="m-0 text-[11px] text-[var(--ink-faint)]">{sub}</p>
      </div>
    </div>
  );
}

/** A plain two-or-three column list. Tables here are read, not sorted. */
export function MiniTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="px-4 py-6 text-center text-[12px] text-[var(--ink-faint)]">{empty}</p>;
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="sunk">
          {head.map((h, i) => (
            <th key={h} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)] ${i ? "text-right" : "text-left"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tnum">
        {rows.map((r, ri) => (
          <tr key={ri} className="rule-t">
            {r.map((c, ci) => (
              <td key={ci} className={`px-4 py-2 text-[var(--ink-muted)] ${ci ? "text-right" : "text-left text-[var(--ink)]"}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
