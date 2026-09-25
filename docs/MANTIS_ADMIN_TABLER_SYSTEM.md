# Mantis Admin × Tabler — component system

`app/(admin)/admin/*` (the read-only console at `/admin/*`) is built directly on **Tabler**
(`@tabler/core` v1.5.1 — real compiled Bootstrap 5 + Tabler CSS/JS, MIT) and **@tabler/icons-react**
— not a look-alike rebuilt in custom CSS. Every card, table, badge, nav item, page header, and
form control is Tabler's actual markup/classes. Mantis supplies the data and the information
architecture; Tabler supplies the entire visual and component system.

**All future `/admin/*` UI must follow this system.** If a new page or component needs something
Tabler already has a pattern for, use that pattern — do not invent a new one in `admin.css`.

## Source

- Reference: https://tabler.io/ , https://tabler.io/admin-template , https://github.com/tabler/tabler
- Installed: `@tabler/core@1.5.1`, `@tabler/icons-react@3.48.0`, `apexcharts@4.7.0` +
  `react-apexcharts@1.7.0` (the same charting lib Tabler's own demo uses), `jsvectormap@1.7.0`
  (ditto, for the world map).
- CSS entry point: `@tabler/core/dist/css/tabler.min.css`, imported once in
  `app/(admin)/admin/layout.tsx` (and, for anyone building a throwaway preview route the same way,
  wherever else the admin shell is rendered outside that layout).

## Why Radix instead of Bootstrap's own JS

Bootstrap/Tabler ships real interactivity (`data-bs-toggle`) for dropdowns, modals, and collapses.
This codebase uses **Radix primitives wearing Tabler's CSS classes** instead
(`primitives.tsx`: `Dialog`, `FilterDropdown`, `SearchInput`) — same visual result, but driven by
React state instead of Bootstrap mutating the DOM imperatively, which avoids fights with React's
virtual DOM inside a page these components live on. The sidebar's mobile drawer (`nav.tsx`) is the
same idea: plain `useState`, not `data-bs-toggle="collapse"`.

## The Tailwind ⚡ Bootstrap class-name collision (read this before touching classNames)

**This app also loads Tailwind v4** (root `app/globals.css`, used by the public site) globally —
it is not scoped away from `/admin/*`. Tailwind and Bootstrap both ship *some* identically-named
utility classes with **different values**, and this bit us once already:

- `.collapse` — Tailwind: `visibility: collapse` (a table-row utility). Bootstrap/Tabler: the
  entire accordion/navbar-toggle mechanism (`display: none` unless `.show`). Whichever wins per
  property differs by rule, and in practice Tailwind's `visibility: collapse` silently hid the
  entire sidebar nav even though Tabler's own `display: flex !important` breakpoint rule still won
  for `display`. **Fix applied**: the sidebar's collapse wrapper never carries the literal class
  `collapse` — it uses `adm-navbar-collapse` (own class, see `admin.css`) instead, doing the same
  job without the name clash.
- Spacing utilities (`.mb-3`, `.px-2`, `.gap-2`, etc.) exist in both frameworks with different
  scales, but CSS `@layer` semantics put Tailwind's utilities in a named layer (lower priority than
  any un-layered CSS), so Tabler's un-layered rules win here — this one turned out fine, but it's
  luck from how Tailwind v4 organizes its layers, not a guarantee.

**Rule going forward**: before introducing a new bare utility-style class name into `/admin/*`
markup (short, generic, no `tblr-`/`navbar-`/`card-`/component prefix), quickly grep
`node_modules/@tabler/core/dist/css/tabler.css` for it and sanity-check the rendered result — don't
assume a Bootstrap class "just works" the way it does in a Tailwind-free project.

## Dark mode

Tabler's dark theme requires `data-bs-theme="dark"` on **`:root`** (i.e. `<html>`) specifically —
setting it on any element nested inside `<body>` does nothing (confirmed: Tabler's dark variable
redefinitions are scoped to the literal selector `:root[data-bs-theme=dark]`, not the attribute
generically). `<html>` is owned by the shared root layout (`app/layout.tsx`), so the admin section
sets/clears it imperatively rather than hardcoding dark mode onto the whole app:

- `app/(admin)/admin/layout.tsx` renders an inline `<script>` that sets the attribute
  synchronously before hydration (no light-mode flash on a full page load).
- `ThemeSetter.tsx` (client component, rendered alongside it) sets the same attribute in a
  `useEffect` and **removes it in that effect's cleanup** — this is what stops the dark theme
  leaking onto the public site after a client-side navigation away from `/admin/*`.
- `app/layout.tsx`'s `<html>` tag has `suppressHydrationWarning` — the server-rendered HTML never
  has the attribute (root layout doesn't know about admin), the script adds it before hydration, so
  a mismatch warning is expected and intentional, not a bug.

Any new "admin renders outside `app/(admin)/admin/layout.tsx`" surface (a preview route, a test
harness) needs to repeat both the inline script and `<ThemeSetter />`, or it will render in light
mode.

## Component inventory

| Tabler concept | This codebase | Notes |
|---|---|---|
| `page` / `page-wrapper` / `page-body` | `layout.tsx` (shell) + each page's own `<div className="page-body"><div className="container-xl">` | Every `/admin/*` page wraps its content this way. |
| `navbar navbar-vertical` (dark sidebar) | `nav.tsx` → `AdminNav` | Icons from `@tabler/icons-react`, groups from `nav-data.ts`'s `NAV`. Mobile drawer via `adm-navbar-collapse` (see collision note above), not `data-bs-toggle`. |
| Horizontal top `navbar` | `Header.tsx` | Account-level chrome only (read-only badge, email) — Tabler's own vertical-nav demos combine both a sidebar and a top bar; this isn't an invented hybrid. |
| `page-header` / `page-pretitle` / `page-title` | `ui.tsx` → `PageHeader` | One per page, right after the `container-xl` opens. |
| `card` / `card-body` (metric) | `ui.tsx` → `StatCard` | Owns its own `col-*` (default `col-sm-6 col-lg-3`) — list several inside `CardRow`. Optional `icon`/`spark` (`charts.tsx`'s `Sparkline`, ApexCharts). |
| `card card-sm` (avatar + two lines) | `ui.tsx` → `MiniStatCard` | The "132 Sales / 78 Orders" pattern from Tabler's own dashboard. |
| `card` / `card-header` / `card-body` (generic) | `ui.tsx` → `Section` | For anything that isn't a table — chart cards, list cards, progress cards. |
| `card` / `card-header` / `table card-table table-vcenter` | `ui.tsx` → `Table` | Table cards have **no** card-body padding wrapper around the table itself, matching Tabler exactly. Pass `title`/`note` to get the header; omit `title` for a bare table-in-a-card. |
| `badge bg-{color}-lt` | `ui.tsx` → `Pill` | The only badge component — 5 tones (`ok`/`warn`/`bad`/`mut`/`info`) map to `bg-green-lt`/`bg-yellow-lt`/`bg-red-lt`/`bg-secondary-lt`/`bg-blue-lt`. |
| `status-dot` + `card-sm` | `ui.tsx` → `HealthItem` | Green only from real evidence; grey ("mut") means no signal, never a fake green. |
| `list-group list-group-flush` (activity feed) | `ui.tsx` → `ActivityRow` | Timestamp + label + optional tone badge, for cron-run / status-feed style rows. |
| `progress progress-sm` | `ui.tsx` → `ProgressStat` | Quota/rate-style metrics — only ever derived from real counts (see "no fabricated data" below), never an invented budget number. |
| `modal` / `modal-dialog` / `modal-content` | `primitives.tsx` → `Dialog`, `DialogHeader`, `DialogBody` | Radix-driven, Tabler classes. |
| `dropdown-menu` / `dropdown-item` | `primitives.tsx` → `FilterDropdown` | Radix-driven, Tabler classes. |
| `input-icon` (search box) | `primitives.tsx` → `SearchInput` | |
| ApexCharts bar/sparkline | `charts.tsx` → `Sparkline`, `BarChart` | Client-only (`dynamic(..., {ssr:false})`), same lib Tabler's own demo bundles. |
| jsvectormap world map | `charts.tsx` → `WorldMap` | Country name → ISO-2 lookup (`COUNTRY_ISO`) is intentionally small and explicit — an unmapped country is silently absent from shading rather than guessed at. Extend the map as new countries show up in real data. |

## Data → component mapping (the "no fabricated data" rule)

Every section maps to a **real** Mantis dataset. Where the Tabler reference had a component with no
literal Mantis equivalent, it was replaced with a genuine substitute of the *same component type* —
never left as demo content, never invented:

| Tabler reference | Mantis substitute | Why |
|---|---|---|
| Welcome/summary card | `Section` with real weekly signups + revenue | Real numbers, reframed as a welcome blurb. |
| Total Users / Active Users | `StatCard` (Total users) + radial-style % card (Active users) | `active7 / total`, an honest derived percentage. |
| Sales / Revenue / New Clients / Subscriptions | Paid users / Leads in DB / Unlocks / Billed calls | Direct real KPIs, same "4-up compact row" shape. |
| Small avatar+text cards (132 Sales, 78 Orders…) | `MiniStatCard`s: chat msgs, billed calls, abandoned checkouts, onboarded users | Same component, real counts. |
| Traffic summary (big chart) | Signups — last 30 days (`BarChart`) | Literally the same shape of data (daily counts). |
| Locations (world map) | Real `country` breakdown from `user_profiles` | `WorldMap` fed real query results, not demo geography. |
| Using Storage (progress) | Account health: weekly active rate / onboarding completion / paid conversion | No storage quota exists in this product — three real derived rates instead, same "here's a progress bar" role. |
| Development activity (feed) | System activity: cron run statuses | Real `cron_runs` timestamps/outcomes. |
| Tabler Icons promo card | Quick links card | A real, useful thing (links to Users/Economics/Health) in the same slot, not a donation ask. |
| Tasks checklist | "Needs attention" list | Real open-alert/error/abandoned-checkout counts as a read-only checklist — there's no task system to back an interactive one, and this is a read-only console anyway. |
| Invoices (full-width table) | Recent payments | Real `payments` rows. |

**If a future page's Tabler-shaped section has no honest Mantis data behind it, that's a real
decision point** — surface it rather than inventing a plausible-looking number.

## Rules for adding a new admin page or component

1. Follow the page skeleton: `page-body` → `container-xl` → `PageHeader` → one or more `CardRow`s
   of `StatCard`/`MiniStatCard`/`HealthItem` → `row row-cards` of `Table`/`Section`.
2. Reuse the components in the table above. If genuinely nothing fits, check
   `node_modules/@tabler/core/dist/css/tabler.css` for the real Tabler pattern before writing new
   CSS — `admin.css` should only ever hold the handful of real gaps (documented inline there), not
   a growing parallel design system.
3. Add the route to `nav-data.ts`'s `NAV` array — the sidebar picks it up automatically.
4. New icon → `@tabler/icons-react`, sized to match existing usage (18px nav icons, 20px mini-card
   icons, 14–16px inline/metadata icons). Don't mix in a second icon library.
5. New bare/short CSS class name → check it against Tailwind's utilities first (see the collision
   section above) before assuming it will render the way Tabler's own docs show it.
6. Dark mode: only relevant if rendering the admin shell somewhere other than
   `app/(admin)/admin/layout.tsx` — repeat the inline script + `<ThemeSetter />` pattern there too.
7. Chart or map needed beyond a sparkline → `apexcharts`/`jsvectormap` are already dependencies,
   client-only per `charts.tsx`'s pattern (`dynamic(..., {ssr:false})` or a `useEffect` + dynamic
   `import()`) — don't reach for a third charting library.
