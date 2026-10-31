# Mantis UI rules — visual professionality pass

## Scope (read first)

**Layout and UX do not change.** Page structure, what is on each screen, where it sits, the chat +
live-results split, the sidebar, the drawer, the flows, what each row shows — all of it was designed
deliberately and stays exactly as it is.

This pass changes only the **visual layer**: colour, font size, font weight, border radius, control
height, borders and shadows. If a change would move, add, remove or hide something, it is out of
scope.

Reference: Origami (screenshots compared 2026-10-22). Its polish comes from restraint: the screen
is black, white and grey; the pink shows up only on the main action; colour otherwise comes from
real brand logos (LinkedIn blue, etc.). Mantis does the same with green.

---

## 0. The problem, measured (`app/(app)` + `components`, 2026-10-22)

| Problem | Measured | Origami |
|---|---|---|
| Green everywhere | Signal chips, score rings, Running pill, "Written by the planner", "Recommended", eyebrow labels, chat bubble, pagination, active icon, founder widget, two "Setup & Connect" buttons | Pink on ~1 element per screen |
| Too many font sizes | **30 distinct `fontSize` values** | ~6 |
| Too heavy | `fontWeight: 700` ×124, `800` ×88 | 400 / 500, 600 rare |
| Pills | `radius-pill` / `999` ×99 (buttons, badges) | Pill only for toggles, avatars, chips |
| Big radius | `--radius-lg: 16px` | ~8px cards, ~6px controls |
| Oversized buttons | ~52px "Setup & Connect" | 36px |
| Hex drift | `#b45309` ×17, `#667085`, `#d4a72c`… | One ramp |

---

## 1. Colour — black, white, grey; green is the accent

### The green budget
Green (`--accent`) is allowed in exactly these places:

1. **The primary action of the screen** — New chat, Create campaign, Find more leads. One filled green button visible per view.
2. **Active nav marker** — the 2px bar (`.nav-row[data-on]`). The active icon and text are `--ink`, not green.
3. **Positive status dot** — 6px dot for Running / verified / high score. The text next to it stays `--ink`.
4. **Focus ring.**
5. The **logo**.

Everything else is ink / grey / white.

### Where the extra colour goes instead: ink (near-black)
Origami's second "strong" colour is black, not a second shade of pink: the "View plans" button, the
toggles, the support bubble. Mantis does the same with `--ink`.

| Element | Now | Becomes |
|---|---|---|
| Secondary strong buttons ("Setup & Connect", the 2nd CTA on a screen) | green fill | `--ink` fill, white text — or outline if it is not important |
| Toggle on / checkbox checked | green | `--ink` |
| Active pagination page | green | `--ink` fill or `--surface-sunk` + `--ink` text |
| Signal chips ("Raised funding", "Hiring now"…) | green bg + green text | `--surface-sunk` bg, `--ink` text, `--rule` border optional |
| Lead score ring (99 / 90) | green ring | same ring shape, `--ink` number, ring stroke `--rule-strong` with the filled arc in `--ink`; green only for the dot if ≥ 80 |
| Status pills (Running / Draft / Tested) | coloured pill | same pill, neutral fill, 6px coloured dot + `--ink` text (Running green dot, Tested blue dot, Draft grey dot) |
| "Written by the planner", "Recommended", "You sell this" | green badge | neutral badge (`--surface-sunk`, `--ink-muted`) |
| Eyebrow labels ("LIBRARY", "WHAT TO SELL") | green text | `--ink-muted` |
| User chat bubble | pale green | `--surface-sunk` |
| "Talk to Founder" widget | green pill | `--ink` fill, same shape and place |
| Active nav icon | green | `--ink` (keep the green marker bar) |
| Links in text | green | `--ink` with underline |

### Logos and channel icons keep their real colours
Gmail red, WhatsApp green, LinkedIn blue, Outlook, Google G — these are the colour on the page, as
in Origami. Keep them at their current size and position. What changes is the **box around them**:
neutral (`--surface` + `--rule`), never a coloured tile. Channel **badges** (Email / WhatsApp / Call
script) become neutral badges with the small brand icon inside; the icon carries the colour, the
badge does not.

Generic UI icons (home, campaigns, phone, mail, search, filter) are `--ink-muted`, never coloured.

### Red / amber
Only for errors and warnings (failed payment, out of credits, bounced, issues), always with a word.

### No hex
Zero hardcoded hex in `app/(app)`. Missing colour → add a token under `.mantis-app` (never `:root`;
the landing page reads `:root`).

---

## 2. Typography

Fonts stay: Plus Jakarta Sans (UI), Fraunces (page titles), Poppins (wordmark). No Inter.

### Six sizes only

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--fs-title` | 30 / 36 Fraunces | 500 | Page title — where it already is |
| `--fs-h2` | 17 / 24 | 600 | Card, section, drawer, results-pane titles |
| `--fs-body` | 14 / 20 | 400 (500 for names) | Default: cells, buttons, nav, inputs, chat |
| `--fs-small` | 13 / 18 | 400 | Descriptions, sub-lines, table headers, helper text |
| `--fs-xs` | 12 / 16 | 500 | Badges, chips, meta, counts |
| `--fs-label` | 11 / 16, uppercase, +0.06em | 500 | Eyebrows / group labels that are already uppercase |

Mapping for the existing 30 sizes: ≤11.5 → 11 or 12; 12–12.5 → 12; 13–13.5 → 13; 14–15.5 → 14;
16–17 → 17; 22+ → 30 (title) or 17.

- Weights: **400, 500, 600 only.** Every 700 → 600, every 800 → 600 (or 500 if it is not a heading).
- Emphasis comes from weight 500 or `--ink` vs `--ink-muted`, not from colour.
- Table headers: keep their position; style `--fs-small`, 500, `--ink-muted`, **sentence case**.
- Counts, credits, scores: `.tnum`.
- Missing values keep their current form (`—`), in `--ink-faint`.

---

## 3. Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Badges, status chips, signal chips, checkboxes |
| `--radius-sm` | 6px | Buttons, inputs, selects, tabs, nav rows, icon buttons |
| `--radius-md` | 8px | Panels, cards, table container, dropdowns |
| `--radius-lg` | 12px | Modals, popovers, drawer cards, chat composer |
| `--radius-pill` | 999px | Toggles, avatars, filter/suggestion chips, the founder widget. **Not buttons, not badges** |

In `globals.css` (`.mantis-app` only): `--radius-lg 16 → 12`, `--radius-md 10 → 8`, add `--radius-xs: 4px`.

---

## 4. Control sizes (same controls, same places — just sized consistently)

| Component | Height | Padding-x |
|---|---|---|
| Button (default) | **36** | 14 |
| Button small (in tables / toolbars) | 28–32 | 10 |
| Button large (auth, empty-state CTA only) | 40 | 16 |
| Input / select / search | 36 (32 in a table toolbar) | 12 |
| Icon button | 32 (28 in a table row) | — |
| Nav row | 36 | 10 |
| Badge | 20 | 6 |
| Toggle | 20 × 36 | — |
| UI icons | 16 (20 for large glyphs) | — |

Spacing values snap to **4 / 8 / 12 / 16 / 24 / 32 / 48** wherever a value is touched — no 10, 14, 18, 20.
This is padding/gaps only; it does not move elements between places.

Table rows: content stays the same, but with smaller chips (20px, 12px text) and 600-max weights,
rows get shorter on their own. Do not cut content to hit a height.

---

## 5. Buttons

| Variant | Look | Where |
|---|---|---|
| Primary | `--accent` fill, white, 500 | The one main action per view |
| Strong | `--ink` fill, white, 500 | A second important action ("Setup & Connect", "View plans"-type) |
| Secondary | white, 1px `--rule-strong`, `--ink` | Export, Quick outreach, Edit |
| Ghost | no fill / border, `--ink-muted`, hover `--surface-sunk` | Toolbars, row icons, ⋯ |
| Danger | secondary with red text | Destructive |

- No shadows on buttons. Hover = slightly darker. Focus = 2px `--accent` outline, 2px offset.
- Radius `--radius-sm`, never pill.
- Row icon buttons (phone / mail): keep them where they are and always visible; style them as ghost or light-outline (`--rule`), not heavy boxes.

---

## 6. Borders and shadows

- Structure comes from 1px `--rule` hairlines (`.rule-*`, `.panel` already exist).
- Table: one rule-framed container, row dividers `--rule`, header on `--surface-sunk`. No zebra.
- Shadows only on things that float: dropdown, popover, modal, drawer → `--shadow-pop`. Cards and
  panels: none.
- Glows and gradients on panels: remove (it is a visual effect, not layout).

---

## PR checklist (every UI change in `app/(app)`)

- [ ] No layout / UX change — nothing moved, added, removed or hidden
- [ ] Green only in the budget: primary button, nav marker, positive dot, focus, logo
- [ ] At most one filled green button visible
- [ ] No hex; `fontSize` in the 6-step scale; no `fontWeight` 700/800
- [ ] Buttons and badges not pill; radius from tokens
- [ ] Brand logos keep their colour inside neutral boxes; UI icons grey
- [ ] Shadow only on something that floats
- [ ] Token edits inside `.mantis-app`, never `:root`

## Order

- **P0 — tokens + de-greening.** Radius tokens, type-scale tokens, then sweep green out of chips, score rings, status pills, badges, eyebrows, chat bubble, toggles, pagination, founder widget. This step alone fixes most of the "green green" feel.
- **P1 — weights and sizes.** 700/800 → 600/500; collapse 30 font sizes to 6; buttons to 36px.
- **P2 — pill → radius** on buttons and badges; icon boxes neutral; remove leftover shadows/glows.
- **P3 — hex sweep** with the checklist.

---

## Implementation notes (2026-10-22)

The pass lives in `app/globals.css` as the last two blocks ("VISUAL PASS") — overrides scoped to
`.mantis-app`, so the landing page is untouched — plus a sweep of `app/(app)` + app components
(landing/marketing/pseo/widget excluded): weights 700/800 → 600, inline font sizes snapped to the
6-step scale, card radii → 8, small radii → 6.

Decisions where the plan needed a call:
- **Active nav icon stays green** (Tarun asked for it earlier); the row fill is neutral. This is the
  only green besides the primary button, positive status dots, focus ring and logo.
- **Tiny product badges** (NEW/BETA) are neutral (`--surface-sunk`, muted). Origami tints them with
  its accent; we keep the green budget instead.
- **"Follow the run"** became secondary so the chat view has one primary ("Find more leads").
- **Run steps** finish with ink ticks; the run's live dot and progress ring stay green (status).
- **Score ring**: thin (2.5px) ink arc, number in ink.
- **Results-pane title** is sans 20/600 (Origami's list titles); serif only for page titles.
- **Founder widget** is ink inside the app, brand green on the marketing site.
- Pre-existing lint errors (`set-state-in-effect` in CreditsIndicator / LeadDetailPanel) are not from this pass.

## 2026-10-22 — colour pass reverted

Tarun reverted the neutral/ink colour pass: chips, badges, status pills, sidebar NEW badge,
credits pill, chat bubble, score ring, run ticks, links and the lead drawer are back to their
original colours. Kept: the radius/type tokens on `.mantis-app`, the 36px / radius-6 buttons, and
the font-size/weight normalisation. Settings now follows Origami's settings page
(components/settings/SettingsShell.tsx): app sidebar hidden, grey rail with Back + grouped items,
centred 760px column, white cards with label/description left and control right.
