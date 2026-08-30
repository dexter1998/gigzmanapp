"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilterIcon, ChevronDownIcon } from "@/components/icons";

/**
 * The only client island on a public lead page, and it is deliberately inert.
 *
 * It never fetches and never writes to the URL. All it does is hide and show cards that the server
 * already rendered, by reading the `data-*` attributes on them. Two consequences, both intentional:
 * with JavaScript disabled every card is still visible and the page is fully readable, and no
 * crawlable parameter space is created, so there is no filtered URL that would need excluding.
 *
 * Category and Area are not checkboxes here even though they sit in the same rail. They are links
 * to real pages, because that hierarchy is the thing that distinguishes this from a search result
 * surface — a filter that only hides cards would quietly throw that away.
 */

export type FacetLink = { slug: string; name: string; count: number; href: string };

/** The filterable facts about one rendered card. Passed in rather than read back out of the DOM so
 *  the visible count is derived during render instead of written from an effect. */
export type FilterItem = { id: string; intent: string; rating: number | null; score: number; fresh: number | null };

type Groups = {
  intent: string[];
  rating: string[];
  score: string[];
  fresh: string[];
};

const EMPTY: Groups = { intent: [], rating: [], score: [], fresh: [] };

const RATING_MIN: Record<string, number> = { "4.5": 4.5, "4.0": 4, "3.5": 3.5 };
const SCORE_BAND: Record<string, [number, number]> = { high: [80, 101], mid: [60, 80], low: [0, 60] };
const FRESH_DAYS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

/** Within a group the options are alternatives; across groups every group must be satisfied. */
function matches(it: FilterItem, sel: Groups): boolean {
  const okIntent = sel.intent.length === 0 || sel.intent.includes(it.intent);
  const okRating =
    sel.rating.length === 0 ||
    sel.rating.some((r) => (r === "unrated" ? it.rating === null : it.rating !== null && it.rating >= RATING_MIN[r]));
  const okScore =
    sel.score.length === 0 ||
    sel.score.some((b) => {
      const [lo, hi] = SCORE_BAND[b];
      return it.score >= lo && it.score < hi;
    });
  const okFresh = sel.fresh.length === 0 || sel.fresh.some((f) => it.fresh !== null && it.fresh <= FRESH_DAYS[f]);
  return okIntent && okRating && okScore && okFresh;
}

export function FilterSidebar({
  items,
  areas,
  categories,
  areasMoreHref,
  categoriesMoreHref,
  activeAreaSlug,
  activeCategorySlug,
}: {
  items: FilterItem[];
  areas: FacetLink[];
  categories: FacetLink[];
  areasMoreHref?: string;
  categoriesMoreHref?: string;
  activeAreaSlug?: string | null;
  activeCategorySlug?: string | null;
}) {
  const [sel, setSel] = useState<Groups>(EMPTY);
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () => sel.intent.length + sel.rating.length + sel.score.length + sel.fresh.length,
    [sel],
  );

  const passing = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (matches(it, sel)) set.add(it.id);
    return set;
  }, [items, sel]);

  const shown = active === 0 ? null : passing.size;

  const toggle = useCallback((group: keyof Groups, value: string) => {
    setSel((prev) => {
      const list = prev[group];
      return { ...prev, [group]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }, []);

  useEffect(() => {
    // The effect only writes to the DOM; what passes is decided during render. Toggle an attribute,
    // never `style.display` — the card's own `display: grid` lives in its inline style, so writing
    // to style.display (even writing "" to restore it) deletes the grid and collapses every card.
    for (const card of document.querySelectorAll<HTMLElement>("[data-pseo-card]")) {
      const id = card.dataset.leadId ?? "";
      if (passing.has(id)) card.removeAttribute("data-filtered");
      else card.setAttribute("data-filtered", "");
    }
    const empty = document.querySelector<HTMLElement>("[data-pseo-empty]");
    if (empty) empty.toggleAttribute("data-show", active > 0 && passing.size === 0);
  }, [passing, active]);

  const clear = () => setSel(EMPTY);

  return (
    <aside className="pseo-filters">
      {/* On mobile the rail collapses to a single button; on desktop the toggle is hidden by CSS
          and the panel is always open, so the markup is identical either way. */}
      <button type="button" onClick={() => setOpen((o) => !o)} className="pseo-filter-toggle" style={toggleStyle}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5 }}>
          <FilterIcon size={14} color="var(--g-ink)" />
          Filters
          {active > 0 && (
            <span style={{ background: "var(--g-green)", color: "#fff", borderRadius: 999, fontSize: 10.5, fontWeight: 800, padding: "1px 7px" }}>
              {active}
            </span>
          )}
        </span>
        <ChevronDownIcon size={14} color="var(--g-gray-500)" />
      </button>

      <div className="pseo-filter-panel" data-open={open ? "1" : "0"}>
        {(active > 0 || shown !== null) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 10px" }}>
            <span style={{ fontSize: 12, color: "var(--g-gray-500)" }}>
              {shown !== null ? `${shown} shown` : "All shown"}
            </span>
            {active > 0 && (
              <button type="button" onClick={clear} style={{ background: "none", border: 0, padding: 0, fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", cursor: "pointer" }}>
                Clear
              </button>
            )}
          </div>
        )}

        <Block title="Opportunity type">
          {/* Only one type is offered because only one is measured. Listing "outdated" or "slow
              website" filters we cannot populate would be a promise the data doesn't keep. */}
          <Check checked disabled label="No website" onChange={() => {}} />
        </Block>

        <Block title="Lead intent">
          <Check checked={sel.intent.includes("high")} label="High intent" hint="20+ reviews, 4.0★ or better" onChange={() => toggle("intent", "high")} />
          <Check checked={sel.intent.includes("medium")} label="Actively reviewed" hint="5+ reviews" onChange={() => toggle("intent", "medium")} />
        </Block>

        {categories.length > 0 && (
          <Block title="Business category" moreHref={categoriesMoreHref} moreLabel="All categories">
            {categories.map((c) => (
              <FacetRow key={c.slug} facet={c} active={c.slug === activeCategorySlug} />
            ))}
          </Block>
        )}

        {areas.length > 0 && (
          <Block title="Area" moreHref={areasMoreHref} moreLabel="All areas">
            {areas.map((a) => (
              <FacetRow key={a.slug} facet={a} active={a.slug === activeAreaSlug} />
            ))}
          </Block>
        )}

        <Block title="Rating">
          <Check checked={sel.rating.includes("4.5")} label="4.5★ and above" onChange={() => toggle("rating", "4.5")} />
          <Check checked={sel.rating.includes("4.0")} label="4.0★ and above" onChange={() => toggle("rating", "4.0")} />
          <Check checked={sel.rating.includes("3.5")} label="3.5★ and above" onChange={() => toggle("rating", "3.5")} />
          <Check checked={sel.rating.includes("unrated")} label="No rating yet" onChange={() => toggle("rating", "unrated")} />
        </Block>

        <Block title="Lead score">
          <Check checked={sel.score.includes("high")} label="80 and above" onChange={() => toggle("score", "high")} />
          <Check checked={sel.score.includes("mid")} label="60 – 79" onChange={() => toggle("score", "mid")} />
          <Check checked={sel.score.includes("low")} label="Below 60" onChange={() => toggle("score", "low")} />
        </Block>

        <Block title="Freshness">
          <Check checked={sel.fresh.includes("7")} label="Checked in last 7 days" onChange={() => toggle("fresh", "7")} />
          <Check checked={sel.fresh.includes("30")} label="Checked in last 30 days" onChange={() => toggle("fresh", "30")} />
          <Check checked={sel.fresh.includes("90")} label="Checked in last 90 days" onChange={() => toggle("fresh", "90")} />
        </Block>
      </div>
    </aside>
  );
}

const toggleStyle: React.CSSProperties = {
  display: "none",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--g-white)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-md)",
  padding: "11px 14px",
  marginBottom: 12,
  cursor: "pointer",
  color: "var(--g-ink)",
};

function Block({ title, children, moreHref, moreLabel }: {
  title: string; children: React.ReactNode; moreHref?: string; moreLabel?: string;
}) {
  return (
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.45, color: "var(--g-gray-500)", marginBottom: 10 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      {moreHref && (
        <Link href={moreHref} style={{ display: "block", marginTop: 11, fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
          {moreLabel} →
        </Link>
      )}
    </div>
  );
}

function Check({ checked, label, hint, disabled, onChange }: {
  checked: boolean; label: string; hint?: string; disabled?: boolean; onChange: () => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.75 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ marginTop: 2, width: 14, height: 14, accentColor: "var(--g-green)", flexShrink: 0 }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13, color: "var(--g-ink-soft)" }}>{label}</span>
        {hint && <span style={{ display: "block", fontSize: 11, color: "var(--g-gray-500)", marginTop: 1 }}>{hint}</span>}
      </span>
    </label>
  );
}

function FacetRow({ facet, active }: { facet: FacetLink; active?: boolean }) {
  return (
    <Link
      href={facet.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        fontSize: 13,
        color: active ? "var(--g-green-text)" : "var(--g-ink-soft)",
        fontWeight: active ? 700 : 400,
        textDecoration: "none",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{facet.name}</span>
      <span style={{ color: "var(--g-gray-500)", flexShrink: 0 }}>{facet.count}</span>
    </Link>
  );
}
