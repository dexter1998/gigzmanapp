import type { ReactNode } from "react";

/** Shared read-only building blocks for the admin pages. Server components — no state, no
 * handlers; anything interactive would contradict the panel's analysis-only contract. */

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

export function StatCard({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: ReactNode; tone?: "up" | "bad" }) {
  return (
    <div className="adm-card">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {detail != null && <div className={`d${tone ? ` ${tone}` : ""}`}>{detail}</div>}
    </div>
  );
}

export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-section">
      <h2>{title}</h2>
      {note != null && <div className="note">{note}</div>}
      {children}
    </section>
  );
}

export function Table({ head, rows, empty }: { head: (string | { label: string; num?: boolean })[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="adm-tablewrap">
      {rows.length === 0 ? (
        <div className="adm-empty">{empty}</div>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>{head.map((h, i) => (typeof h === "string" ? <th key={i}>{h}</th> : <th key={i} className={h.num ? "num" : undefined}>{h.label}</th>))}</tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i}>{cells.map((c, j) => {
                const numHead = typeof head[j] === "object" && (head[j] as { num?: boolean }).num;
                return <td key={j} className={numHead ? "num" : undefined}>{c}</td>;
              })}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "mut" | "info"; children: ReactNode }) {
  return <span className={`adm-pill ${tone}`}>{children}</span>;
}

/** Health tile — green only from real evidence; grey means "no signal", never a fake green. */
export function HealthItem({ tone, title, sub }: { tone: "ok" | "warn" | "bad" | "mut"; title: string; sub: string }) {
  return (
    <div className="adm-health-item">
      <span className={`dot ${tone}`} />
      <div>
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
    </div>
  );
}

/** Tiny bar sparkline (day buckets). Pure divs — no client JS for a read-only chart. */
export function Bars({ values, title }: { values: number[]; title?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="adm-bars" title={title}>
      {values.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(5, Math.round((v / max) * 100))}%`, opacity: v === 0 ? 0.25 : undefined }} title={String(v)} />
      ))}
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
