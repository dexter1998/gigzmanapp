# Mantis V2 — search runs, playbooks, campaign drafts

Status: **plan, not built.** Written 2026-10-18. Visible only to the V2 allowlist
(`test@mantisai.in`, see `lib/v2.ts`). Designed with `.claude/skills/architecture-simplification`
— the architecture note is at the end.

Sending real email / WhatsApp / calls is **out of scope**. Campaign steps end in a `fired` state;
the send infrastructure is a separate project. Its known problems are listed in §7 so that the
data model does not have to change when it arrives.

---

## 1. What V2 has to do

From Tarun's own requirements (not from the ChatGPT design, which was treated as suggestions):

1. Onboarding starts from the user's **website** → a business profile: services, focus service, ICP.
2. Chat answers end in **CTAs that match the real state** (review, enrich more, expand area,
   build campaign), and everything the chat produces is **editable**.
3. "Find X near me" has **predictable defaults**: how many, what happens when there are fewer,
   what happens when there are many more.
4. Search works like Origami: pick the sources most likely to work for this ICP, try them in
   small batches, enrich, return ~20 results **with contacts**, while a **live panel** shows the
   work happening. Then: "find more of these" or "launch campaign".
5. Sources differ in reliability. Some always produce; some (web search → read site → scrape)
   sometimes do. **Credits must not be burned on attempts that return nothing**, and our own unit
   economics must stay predictable.
6. Mantis remembers **what worked**: a playbook per (service sold × signal × source), ranked by
   measured yield — the "brain" that learned that npm author profiles carry emails.
7. Campaigns: intent first, one service per campaign, single-channel first, then **multi-touch**
   (email → WhatsApp → call) with a sequence strategy. Building it is shown as an **n8n-style
   node graph**, because watching it assemble builds trust.
8. **Report and abuse** controls exist from the start.

---

## 2. What already exists and is reused

The skill's step 2. Most of V2 is a new use of these:

| Need | Already in the repo |
|---|---|
| Demo-only gate | `lib/v2.ts`, `lib/v2-session.ts`, `session.user.v2`, `.v2` CSS scope |
| Places discovery + cache | `/api/leads/find`, `area_type_scans`, `leads` |
| No-website / rating / review signals | `leads.has_website`, `website_url`, `rating`, `review_count` |
| Category language | `lib/categories.ts`, `lib/category-resolve.ts`, `lib/discovery-catalog.ts` |
| Chat + intent | `chats`, `chat_messages.intent`, `lib/planner.ts` |
| ICP row | `icps` (one per user, `offer` text) + `agency_profiles.website` |
| ICP agent design | `docs/chat-agents-v2.md` (Mantis Scout, `fetch_own_site`, tool tiers, call log) |
| Credits, idempotent charges | `lib/credits/server.ts` + `idx_credit_ledger_ref (reason, ref)` |
| Work that advances per request | tick pattern, `app/api/leads/enrich-tick` |
| Duplicate-proof "fire" | unique claim before side effect, `lib/email/send-bulk.ts` |
| Email extraction at scale | registry box (`enrich-from-registry.mjs`, ~14 domains/s, graded by `decision-gate.mjs`) |
| Contact store | prod `scrape_domains` / `scrape_emails` (~6 lakh companies, ~2.5 lakh contacts) |
| Hiring signal | `job_companies` (~1.7 lakh; ~26% with a careers page) |
| Other owned datasets | agency directory (50k), GitHub devs (178k, `profile_email`), IG creators, HRERA builders |
| Multi-step sequence engine | `lib/outreach/planner.ts` `decideNextStep()` (Mantis's own outreach — a reference, not shared) |

---

## 3. The one new concept: a **run**

Every search and every campaign build is a **run**: an ordered list of **steps**, each step one
source or operation, with its own status, counts and cost. That single structure gives four
things that would otherwise be four systems:

- the **live node graph** (the UI renders steps; nothing is animated that did not happen),
- the **tool-call log** `chat-agents-v2.md` requires (agent, tool, args, cost, outcome),
- **per-source yield and cost** — the data playbooks learn from (§5),
- **unit economics** per search, per playbook, per country, measured instead of guessed.

### Execution: tick-driven, no worker

App Runner gives CPU only while a request is in flight, so a run cannot keep going after the
response. The client drives it, exactly like `enrich-tick`:

```
POST /api/v2/runs            → plan the steps, return run + steps (status: planned)
POST /api/v2/runs/:id/tick   → claim the run, execute the next step(s) within ~20s, return run state
   …client calls tick every ~1s while status = running; the response IS the progress update
```

A refresh resumes from the database. Two tabs cannot double-execute: the tick claims the run with
a **lock row** (`UPDATE … SET locked_until = now() + 30s WHERE id = $1 AND locked_until < now()`),
not `pg_advisory_lock` — the pool makes advisory locks unsafe here (see the outreach dispatcher).

No SSE, no queue, no worker. If a step genuinely needs minutes (deep crawl), it hands work to the
registry box through a table and the run shows "3 more contacts arriving" when rows land.

### Tables (all additive, `v2_` prefixed so removal is a clean cut)

```sql
v2_runs        (id, user_email, kind 'search'|'campaign_build', intent jsonb, status,
                target int, delivered int, cost_inr numeric, credits_charged int,
                locked_until timestamptz, created_at, finished_at)
v2_run_steps   (id, run_id, seq, playbook_id, op, label, status planned|running|done|failed|skipped,
                input jsonb, raw_count int, kept_count int, cost_inr numeric, error text,
                started_at, ended_at)
v2_results     (id, run_id, lead_id uuid NULL, domain, name, phone, email, email_grade,
                signals jsonb, source_step_id, rank, reported text NULL)
v2_campaigns   (id, user_email, run_id, service, goal, strategy_id, status draft|ready|fired,
                version int, created_at, updated_at)
v2_campaign_steps (campaign_id, seq, channel email|whatsapp|call, day_offset, condition,
                requires none|opt_in|dnd_scrub, subject, body, version)
v2_recipient_steps (campaign_id, result_id, seq, state pending|skipped_no_channel|fired,
                fired_at, UNIQUE (campaign_id, result_id, seq))
```

`v2_results` has its own rows because non-Places sources (registry, GitHub, RERA) have no
`place_id` and `leads.place_id` is `NOT NULL UNIQUE`. When a result is a Places lead it links
`lead_id` instead of copying.

`user_profiles.v2_signals` (added in the V2 gate commit) is better used as the **seller profile**
(services, focus service, ICP) — lead signals live per result. Rename it to `v2_profile` before
it reaches production; it is local-only today.

---

## 4. The flows

### 4.1 Onboarding: website → profile (Mantis Scout, from `chat-agents-v2.md`)

The website is **optional** (Tarun, 2026-10-18). Skipping it asks three questions in chat instead
(what you sell, where, to whom) and leaves a "Complete your profile" prompt with a completeness
meter; adding the website later re-runs the analysis.

User enters their website. Steps (shown as a run): fetch home + `/services` + `/about` (plain
fetch, own domain, no ToS issue) → one LLM call extracts `{services[], industries_served[],
geography, proof (case studies), suggested_icps[]}` → user confirms/edits → saved to the profile.

Each service gets a suggested **signal** from §6 ("Website development → businesses with no
website or a Facebook page as their site"). That mapping is what lets search start without the
user knowing what a signal is.

### 4.2 Search: defaults the user can predict

| Situation | Behaviour |
|---|---|
| No count given | Target **20 delivered results** (Origami's free tier shows 30 rows; 20 fits a chat card) |
| Count given ("100") | Target that count; chat shows the first 20, the full set lives in the results table |
| Area | "near me" = current map viewport; city named = that city's bounds |
| Found **more** than target | Deliver target with contacts; show the true total ("61 match, 20 enriched") + **Enrich next 20** |
| Found **fewer** | Show what was found + **Expand to next radius** (with its credit estimate), **Add related categories**, **Relax a filter** — never widen silently |
| Found **zero** | Say which sources were tried and why each returned nothing (the run has the answer) |

Run plan for a search, cheapest and most reliable first:
`own data (leads cache, registry, jobs, directories)` → `Places, probe one tile` → expand only if
the probe's yield justifies it → `site fetch for contacts (live lane)` → `rank` → `deliver`.

### 4.3 Contacts: two lanes

- **Live lane (in the tick):** plain `fetch` of home + contact page for the top 20 domains,
  in parallel, email regex with a TLD-boundary trim, graded with the same rules as
  `decision-gate.mjs` (machine mailboxes dropped, role vs person). Seconds, no Playwright.
  **Yield unmeasured** — measure on 200 Gurgaon leads before promising "20 with email".
- **Deep lane (async):** domains the live lane missed are queued for the registry box (14/s,
  multi-page, Playwright). Results appear on the run later.

Classifier source of truth stays one file; copy it into `lib/v2/email-grade.ts` with a header
naming the original, or move it to a shared package. Two diverging graders is the bug the
registry already had.

### 4.4 Chat CTAs

The server returns `actions[]` from a fixed enum computed from **run state**, never from LLM
text: `review_results`, `enrich_next`, `expand_area`, `add_related`, `relax_filter`,
`build_campaign`, `edit_draft`, `fire_campaign`. Same rule as the agent tool allowlist: model
output is untrusted; buttons come from facts.

### 4.5 Campaign draft

1. **Intent** (asked only if missing): which service (default: focus service), goal (reply /
   call back / meeting), channels. Everything else defaults and is editable on the draft.
2. **One campaign = one service.** If the user asks for all services, Mantis splits the audience
   by signal (no-website → web dev; weak reviews → local SEO) and creates **one campaign per
   service** sharing the same `run_id`. No parent/child hierarchy.
3. **Strategy = a template, not free-form planning.** Three to start:
   - `email-only`: email d0 → email d3 if no reply
   - `email-then-call`: email d0 → call d2 if no reply
   - `warm-whatsapp`: email d0 → WhatsApp d2 **only if replied/opted in** → call d4
   The LLM picks a template and writes the copy; timing and conditions are template data.
4. **Per-recipient channel eligibility** is computed at build time from the data (email present?
   Indian mobile via `lib/phone.ts`?). A step a recipient cannot take is `skipped_no_channel` and
   shown as such — **never a silent fallback to another channel**.
5. **Editing:** chat edits and form edits both `PATCH` the same draft and bump `version`. Fire
   checks the version the user saw.
6. **Fire:** inserts `v2_recipient_steps` rows (the unique key is the future duplicate guard) and
   marks them `fired` through a no-op adapter `fire(channel, recipient, step)`. Conditions like
   "if no reply" display as *assumed — reply detection not built*.

The build itself is a run (`kind = campaign_build`): audience → eligibility → strategy → copy →
checks → ready — rendered as the node graph.

### 4.6 Report and abuse (now)

- **Report on a result:** wrong business / wrong contact / closed / duplicate →
  `v2_results.reported`. It is also a yield signal: a playbook whose results get reported loses rank.
- **Cost abuse caps:** runs per user per day, max target per run, and a **run budget** (below).
  The temp-mail incident (122 free scans) is the shape to defend against.
- Campaign/send abuse (complaints, opt-outs, sender reputation) is designed with the send
  infrastructure, where it can actually be enforced.

---

## 5. Playbooks and unit economics

### 5.1 A playbook is a file, not a model

```ts
// lib/v2/playbooks/no-website-local.ts
export default {
  id: "no-website-local",
  sells: ["website_development"],
  targets: { kind: "local_business", categories: "*" },
  signal: "No website listed, or a social page as the website",
  tier: "A",                       // A reliable · B structured public · C exploratory
  tos: "api",                      // api | public | scrape
  steps: ["own_leads", "places_probe", "places_expand", "site_fetch"],
  costPerAttemptInr: 3.08,         // one Places call
} satisfies Playbook;
```

Playbooks live in git, so a new one is reviewed like code. **What they learn is not stored in
them**: yield and cost come from `v2_run_steps` grouped by `playbook_id` and country. Selecting a
playbook = filter by (service, target kind, country) → rank by measured `kept_count / cost`
→ untested playbooks get a small exploration budget. That is the whole "brain"; it needs no
training system, and it gets better with every run.

**New playbooks** (the npm-author-profile kind of discovery) come from an exploratory run: tier C,
web search → read pages → note where contacts appear. A run that works is turned into a playbook
file by a human (or an agent in a reviewed PR). Agents never deploy extraction code by themselves.

### 5.2 Charging for results, not attempts

Clay charges **per attempt** across its waterfall — exactly the risk Tarun described, pushed onto
the customer. Mantis today also meters per Places call. V2 charges for **delivered results and
revealed contacts**, and absorbs attempts — which is only safe because attempts are measured:

- **Price per result is derived from measured cost.** India no-website: ~₹0.49 per qualifying lead
  (measured 2026-09-01); US: ~₹4.05. The same credit price cannot serve both — per-result price is
  per playbook × country, computed as `ceil(measured cost per result × margin ÷ credit price)`, and
  must clear `CREDIT_FLOOR_INR`.
- **Every run has a budget:** `target × measured cost per result × 2`. When spend hits it, the run
  stops and offers what it has. A playbook with no history runs only its probe.
- **Probe before expanding.** Measured on the IG harvest: 62.5% of India geo queries returned
  nothing; one probe per place pruned ~11,000 dead queries. Probe with **two** different seeds —
  one seed would have killed San Francisco, a second found 18 results.
- **Failures don't charge.** A failed source is a `failed` step; the user sees it and pays nothing
  for it.

For the demo account credits can be simulated, but `cost_inr` is recorded from the first run —
that table is the unit-economics answer.

---

## 6. Signals by industry — research and seed playbooks

### 6.1 What others use

- **Origami** (scraped 2026-08-30, `~/Desktop/origami-scrape/`, 132 `/for/*` industry pages):
  Google Maps in 93% of industries, job boards 63%, Google reviews 61%, a generic "growth
  signals" feed 58%, then US-only registries (NPI, state license boards, BBB, county permits,
  state business filings). Their signal phrases cluster on **growth/expansion** (opened a second
  location, hiring, new licence filed), **licence/registry facts**, and **review velocity**.
  "Website" does not appear as a signal on any of the 132 pages — Mantis's core signal is one
  they do not sell.
- **Clay**: waterfall over 150+ providers (stop at the first valid result), signals = job change,
  hiring, funding, tech-stack change, web intent; Claygent reads websites for custom fields;
  credits **per attempt**.
- **Local-business tools** (GrapeLeads, D7 Lead Finder, Outscraper): no website / Facebook-as-website,
  sub-3-star reviews, ad detection.
- **Open source**: gosom (Maps, already used), webappanalyzer fingerprints (open continuation of
  Wappalyzer — tech-stack detection), crawl4ai (tested: ~11% extra yield, invents addresses),
  n8n (workflow orchestration — what Clay replacements are built on).

### 6.2 Origami's US sources → Indian equivalents

| Origami (US) | India equivalent | Notes |
|---|---|---|
| Google Maps / reviews | Google Places | live |
| Yelp, BBB, Angi/Thumbtack | Justdial, Sulekha, UrbanCompany | scrape tier (ToS); Sulekha already a webdev-lead source |
| State licence boards, NPI | NMC register, state dental councils, ICAI firm search, Bar Councils | public lookups; bulk access to verify |
| State business filings | MCA company master data (data.gov.in), GST | new incorporations = "new business" signal; to verify |
| County permits | RERA project registrations | HRERA Gurugram list already built |
| Indeed / job boards | own `job_companies` careers pages, Naukri/LinkedIn | own data first |
| Crunchbase | Inc42 / Entrackr funding news, Tracxn | web read, tier C |
| Trade show exhibitors | IndiaMART, trade-fair exhibitor lists | to verify |
| Food permits | FSSAI FoSCoS licence search | to verify |

### 6.3 Seed playbooks — signal by the service the **user sells**

The signal depends on what the seller sells more than on the target industry: the same dental
clinic is a lead for a web agency because it has no site, and for an SEO agency because it has
40 reviews where peers have 300.

| # | Playbook | User sells | Signal | Source | Tier | Status |
|---|---|---|---|---|---|---|
| 1 | no-website-local | Website dev | No website | Places `has_website` | A | **live**, measured (IN 37.5% blended) |
| 2 | social-as-website | Website dev | Website is facebook/instagram/linktree/wa.me | `leads.website_url` | A | data exists, unmeasured |
| 3 | dated-website | Redesign / dev | No HTTPS, no mobile viewport, © year old, parked | site fetch | B | build |
| 4 | slow-website | Dev / SEO | Poor mobile performance | PageSpeed Insights API (free) | B | build |
| 5 | weak-reviews | Local SEO / reputation | Reviews far below area-category median; rating < 4 | `leads` aggregates | A | data exists |
| 6 | hiring-now | Recruitment / HR / "growing" for anyone | Open roles on careers page | `job_companies` | B | data exists, yields measured per category |
| 7 | new-rera-project | Marketing / CRM / web for builders | New RERA registration | HRERA list | B | data exists (Gurugram) |
| 8 | tech-stack | WP maintenance, Shopify apps, migrations | Specific CMS / platform / missing pixel | site fetch + webappanalyzer fingerprints | B | build |
| 9 | agencies | Selling to agencies | Agency in directory, by service / city | agency directory (50k) | A | data exists |
| 10 | developers | Dev tools (Stickly) | Public GitHub/npm profile email | GitHub API, npm registry | B | data exists (178k) |
| 11 | creators | Brand partnerships | Two-word identity match, follower band | IG harvest | B | data exists, keys spent |
| 12 | explore-web | Anything else | Web search → read → extract | search + fetch | C | probe budget only |

Build order inside §8 starts with 1, 2, 5 (no new data needed) and 6, 9 (own data, other tables).

---

## 7. The `fired` boundary — send problems to design for now

None of these is built. Each one changes a field that exists in §3 so the schema does not move later.

- **Email must not go through Mantis's SES account.** The AWS account is shared and also sends
  OTP and password-reset mail; one customer's bounces could suspend it. User campaigns need the
  user's own mailbox (Gmail/Outlook OAuth) or their own verified domain. → `v2_campaigns` will need
  a `sender_id`.
- **Replies are not an SES event.** "If no reply" needs an inbound mailbox. Until then the
  condition is displayed as assumed.
- **Address validation is asynchronous.** SES Auto-Validation suppressions arrive later as
  bounce events, not as a skipped send.
- **WhatsApp cannot be a cold channel.** Business-initiated messages need an approved template and
  recipient opt-in. That is why `warm-whatsapp` puts WhatsApp **after** a reply, and why
  `v2_campaign_steps.requires` exists. Template id + variables are stored apart from free text.
- **Calls in India** (promotional) fall under TRAI's commercial-communication rules — registered
  numbering, DND preference scrub, calling hours. AI voice adds consent and recording questions.
  `requires = 'dnd_scrub'` marks the step; the provider integration decides the rest. Verify with
  the chosen telephony provider before building.
- **Duplicate sends** are already designed out: `v2_recipient_steps` unique key, claimed before
  the adapter call — the `sendBulkEmail` pattern.

---

## 8. Build order — each slice is demoable on the test account

| Slice | Deliverable | New |
|---|---|---|
| 0 | V2 gate (done, local) | `lib/v2*.ts`, session flag, `.v2` scope |
| 1 | **Search run + live node panel**, on sources that already exist (own leads → Places probe → expand → rank). Chat card with 20 results + CTAs | `v2_runs`, `v2_run_steps`, `v2_results`, run + tick routes, panel component |
| 2 | Website → profile (Mantis Scout) | profile JSON in `user_profiles` |
| 3 | Live contact lane + "enrich next 20" + deep-lane handoff | email grader copy, measured yield |
| 4 | Playbooks 1, 2, 5, 6, 9 + ranking from run stats + run budget | `lib/v2/playbooks/*` |
| 5 | Campaign draft: intent → template → copy → eligibility → edit → fire (no-op) + build graph | `v2_campaigns`, steps, recipient steps |
| 6 | Report button, daily caps, admin view of runs and cost per result | — |
| later | Send infrastructure per channel (separate plan, §7) | — |

**Competitor hands-on tests** go between slice 0 and the slice-1 UI: their progress panel, CTA
set and result table are what slice 1 is measured against. Same five prompts on Origami, Clay and
Mantis: Gurgaon dentists without a website; CA firms in Jaipur; Gurugram builders with a new
project; Indian Shopify stores; agencies that are hiring. Record time to first result, results
delivered, contact coverage, accuracy on a 10-row spot check, credits used, CTAs offered, and how
a result becomes a campaign. Observe the network panel of our own session to see how they stream
progress (polling vs SSE); don't harvest their data.

---

## 8b. Pipeline stages and learning scope

The deck's ten stages (Client Context → ICP → Strategy → Pipeline → Orchestrator → Enrichment →
Campaign Planner → Campaign Engine → Execution Engine → Outcome Intelligence) are the **node
labels** of the run graph. They are stages, not ten agents: most are deterministic steps; an LLM
is called only where judgement is needed (profile extraction, ICP suggestion, copy).

**Self-learning agent: scope later.** For now everything is saved so it can learn later — chats
(already persisted), runs and steps, which results the user kept, edited, reported or put in a
campaign. The only learning live in V2 is playbook ranking from measured yield.

## 9. Where this deliberately differs from the ChatGPT design

| Proposed there | Here | Why |
|---|---|---|
| 9 entities (Workspace, ChannelPermission, CampaignVersion, RecipientExecution, ProviderEvent, UsageLedger, …) | 6 `v2_` tables | Version is an int on the draft; the ledger exists; permissions only matter once sending is real |
| Multi-client workspaces from the start | Not now | One demo account; agencies-with-clients is a later tenancy project |
| Source Strategy Engine + sandbox + admin promotion | Playbook files in git + yield from run steps | Review is the PR; stats are a `GROUP BY` |
| Orchestrator + 10 agents | One run executor; Mantis Scout is the only agent | `chat-agents-v2.md`: agents are for different work. The graph can still *name* steps |
| Queue workers, DLQ, backpressure | Tick route + lock row | No CPU between requests on App Runner; no sending yet |
| Parent/child campaigns for multi-service | One campaign per service, same `run_id` | Same attribution, no hierarchy |

Agreed with it: no silent channel fallback, CTAs from state, never claim "delivered" on
"accepted", WhatsApp/call consent, one service per campaign by default.

---

## Architecture note

- **Outcome:** on the demo account, a chat search shows a live graph of sources being tried and
  returns ~20 results with contacts, which become an editable multi-touch campaign that fires
  (no-op) without duplicates.
- **Invariants:** no credit charged for a failed attempt; nothing fires without the user's
  approval of the version they saw; a step never fires twice; non-V2 accounts see nothing.
- **Reuses:** V2 gate, `chargeCredits` + `(reason, ref)`, tick pattern, lock row, unique-claim
  fire, Places cache, registry box, `job_companies`, agency directory, `chat-agents-v2.md` tiers.
- **New:** six `v2_` tables (rung 5 — a run is a real lifecycle no existing table carries);
  run/tick/campaign routes (rung 4); playbook files (rung 2). No new process, queue or service.
- **Rejected:** worker + queue + separate orchestrator service, and the nine-entity model —
  nothing in V2 needs CPU outside a request or state the six tables do not hold.
- **Removal:** drop `app/api/v2/`, `lib/v2/`, `components/v2/`, the `v2_` tables, and the gate
  lines in `auth.ts` and `app/(app)/layout.tsx`.
