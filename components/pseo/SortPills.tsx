"use client";

import { useEffect, useState } from "react";

/**
 * Re-orders the cards already on the page. Like the filter rail, it never fetches and never touches
 * the URL — sorting by query string would mint three crawlable copies of every listing page, which
 * is the duplicate-URL pattern this whole section is built to avoid.
 *
 * It works by writing the CSS `order` of each card in the flex column. The modules interleaved
 * between the cards hold a fixed order of their own, so they stay put at position five whichever
 * sort is active instead of being shuffled into the middle of the run.
 */

export type SortItem = { id: string; score: number; fresh: number | null };

const MODES = [
  { id: "recommended", label: "Recommended" },
  { id: "score", label: "Highest Score" },
  { id: "recent", label: "Recently Added" },
] as const;

type Mode = (typeof MODES)[number]["id"];

export function SortPills({ items }: { items: SortItem[] }) {
  const [mode, setMode] = useState<Mode>("recommended");

  useEffect(() => {
    const ranked = [...items];
    if (mode === "score") ranked.sort((a, b) => b.score - a.score);
    // A null verification stamp sorts last rather than first: "we don't know when" is not "just now".
    if (mode === "recent") {
      ranked.sort((a, b) => (a.fresh ?? Number.MAX_SAFE_INTEGER) - (b.fresh ?? Number.MAX_SAFE_INTEGER));
    }

    const order = new Map(ranked.map((it, i) => [it.id, 2 * (i + 1)]));
    for (const card of document.querySelectorAll<HTMLElement>("[data-pseo-card]")) {
      const o = order.get(card.dataset.leadId ?? "");
      if (o !== undefined) card.style.order = String(o);
    }
  }, [items, mode]);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>Sort by:</span>
      <div style={{ display: "inline-flex", gap: 4, background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-pill)", padding: 3 }}>
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={active}
              style={{
                border: active ? "1px solid var(--g-border)" : "1px solid transparent",
                background: active ? "var(--g-white)" : "transparent",
                color: active ? "var(--g-ink)" : "var(--g-gray-500)",
                fontWeight: active ? 700 : 500,
                fontSize: 12.5,
                borderRadius: "var(--radius-pill)",
                padding: "5px 13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
