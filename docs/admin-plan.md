# Admin panel — plan (2026-10-26)

Purpose: the admin is where we (a) see whether the product is working for real users, (b) find who to
upsell and who is stuck, (c) catch what the agent gets wrong, and (d) run the business (credits,
payments, outreach infra). Today it has 13 pages grown one at a time. This plan groups them by the
question they answer, names what is missing, and orders the work.

## 1. Structure (what each section answers)

| Group | Pages | Question it answers |
|---|---|---|
| **Pulse** | Overview · **Activity** (new) · Users | Is usage growing, who is active, what do they do? |
| **Revenue** | Economics · Plan grants · Payments (new) · **Upsell** (new, split out of Activity) | Where does money come from, who is about to pay, who churned? |
| **Agent quality** | **Chats** (new) · **Runs & decisions** (new) · Deletion requests | Did the agent understand, plan well, and deliver relevant leads? |
| **Outreach** | Campaigns (sends email) · Inbound · Founder inbox · **Integrations health** (new) | Are campaigns, mailboxes, voice and WhatsApp working for users? |
| **Supply** | Scraping · pSEO · **Index coverage** (new) | Do we have businesses where users search? |
| **Systems** | Mailing · Health & Logs · **Cron & costs** (new) | Is anything broken or burning money? |

Pages already exist except the ones in bold.

## 2. New pages, in build order

### 2.1 Activity (built) → add
- Section tables (done), funnels (done), upsell list (done), daily (done).
- **Per-event drill-down**: click an event → last 50 occurrences with user, path, props.
- **Cohorts**: signup week × activation stage (table), so we see whether new weeks activate faster.

### 2.2 Chats
One row per chat: user, first message, turns, turn types, whether a plan was made, run status,
delivered/target, thumbs up/down, orchestrator reasoning, gaps flagged (`v2_turn_log.gap_note`).
Filters: no plan after 2+ turns · plan never run · run delivered < 50% · negative feedback · gap flagged.
Click → full transcript (user text is sensitive: admin-only, never exported) with the agent's steps
per turn (`intent.steps`), the scope card as the user saw it, and the run's decisions.
Why: this is the "diagnose what happened" view we did by hand today, for every chat.

### 2.3 Runs & decisions
Per run: ask, plan (trades, area, signals, offering), orchestrator approach + confidence, reused
pipeline, strategies run and what each contributed (from `v2_results.provenance`), mid-run decisions
(`v2_decisions`), delivered/target, relevance (delivered category ∈ plan types), contact quality
(phone / email tier / decision-maker / LinkedIn), credits charged, time.
Aggregates: pipelines table (`v2_pipelines`) with delivered rate, email rate, score, outcomes;
strategy yield by source; "honest stops" and their reasons; runs that failed (step errors).
Why: tells us where to add a source or signal next, and whether the orchestrator's reuse decisions pay off.

### 2.4 Upsell
The "ready to upsell" list, made actionable: signals with evidence, credits left, plan, last seen,
a "contacted" checkbox and note (small `admin_notes` table), and the outcome (paid / no / later).
Also: checkout started but not paid (24h), credits < 10% with active usage, users whose plan ended.

### 2.5 Integrations health
Per user: email sender(s) status + last sync + last error; voice test calls (count, last status,
seconds); WhatsApp status; campaigns created / tested / approved / sending; bounces and complaints.
Global: SES bounce/complaint rate, Sarvam/Telnyx failures, Gmail token refresh failures.

### 2.6 Payments
Orders by gateway (Razorpay / Cashfree): created, paid, failed, abandoned; amount; pack; user;
webhook received or not. The CSP incident (checkout broke silently for weeks) is the reason this
page exists: a "0 paid in 7 days while N checkouts started" alert at the top.

### 2.7 Index coverage
Saved businesses by city × category vs. what users asked for (from plans): the empty-pool asks
(Barshi, Houston, US…) listed with counts, so a gosom sweep can be queued from here. Site-signal
coverage (how many saved businesses have been read, by city), bulk enricher progress.

### 2.8 Cron & costs
Every cron's last run, duration, ok/fail (`cron_runs`); model calls per agent per day and their
cost; Exa / Places / Apollo spend from `v2_source_attempts`; per-user cost vs credits charged
(margin), so pricing decisions use measured numbers.

## 3. Cross-cutting

- **Date range + staff filter** on every page (7/14/30/90d; exclude @mantisai.in, test accounts).
- **User drill-down** (`/admin/users/[email]`): already has ledger, payments, errors, activity
  timeline; add chats, runs, integrations and notes so one page tells a user's whole story.
- **Alerts strip** on Overview: payments stalled, cron failed, bounce rate high, empty-pool asks
  rising, zero-delivered runs rising. Computed on load, no extra infra.
- **Exports**: CSV for users/upsell/payments only (no chat text).
- **Access**: `ADMIN_EMAILS` gate as today; add a read-only role later if anyone else needs it.

## 4. Data it needs (all already written, except notes)

`product_events`, `v2_turn_log`, `chat_messages`, `v2_runs` (+ `reasoning`), `v2_run_steps`,
`v2_decisions`, `v2_results`, `v2_pipelines`, `v2_outcomes`, `v2_source_attempts`, `v2_senders`,
`v2_voice_tests`, `v2_campaigns`, `credit_ledger`, payment orders, `cron_runs`, `leads`,
`scrape_domains.site_signals`. New: `admin_notes(user_email, note, author, created_at)`.

## 5. Order and size

1. Chats + Runs & decisions (agent quality — the most asked-for view) — 1 day.
2. Upsell + Payments (revenue) — half a day.
3. Integrations health + Cron & costs — half a day.
4. Index coverage — half a day (queries exist in the orchestrator's `countFor`).
5. Cohorts, alerts strip, notes, exports — half a day.
