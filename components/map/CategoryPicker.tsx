"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { CATALOG, ALL_CATALOG_TYPES, callsPerTile, type Category, type Subcategory } from "@/lib/discovery-catalog";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { ChevronDownIcon, ChevronRightIcon, CheckIcon } from "@/components/icons";

/**
 * The map's category picker: a three-level tree of checkboxes over category → subcategory → type.
 *
 * It replaced a single-select dropdown whose only wide option, "All categories", fanned out into
 * one request per category per tile — 68 billed Google calls on a first load, which emptied a new
 * account's entire free balance in under a minute before they had touched anything.
 *
 * Selection is held as a flat set of TYPES, not of categories. Categories and subcategories are
 * presentation: a parent checkbox is derived from its children (all / some / none) and toggling it
 * just writes its children. That is what lets the cost line below be honest — Google charges per
 * call and a call carries up to 50 types, so the price of a selection depends on how many types
 * are ticked and nothing else.
 */

const TYPES_LABEL_OVERRIDES: Record<string, string> = {};

/** `coffee_shop` -> `Coffee shop`. Google's type ids are the only names these have. */
function typeLabel(t: string) {
  return TYPES_LABEL_OVERRIDES[t] ?? (t.charAt(0).toUpperCase() + t.slice(1)).replace(/_/g, " ");
}

type TriState = "all" | "some" | "none";

/** Set toggle that returns a new Set, so React sees a changed reference. */
function toggled(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function stateOf(types: string[], selected: Set<string>): TriState {
  let on = 0;
  for (const t of types) if (selected.has(t)) on++;
  return on === 0 ? "none" : on === types.length ? "all" : "some";
}

function Box({ state, onClick }: { state: TriState; onClick: () => void }) {
  return (
    <span
      role="checkbox"
      aria-checked={state === "all" ? "true" : state === "some" ? "mixed" : "false"}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onClick(); } }}
      style={{
        width: 16, height: 16, flexShrink: 0, borderRadius: 4, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: state === "none" ? "1.5px solid var(--g-gray-300)" : "1.5px solid var(--g-green-dark)",
        background: state === "none" ? "var(--g-white)" : "var(--g-green-dark)",
      }}
    >
      {/* "some" gets a dash rather than a tick: a half-selected parent must not read as done. */}
      {state === "all" && <CheckIcon size={11} color="#fff" />}
      {state === "some" && <span style={{ width: 8, height: 2, background: "#fff", borderRadius: 1 }} />}
    </span>
  );
}

export function CategoryPicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const calls = callsPerTile([...selected]);
  const isEverything = selected.size === ALL_CATALOG_TYPES.length;

  const summary = useMemo(() => {
    if (isEverything) return "All categories";
    const whole = CATALOG.filter((c) => stateOf(c.subcategories.flatMap((s) => s.types), selected) === "all");
    if (whole.length === 1 && selected.size === whole[0].subcategories.flatMap((s) => s.types).length) return whole[0].label;
    return `${selected.size} types selected`;
  }, [selected, isEverything]);

  function setTypes(types: string[], on: boolean) {
    const next = new Set(selected);
    for (const t of types) { if (on) next.add(t); else next.delete(t); }
    onChange(next);
  }

  function toggleGroup(types: string[]) {
    setTypes(types, stateOf(types, selected) !== "all");
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px 0 16px",
          border: "1px solid var(--g-green)", borderRadius: "var(--radius-pill)",
          background: "var(--g-white)", boxShadow: "var(--shadow-toolbar)", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
          color: isEverything ? "var(--g-green-text)" : "var(--g-ink)",
          maxWidth: 260, whiteSpace: "nowrap",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</span>
        <span style={{ display: "flex", opacity: 0.7 }}><ChevronDownIcon /></span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: 50, left: 0, zIndex: 40,
            width: 360, maxWidth: "calc(100vw - 32px)",
            background: "var(--g-white)", border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 14px", borderBottom: "1px solid var(--g-border)" }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", color: "var(--g-gray-500)" }}>CATEGORIES</span>
            <span style={{ display: "flex", gap: 10 }}>
              <LinkBtn onClick={() => onChange(new Set(ALL_CATALOG_TYPES))} disabled={isEverything}>Select all</LinkBtn>
              <LinkBtn onClick={() => onChange(new Set())} disabled={selected.size === 0}>Clear</LinkBtn>
            </span>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto", padding: "6px 0" }}>
            {CATALOG.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                selected={selected}
                expanded={openCats.has(cat.id)}
                openSubs={openSubs}
                onToggleExpand={() => setOpenCats((s) => toggled(s, cat.id))}
                onToggleSubExpand={(id) => setOpenSubs((s) => toggled(s, id))}
                onToggleTypes={toggleGroup}
                onSetType={(t, on) => setTypes([t], on)}
              />
            ))}
          </div>

          {/* The whole point of the rebuild: what this selection costs, before it is spent. */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--g-border)", background: "var(--g-green-mint)", fontSize: 12, color: "var(--g-ink-soft)" }}>
            {selected.size === 0 ? (
              <span style={{ color: "var(--g-red-text)", fontWeight: 700 }}>Pick at least one category to search.</span>
            ) : (
              <>
                <b>{selected.size}</b> types · <b>{calls}</b> {calls === 1 ? "search" : "searches"} per area ·{" "}
                <b>{calls * CREDIT_COST.billed_places_call}</b> credits
                <div style={{ marginTop: 3, color: "var(--g-gray-500)" }}>
                  Each search covers up to {50} types. Narrowing below a multiple of 50 is what makes it cheaper.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 12, fontWeight: 700,
        color: disabled ? "var(--g-gray-300)" : "var(--g-green-text)", cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function CategoryRow({
  cat, selected, expanded, openSubs, onToggleExpand, onToggleSubExpand, onToggleTypes, onSetType,
}: {
  cat: Category;
  selected: Set<string>;
  expanded: boolean;
  openSubs: Set<string>;
  onToggleExpand: () => void;
  onToggleSubExpand: (id: string) => void;
  onToggleTypes: (types: string[]) => void;
  onSetType: (type: string, on: boolean) => void;
}) {
  const types = cat.subcategories.flatMap((s) => s.types);
  const state = stateOf(types, selected);
  const count = types.filter((t) => selected.has(t)).length;

  return (
    <div>
      <Row indent={0} onClick={onToggleExpand}>
        <Caret open={expanded} />
        <Box state={state} onClick={() => onToggleTypes(types)} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g-ink)", flex: 1 }}>{cat.label}</span>
        <Count on={count} total={types.length} />
      </Row>

      {expanded &&
        cat.subcategories.map((sub) => (
          <SubRow
            key={sub.id}
            sub={sub}
            selected={selected}
            expanded={openSubs.has(sub.id)}
            onToggleExpand={() => onToggleSubExpand(sub.id)}
            onToggleTypes={onToggleTypes}
            onSetType={onSetType}
          />
        ))}
    </div>
  );
}

function SubRow({
  sub, selected, expanded, onToggleExpand, onToggleTypes, onSetType,
}: {
  sub: Subcategory;
  selected: Set<string>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleTypes: (types: string[]) => void;
  onSetType: (type: string, on: boolean) => void;
}) {
  const state = stateOf(sub.types, selected);
  const count = sub.types.filter((t) => selected.has(t)).length;

  return (
    <div>
      <Row indent={1} onClick={onToggleExpand}>
        <Caret open={expanded} />
        <Box state={state} onClick={() => onToggleTypes(sub.types)} />
        <span style={{ fontSize: 12.5, color: "var(--g-ink-soft)", flex: 1 }}>{sub.label}</span>
        <Count on={count} total={sub.types.length} />
      </Row>

      {expanded &&
        sub.types.map((t) => (
          <Row key={t} indent={2} onClick={() => onSetType(t, !selected.has(t))}>
            <span style={{ width: 14, flexShrink: 0 }} />
            <Box state={selected.has(t) ? "all" : "none"} onClick={() => onSetType(t, !selected.has(t))} />
            <span style={{ fontSize: 12, color: "var(--g-gray-500)", flex: 1 }}>{typeLabel(t)}</span>
          </Row>
        ))}
    </div>
  );
}

function Row({ indent, onClick, children }: { indent: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
        padding: "6px 14px 6px 0", paddingLeft: 14 + indent * 20,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--g-gray-100)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <span style={{ display: "flex", width: 14, flexShrink: 0, opacity: 0.55 }}>
      {open ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} />}
    </span>
  );
}

function Count({ on, total }: { on: number; total: number }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: on === 0 ? "var(--g-gray-300)" : "var(--g-green-text)", flexShrink: 0 }}>
      {on}/{total}
    </span>
  );
}
