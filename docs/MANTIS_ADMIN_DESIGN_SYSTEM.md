# Mantis Admin Design System

The source of truth for `app/(admin)/admin/*` (the read-only ops console at `/admin/*`, gated by
`ADMIN_EMAILS` in `lib/admin.ts`). Visual language is inspired by Tabler's admin theme — dark
navy surface, restrained borders, blue-accented interaction, dense numeric cards and tables — but
every token below is Mantis's own, scoped under `.adm-shell` in `app/(admin)/admin/admin.css` so
it can never leak onto (or be affected by) the light/cream marketing-site tokens in
`app/globals.css`. The two token sets are intentionally independent, not light/dark variants of
one scale.

**Not covered by this doc**: `/admin-campaigns/*` (a separate, mutating console with its own gate
and its own `admin-campaigns.css`) — it is linked from the sidebar's "Outreach" section as a
deliberate escape hatch, not part of this design system.

## Where things live

| File | What |
|---|---|
| `app/(admin)/admin/admin.css` | All tokens + component styles. The only stylesheet the admin section loads. |
| `app/(admin)/admin/ui.tsx` | Server-component primitives: `StatCard`, `Section`, `Table`, `Pill`, `HealthItem`, `Bars`, formatters (`fmtDT`, `fmtAgo`, `fmtN`, `fmtINR`). |
| `app/(admin)/admin/primitives.tsx` | Client-component primitives: `Dialog`, `FilterDropdown`, `SearchInput`, `CollapsibleGroup`. Radix-based, restyled onto admin tokens. |
| `app/(admin)/admin/nav.tsx` | Sidebar (`AdminNav`) — dark rail, collapsible groups, off-canvas drawer below 900px. |
| `app/(admin)/admin/nav-data.ts` | The single `NAV` array both the sidebar and the header breadcrumb read from. Add a new page here, not in two places. |
| `app/(admin)/admin/Header.tsx` | Persistent top bar: breadcrumb (derived from `nav-data.ts` + the current pathname) + admin email + read-only status. |
| `app/(admin)/admin/layout.tsx` | Wires `AdminNav` + `Header` + `<main className="adm-main">` around every `/admin/*` page. |

## Design tokens (`.adm-shell` custom properties)

### Color
```
--adm-bg            #0d1420   page background
--adm-bg-soft        #0a0f18   sidebar + topbar background (slightly darker than page)
--adm-surface        #141d2b   card / table background
--adm-surface-raised #182233   table header, dropdown menu, modal background
--adm-surface-hover  #1c2740   row hover, nav item hover
--adm-border         rgba(255,255,255,.08)   default hairline
--adm-border-strong  rgba(255,255,255,.16)   dropdown/modal border, active filter
--adm-text           #e8ecf3   primary text
--adm-text-soft      #9aa7bd   secondary text (table body, nav labels)
--adm-text-mute      #5f6b80   metadata, labels, placeholders

--adm-accent / -soft / -text   blue #4c8dff family — the ONLY interaction color (active nav, links, focus, search, "info" pill)
--adm-green  / -soft / -text   success semantic only (paid, healthy, positive trend)
--adm-amber  / -soft / -text   warning semantic only
--adm-red    / -soft / -text   error semantic only
--adm-gray-soft                 rgba(255,255,255,.06) — neutral hover/mut backgrounds
```
**Rule**: blue = "you can interact with this or it's informational." Green/amber/red = "this is a
status judgment about data," never used for a plain button or link. Don't invent a 6th hue.

### Spacing
```
--adm-sp-1  4px    --adm-sp-4  16px   --adm-sp-7  32px
--adm-sp-2  8px    --adm-sp-5  20px   --adm-sp-8  40px
--adm-sp-3  12px   --adm-sp-6  24px   --adm-sp-9  48px
```
Every margin/padding/gap in `admin.css` is one of these nine values. If a new component needs a
tenth number, that's a signal to re-check the layout, not to add `padding: 17px`.

### Radius
```
--adm-radius-lg    12px   cards, tables, modal, health tiles
--adm-radius-md    8px    nav items, search box, buttons
--adm-radius-sm    6px    small icon buttons, dropdown items
--adm-radius-pill  999px  badges, filter triggers, status chip
```

### Shadow
```
--adm-shadow-card  0 1px 2px rgba(0,0,0,.3)                              cards, tables, health tiles — barely visible, just lifts off the bg
--adm-shadow-pop   0 12px 32px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.3) dropdown menus, modal — the only "floating" shadow
```
Nothing else gets a shadow. No hover-lift, no glow.

### Typography scale
No new font is introduced — admin inherits the product's `--font-jakarta` from the root layout.
Sizes used, smallest to largest:
```
10px    nav group label, filter menu chevron-adjacent text
10.5px  card label (.k), table header, pill text
11.5px  card detail/trend, health sub-text, topbar status, "as of" timestamp
12px    body default (filter count, modal sub)
12.5px  table cell text, search input, filter trigger
13.5px  sidebar nav item
14px    section title (h2)
15px    modal title
20px    page title (h1)
24px    stat card metric — the one place a number should visually dominate
```
Card labels (`.k`) are always uppercase + `letter-spacing: 0.07em` + `--adm-text-mute`; card values
(`.v`) are always `font-weight: 700` + `--adm-text` + `font-variant-numeric: tabular-nums`. Never
flip that hierarchy — the label should always read quieter than the number.

### Breakpoints
```
1080px   .adm-split (two-column page sections) collapses to one column
900px    sidebar becomes an off-canvas drawer; topbar gains left padding for the hamburger trigger
640px    topbar email address hides (status pill stays)
```

## Components

### StatCard (`ui.tsx`)
```tsx
<StatCard label="REGISTRATIONS" value={73} detail="+49 in 7d" tone="up" icon={<Users2 />} spark={<Bars values={buckets} />} />
```
`label` → `.k`, `value` → `.v`, `detail` → `.d` (tone `"up"` = green text, `"bad"` = red text,
omitted = muted). `icon` is optional, top-right, 16px, muted — a scan aid only, never decorative
flourish. `spark` is optional, renders a `Bars` sparkline under the metric (the "trend inside KPI"
pattern). Don't build a second stat-card component for a slightly different layout — extend this
one's props first.

### Section (`ui.tsx`)
Wraps a heading (`h2`) + optional note + children (almost always a `Table`). One `Section` per
logical grouping of a page; don't nest sections.

### Table (`ui.tsx`)
Generic `{ head, rows, empty }` — `head` entries are either a plain string or `{ label, num: true }`
for right-aligned numeric columns. Rows are `ReactNode[][]`, so cell content (pills, links, buttons)
is built by the caller. There is no built-in pagination or column sorting — pages that need either
implement it themselves (see `UsersTable.tsx`'s client-side filtering) rather than growing the
shared primitive's prop surface for one page's need.

**Long text**: give the cell (or its wrapping button) a `title` attribute for the full value and
either the `.wrap` class (multi-line, `min/max-width` set) or a fixed-width truncating span like
`.adm-cell-email-text` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`). Never let
a long email or URL push a column wide enough to force horizontal scroll on its own.

### Pill (`ui.tsx`)
The **only** badge component. Five tones: `ok` (green), `warn` (amber), `bad` (red), `mut` (gray),
`info` (blue). Every status in the admin section — payment status, PRO domain flag, dashboard mode,
health dot, cron result — routes through this one component. If a new page needs a badge, reach
for `Pill` before writing a new `.something-badge` class.

### SearchInput (`primitives.tsx`)
Client component, controlled (`value`/`onChange`/`placeholder`). Renders a `Search` icon, a plain
text input, and a clear (`X`) button once there's a value. Pairs with `FilterDropdown` inside a
`.adm-filterbar` row — see `UsersTable.tsx` for the canonical "search + N dropdown filters + live
count" layout.

### FilterDropdown / Dialog / CollapsibleGroup (`primitives.tsx`)
Radix-based, unchanged in behavior by this redesign — only their CSS classes were retoned onto the
new dark tokens. See the file's own header comment for the shadcn/ui provenance note.

### Header (`Header.tsx`)
One persistent top bar for the whole `/admin/*` tree. Left: breadcrumb (`eyebrow / page`, derived
from `nav-data.ts`'s `resolveBreadcrumb()` against the current pathname — add a page to `NAV` and
the breadcrumb is automatic, don't hardcode a second copy). Right: a read-only status pill + the
signed-in admin's email (hidden below 640px). This bar does **not** replace each page's own
`.adm-head` (title + "as of" timestamp + page-specific actions) — that stays page-level chrome;
the topbar is section-level chrome that never changes shape between pages.

### AdminNav (`nav.tsx`)
Dark sidebar, collapsible groups (state persisted per-group in `localStorage`), a rail-collapse
toggle (icon-only mode, state persisted separately). Below 900px it becomes a fixed off-canvas
drawer (`translateX(-100%)` → `0`) triggered by a hamburger button fixed top-left, with a dimmed
overlay that closes it on click; it also auto-closes on every route change so it never lingers open
over the page you just navigated to.

## Data → visual component rules

| Data shape | Component |
|---|---|
| A single metric, optionally with a trend | `StatCard` (+ `detail`/`tone` for the trend) |
| A metric with 30-day history | `StatCard` with `spark={<Bars values={toDayBuckets(rows)} />}` |
| A ranked or raw list of records | `Table` (+ `Pill` for any status column) |
| A binary/tiered status per row | `Pill`, never a new badge component |
| System/cron/integration health | `HealthItem` inside a `.adm-health` grid |
| A dashboard needing to be searched/filtered client-side | `SearchInput` + `FilterDropdown`(s) in a `.adm-filterbar`, same pattern as `UsersTable.tsx` |

There is deliberately **no charting library** in this codebase (confirmed: no recharts/chart.js/
visx/d3 in `package.json`). `Bars` (pure CSS divs, no client JS) covers every current sparkline
need. If a future page needs a real line/bar/donut chart beyond a sparkline, that's a real decision
point — bring it up rather than hand-rolling a second one-off chart with divs.

## When adding a new admin page

1. Add the route under `app/(admin)/admin/<name>/page.tsx` (server component, same pattern as
   every existing page: `sql` query → `<div className="adm-head">` → `<div className="adm-cards">`
   of `StatCard`s → one or more `<Section>`s of `Table`s).
2. Add it to the appropriate group in `nav-data.ts`'s `NAV` array — the sidebar link and the
   header breadcrumb both pick it up automatically.
3. Reuse `StatCard` / `Section` / `Table` / `Pill` / `HealthItem` / `Bars` from `ui.tsx` and
   `SearchInput` / `FilterDropdown` / `Dialog` from `primitives.tsx`. Do not create a page-specific
   variant of any of these — extend the shared component's props if it's genuinely missing
   something, the same way `StatCard` grew `icon`/`spark` in this redesign.
4. Every value/spacing/radius/shadow must be one of the tokens above. If a value isn't in the
   scale, that's a sign to reconsider the layout before reaching for a magic number.
5. Don't add a header/topbar to the page — `Header.tsx` in the layout already provides it.

## When adding a new component

1. Server component with no interactivity → `ui.tsx`. Needs `"use client"` (state, handlers,
   Radix) → `primitives.tsx`. This split already exists for a reason (see that file's header
   comment) — don't blur it for convenience.
2. Style it with the tokens above, not new hex values or px numbers. If genuinely nothing in the
   token set fits, add the token here first, then use it — never a one-off value inline.
3. Update this document in the same change. A design system that's out of sync with the code it
   describes is worse than no document.
