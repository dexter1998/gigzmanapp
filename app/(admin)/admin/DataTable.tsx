"use client";

import { useMemo, useState, type ReactNode } from "react";

/**
 * A table you can search and page through.
 *
 * Rows arrive already rendered — they contain pills, links, two-line cells — so filtering cannot
 * read them. Each row therefore carries its own plain-text `search` string, built on the server
 * from the same values that produced the cells. That keeps the markup free to be as rich as it
 * likes without the filter having to understand any of it.
 *
 * Filtering and paging are both client-side on purpose: these lists are already bounded by the
 * query's own LIMIT, so there is nothing to gain from a round trip per keystroke, and the search
 * stays instant. The page size is small deliberately — twenty rows is about what fits without
 * scrolling, and a table you scroll is one you stop scanning.
 */
export type DataRow = { cells: ReactNode[]; search: string };

const PAGE_SIZE = 20;

export function DataTable({
  head, rows, empty, searchPlaceholder = "Search…",
}: {
  head: (string | { label: string; num?: boolean })[];
  rows: DataRow[];
  empty: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const cols = head.map((h) => (typeof h === "string" ? { label: h, num: false } : { label: h.label, num: !!h.num }));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    // Every space-separated word must appear somewhere in the row — "delhi agency" finds the Delhi
    // agency without needing the two words adjacent, which is how people actually type.
    const words = needle.split(/\s+/);
    return rows.filter((r) => {
      const hay = r.search.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function search(v: string) {
    setQ(v);
    setPage(1); // a new search always starts at the top; staying on page 4 of the old result is noise
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="relative" style={{ maxWidth: 300, flex: "1 1 200px" }}>
          <input
            type="search"
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-1.5 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
          />
        </div>
        <span className="tnum text-[11px] text-[var(--ink-faint)]">
          {q.trim()
            ? `${filtered.length.toLocaleString("en-IN")} of ${rows.length.toLocaleString("en-IN")}`
            : `${rows.length.toLocaleString("en-IN")} rows`}
        </span>
      </div>

      {slice.length === 0 ? (
        <p className="m-0 px-4 py-8 text-center text-[12px] text-[var(--ink-faint)]">
          {q.trim() ? `Nothing matches “${q.trim()}”.` : empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="sunk">
                {cols.map((c) => (
                  <th key={c.label} className={`whitespace-nowrap px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)] ${c.num ? "text-right" : "text-left"}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum">
              {slice.map((r, ri) => (
                <tr key={ri} className="rule-t align-top">
                  {r.cells.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-2 ${cols[ci]?.num ? "text-right text-[var(--ink-muted)]" : "text-left text-[var(--ink)]"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="rule-t flex items-center justify-between px-4 py-3">
          <span className="tnum text-[11px] text-[var(--ink-faint)]">Page {current} of {totalPages.toLocaleString("en-IN")}</span>
          <span className="flex gap-2">
            <Pager label="← Previous" disabled={current <= 1} onClick={() => setPage(current - 1)} />
            <Pager label="Next →" disabled={current >= totalPages} onClick={() => setPage(current + 1)} />
          </span>
        </div>
      )}
    </div>
  );
}

function Pager({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1 text-[11.5px] font-semibold text-[var(--ink)] disabled:opacity-40"
    >
      {label}
    </button>
  );
}
