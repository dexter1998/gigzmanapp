# V2 agents — who does what, who calls whom, how scope is enforced

Status: **design agreed 2026-10-19, not built.** V2 only (`test@mantisai.in`, see `lib/v2.ts`).
Supersedes the single-agent section of `chat-agents-v2.md` (the ICP agent there is now
**Mantis Scout**). Inputs: the read of all 415 production chats (audit kept off-repo, it holds
real user text) and the Origami/Clay teardown.

Jobs (job seekers, the jobs dashboard mode) are **out of scope** for V2 agents. Such a request
is detected and redirected, nothing more.

---

## 1. The goal: handle things the way Claude does

"Claude-like" is concrete, not a vibe. It means these six behaviours, and each one is a design
requirement below:

| # | Behaviour | What it rules out (seen in production chats) | Where it lives |
|---|---|---|---|
| C1 | **Acts, then reports.** Uses tools in a loop until the job is done, then writes the reply from what the tools returned | "Searching… hold on" on a turn that only asked a question; "found 50 dentists" after a zero result | Agent loop (§4), reply rule (§7.1) |
| C2 | **Makes a sensible default instead of asking.** At most one question, and it always carries the default it will use | Five clarifications in a row; the user leaving on an unanswered bot question | §7.4 |
| C3 | **Is honest about limits, and offers the nearest thing it *can* do** | "I can't share emails" while selling contact unlock; "I'll update you in 24 hours" | `product_facts`, §7.5–7.7 |
| C4 | **Breaks a big ask into steps and shows them** | Long B2B briefs answered with a generic "Here's a strategy…" | Planner + todo box (§5) |
| C5 | **Understands who is asking.** Seller vs buyer vs consumer, and which language | Vendor-seekers shown customers; consumers shown a lead list | Router audience field |
| C6 | **Answers things outside the tools from knowledge, clearly marked as advice** | Strategy/pricing questions getting a search or a refusal | Mantis general answer path |

The agents can only be as good as the model behind the orchestrator. **V2 runs on the Claude API**
(`lib/v2/claude.ts`, `ANTHROPIC_API_KEY`): Router on Haiku 4.5, the answer path on Sonnet 5.5
(`V2_MODEL_CHEAP` / `V2_MODEL_BEST` override). v1 stays on Bedrock Nova Pro and is untouched.
Sonnet 5.5 rejects a forced `tool_choice`, so the answer path offers its tool with `auto` and
accepts plain text. Final model choice is decided by the eval set (§9), not by preference.

Built (2026-10-19, local only): Router, Mantis orchestrator, **Mantis Scout** (`scout.ts`, own
site → `user_profiles.v2_profile`), **Planner** (`planner.ts` → `v2_runs`/`v2_run_steps`),
**Runner + Qualifier** (`runner.ts`, ticks via `/api/v2/runs/[id]/tick`; site signals + emails
from the business's own site, `scrape_emails` lookup, unknown domains queued into `scrape_domains`
for the AWS box), playbooks (`playbooks.ts`: no-website, dated-website, weak-reviews, no-tracking,
no-booking), SSRF-safe fetch (`net.ts`), and the workspace UI (`components/chat/v2/V2Panel.tsx`:
chat narrows, right panel with todo box + live timers + results table, green glow while working).
Website reads use the **shared enricher** — the AWS box's `enrich2.mjs`, vendored into
`lib/v2/enricher/` by `scripts/sync-enricher.sh` (edit the source in webdev-leads, then sync). The
app runs it in fast mode through `safeFetch`; results go to `scrape_domains.site_signals`, which the
box also writes, so a site read once is not read again for 30 days. Campaign agent not built.
Earlier step 1: `lib/v2/{state,router,search,facts,answer,turn,claude}.ts`, tables
`v2_chat_state` + `v2_turn_log`, the V2 branch in the chat messages route, typed chips and step
lines in `ChatThread`.

---

## 2. Why a plan, not a script (vs Origami and Clay)

| | Origami | Clay | Mantis V2 |
|---|---|---|---|
| Unit of work | LLM writes JavaScript calling a services SDK | User adds fixed actions as table columns | **LLM writes a plan**: a JSON list of steps, each step a tool from our catalog |
| Cost before run | Unknown (hence the $99 card trial) | Known per row | **Known**: every tool has a tier and a price |
| Progress UI | Polls artifacts | Per-cell status | **Todo box = the plan's steps**, nothing invented |
| Failure | A new bug per script | Per-cell retry | Per-step retry inside a tick (`maxDuration` 60) |
| Learning | Hard, every script differs | Per-action stats | `GROUP BY` over typed steps in `v2_run_steps` |
| Long tail | Any code | Whatever actions exist | One escape-hatch step: `web_research` |

The plan is Origami's flexibility with Clay's predictability. Nothing here executes model-written
code.

---

## 3. The agents

Five LLM agents, plus code that is deliberately not an agent. An agent exists only for a
genuinely different kind of work — extraction bugs are fixed in code, not with more agents.

| Agent | Job (one line) | Tools (allowlist, enforced in the dispatcher) | Writes | Billed budget | Model tier |
|---|---|---|---|---|---|
| **Router** | Type the message (R1–R14, §6), audience, language; turn a chip into its action | `classify`, `apply_action` | `turn.type`, `turn.audience` | 0 | cheap |
| **Mantis** (orchestrator) | The only voice the user hears. Calls the others, writes the reply after results | `call_agent`, `session_state`, `product_facts`, `gap_stats`, `skills` | `turn.reply`, `turn.actions` | 0 — spends only after the user approves | best |
| **Mantis Scout** (profile & ICP) | Read the user's own website → profile → ICP → which signals fit what they sell | `fetch_own_site`, `lead_aggregates`, `resolve_category`, `signal_catalog` | `profile`, `icp` | 0 | mid |
| **Planner** | Turn a brief or a service into a plan: playbook, steps, sources, cost estimate | `playbooks`, `signal_catalog`, `source_catalog`, `estimate_cost` | `run.plan` | 0 — it only plans | best |
| **Qualifier** | Per row: check signals (no/old website, no SSL, hiring…), run the contact waterfall | `site_check`, `enricher`, `registry_lookup`, `web_page` | `row.signals`, `row.contacts` | within the run's approved budget | cheap |
| **Campaign** | Shortlist → sequence + templates → draft; ends at `fired` | `templates`, `draft_sequence`, `fire` (no-op adapter) | `campaign.draft` | 0 | mid |

**Runner is code, not an agent.** It executes plan steps one per tick: Places, our registry DB,
directories, `web_research`. Putting an LLM in the search path is what produced invented results.

`fetch_own_site` reuses the AWS scraper/enricher (registry box). Own domain only: homepage,
`/about`, `/services`, `/contact`.

---

## 4. Who calls whom

```
message ─► Router ─┬─ chip / refine (R4,R5) ─────► apply_action ─► Runner ─► Mantis writes reply
                   ├─ direct search (R1,R2) ─────► Runner (Places, map centre) ─► Mantis
                   ├─ website / intro (R10) ─────► Mantis ─► Mantis Scout ─► profile card
                   ├─ service / brief (R3,R6,R7) ► Mantis ─► Planner ─► plan + cost card
                   │                                         └─ user taps Run ─► Runner ─► Qualifier per row
                   ├─ contacts (R8) ─────────────► unlock confirm ─► Qualifier (contact waterfall only)
                   ├─ outreach (R9) ─────────────► Campaign ─► draft
                   └─ advice / product / out of scope (R11,R12,R13*,R14) ─► Mantis (+ gap_stats, product_facts)
```
\* R13 (user is the buyer) goes to Planner with `goal: "vendor"`.

Rules:
1. **Hub and spoke.** Only Mantis calls agents. Agents never call each other — no loops, no
   unaccounted spend. Each returns a typed result plus `suggestedNext[]`, which Mantis turns into
   chips (typed actions, never text).
2. **One sanctioned exception:** Runner calls Qualifier per row. That is a plan step, not an
   agent's decision.
3. **Mantis Scout runs first when needed.** If Planner needs an ICP and `profile` is empty, Mantis
   calls Scout. No website → ask once, or offer "Complete profile", then continue on defaults.
4. **Mantis loops, the others don't.** Mantis may make several calls in a turn (C1), capped by
   `maxSteps`. Sub-agents do one job and return.

---

## 5. Processing lines and the todo box

Every tool call emits one line: **action name + timer + `›`** (expandable to args/result).
Labels come from the server (the step), never guessed client-side.

```
✓ Understood: dentists, Indore, no website        0.4s ›
✓ Searched Google Places (3 grid cells)            3.1s ›
● Checking websites  12/20                          5s  ›
○ Finding contacts
```

A run with a plan shows the plan as a todo box; while any step runs, the right panel gets the
green working border (UI spec lives with the V2 UI work).

---

## 6. Request types → path (from the production read)

| Type | What users ask | Path | LLM agents involved |
|---|---|---|---|
| R1 | category + place | Router → Runner | Router only |
| R2 | category, no place / "near me" | map centre / GPS; ask once only if truly unknown | Router |
| R3 | place, any business | Planner picks top categories by our gap rates | Planner |
| R4 | more / wider / drop filters | `apply_action` (page, radius, clear) | none |
| R5 | numeric filters, exclusions | typed slots incl. upper bounds, negation, radius | Router |
| R6 | services other than websites (SEO, ads, ERP, HR…) | service → signals → plan | Scout (if needed), Planner, Qualifier |
| R7 | long B2B briefs with contacts | plan → sources → qualify → table | Planner, Qualifier |
| R8 | contact details | explain unlock, confirm, waterfall | Qualifier |
| R9 | outreach / "now what" | draft campaign | Campaign |
| R10 | own URL / business intro | site → profile → ICP | Scout |
| R11 | strategy, which niche/city | answer from `gap_stats`, marked as advice | Mantis |
| R12 | product, pricing, trust | `product_facts` only | Mantis |
| R13 | user is the buyer | vendor-goal plan | Planner |
| R14 | consumers, job seekers, spam | detect, redirect politely | Router, Mantis |
| — | anything else | answer from knowledge (C6) **and** log a capability gap (§8) | Mantis |

---

## 7. Response rules (each one fixes a measured failure)

1. **Reply after the tool result, from the result.** Progress text belongs in the todo box,
   never in the reply.
2. **Chips are typed actions:** `{clear:["noWebsiteOnly"]}`, `{radius:"+5km"}`, `{page:"next"}`.
   A chip click never goes through an LLM.
3. **Zero results:** say so, say why if known, offer the one action most likely to work.
4. **At most one question per turn, with its default:** "Showing 20 around the map centre —
   change the area?"
5. **Product facts only from `product_facts`** (credits, unlock, sources, pricing). Never improvised.
6. **Never claim an action that did not happen** (no "I'll update you later", no "you can call
   them from here" until that exists).
7. **Reply in the user's language and register.**

---

## 8. Scope: the agent manifest

Each agent is a manifest. Everything in it is **enforced in code** — the prompt only explains.

```ts
type AgentManifest = {
  id: "router" | "mantis" | "scout" | "planner" | "qualifier" | "campaign";
  displayName: string;            // "Mantis Scout"
  job: string;                    // one line; anything outside it returns to Mantis
  reads: StateKey[];              // session-state keys it may read
  writes: StateKey[];             // and write — e.g. scout: ["profile","icp"]
  tools: ToolId[];                // allowlist; dispatcher re-checks every call
  skills: string[];               // markdown files loadable on demand
  budget: { billedCredits: number; maxSteps: number; maxMs: number };
  approval: ToolId[];             // need the user's explicit yes: billed runs, unlock, fire
  output: JSONSchema;             // Mantis reads this, not free text
  model: "cheap" | "mid" | "best";
};
```

Every tool call is logged (agent, tool, args, cost, outcome, ms) in `v2_run_steps` from day one.

### Growing capability from chats

All chats are saved. Capability grows by the same loop that produced this design:

1. **Capability-gap log.** When Router finds no matching type, or Mantis answers from knowledge
   because no tool fits, the turn is tagged `gap` with a one-line description.
2. **Periodic read.** Read the `gap` turns plus a sample of normal ones; group them.
3. **Add the cheapest thing that closes the gap**, in this order:
   `product_facts` line → skill/playbook file → signal/source in the catalog → new tool → new agent.
   A new agent is the last resort.
4. **Add the case to the eval set** before shipping the change.

Skills and playbooks are markdown files in git, loaded by description on demand (only their
names and one-liners sit in the prompt). Adding a playbook needs no code change.

---

## 9. Eval set (gates every prompt, model or tool change)

Seed it with the 25 "asked / answered / better answer" cases from the production read,
paraphrased so no real user text enters the repo. Each case asserts behaviour, not wording: the
right path, no false "searching", at most one question, no invented numbers, correct audience.
The same set picks the orchestrator model (§1).

---

## 10. Build order

1. Session state + Router + chip actions + the "reply after result" rule.
2. Mantis Scout + `fetch_own_site` (AWS scraper) — onboarding.
3. Planner + Runner + Qualifier, with the todo box and the working-state right panel.
4. Campaign (ends at `fired`).
5. Capability-gap log + eval set — started with step 1, grown every step.

Schema goes to production with `./scripts/deploy/apply-schema-prod.sh` **before** the code that
reads it.

---

## 11. Sources, confidence and the enrich API (2026-10-19)

Every source is a capability adapter whose attempts are recorded (`v2_source_attempts`), whose
measured quality is stored (`v2_benchmarks`), and whose findings are shared by all pipelines
(`v2_facts`, keyed `place:<id>` / `domain:<d>`; paid search answers in `v2_search_cache`). The
confidence module (`lib/v2/confidence.ts`, `GET /api/v2/confidence`) scores each one:
`confidence = precision × Wilson-lower(success)`, `choice = confidence ÷ cost`; pipelines by
delivered/target and contact coverage. Ranking reads these — nothing is ordered by hand.

| Capability | Sources (built) | Measured |
|---|---|---|
| discover local business | Google Places (saved / live) | 95% with phone; strategies ladder primary → wide → adjacent → names → registry |
| discover developers / dev companies | GitHub (`sources/github.ts`) | orgs 24/25 own site, ~54% publish an email there; profile email is reference-only (GitHub AUP) |
| website of a business | Places listing → shared facts → Exa (phone-verified) → Place Details | Exa 89% precision / ~25% recall / ~$0.028 per URL |
| person (founder/owner) + LinkedIn | site text (enricher) → Exa | Exa 17/20 found; precision needs manual review |
| email / phone / socials / signals | Website Enrich API (`enrich-site.ts`, `POST /api/v2/enrich`) | see benchmark `scripts/v2-testsuite/results/enrich-*.md` |
| hard pages (bot walls, JS shells) | Scrapling `services/fetchd` (http → stealth, 1 browser per host) | Cloudflare/Sucuri/LiteSpeed pass; DataDome (e.g. G2) does not |
| person contact (email/phone) | Apollo (`APOLLO_API_KEY`) | **not tested yet — few credits; test last** |

**Website Enrich API** modules: `contacts`, `meta`, `tech`, `pages`, `people`, `profile`
(LLM; every field carries a page quote that is checked against the page text).

### Next scope (not built)

- **Government / open data scrapers** — CBSE/UDISE school registries, MCA company master data,
  state RERA project lists (HRERA Gurugram already exists as a file), GST/udyam where public.
  Scrapling spiders (pagination, retries, pause/resume) are the intended tool.
- **Ad libraries** — Meta Ad Library (who is running ads, since when), Google Ads Transparency
  Center: an "is advertising / just started advertising" signal per business.
- Apollo person contact, after the credit-light test.
