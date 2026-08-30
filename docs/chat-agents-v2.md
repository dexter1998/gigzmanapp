# Chat v2 — named agents with permissioned tools

Status: **agreed design, not built.** Written 2026-08-30 from the session that fixed the v1 chat
loop. Nothing here is speculative about the codebase — every constraint below was measured against
this repo or production data on that date.

---

## Why v1 needed rebuilding

The v1 chat was a single Bedrock call that classified, extracted, replied and suggested, all at
once. A real user session went:

> **user:** merko CA chahiye jinke review 100+ hai Gujarat ke
> **bot:** Gujarat me 100+ reviews wale businesses ke liye, aapko category specify karni hogi.
> **user:** CA chahiye Gujarat ke jinki rating 100+ hai
> **bot:** Gujarat me CA businesses ke liye, aapko rating specify karni hogi.
> **user:** 25
> **bot:** No matching businesses found near Gujarat yet.

Three separate causes, all since fixed in v1:

1. **The category vocabulary was too small.** `planner.ts` validated the model's category against
   the 13 broad `SECTION_NAMES`. "CA" is not one, so it was nulled and the turn became
   `needs_clarification` — forever, however often the user answered. The database holds 78
   `accounting` leads; the model had no way to ask for them.
2. **Thresholds had nowhere to go.** The intent schema had no `minReviews`/`minRating`.
   `missingField` could say `"count"` but no count field existed to receive the answer. That is
   where the bare `25` went: nowhere.
3. **No conversation state.** Every turn re-derived everything from message history through the
   LLM. There was, and still is, no session object.

**The lesson that shapes v2:** none of those were "the LLM is doing too much". Adding agents would
not have fixed any of them. Agents are for genuinely different *work*, not for extraction bugs.

---

## What v2 is

Named specialists, each with a fixed job and a **fixed set of tools it is permitted to call**. The
LLM chooses which tool to use and when; it does not choose *which tools exist for it*.

Start with **one** agent. Five names were only an example.

### The one agent: Rachit (ICP)

| | |
|---|---|
| Job | Work out the user's ideal customer profile |
| Reads | conversation, the user's own website, `chat_sessions` |
| Tools | `fetch_own_site`, `lead_aggregates`, `resolve_category` — all free tier |
| Writes | `chat_sessions.icp` = `{ services[], targetCategories[], targetAreas[], reasoning }` |
| Billed calls | **zero** |

Once Rachit exists, the question v1 could not answer —
*"meri development agency hai, konse client pe focus karun?"* — is answerable from the ICP plus our
own gap aggregates, with no Places spend at all. Gurgaon's 60% website gap and the per-category gap
rates are already in the database.

---

## Prerequisite: `chat_sessions`

Must exist before any agent. It is the thing whose absence lost the `25`.

```
chat_sessions(chat_id, icp jsonb, category_type, area_text,
              min_reviews, min_rating, no_website_only, shortlist jsonb, updated_at)
```

Persisted after every turn; agents read and write it. **No LLM in this layer** — a table and a merge
function. With five agents and no shared state, one amnesia bug becomes five.

Schema goes to production via `./db/apply-schema.sh production` **before** the code that reads it —
see the note at the top of that script.

---

## Tool registry and permissions

This is the load-bearing part of the design.

```ts
type Tool = {
  id: string;
  describe: string;                 // what the model sees
  tier: "free" | "billed" | "scrape";
  argsSchema: JSONSchema;
  run(args): Promise<unknown>;
};

type Agent = {
  id: "rachit";
  displayName: "Rachit";
  label: "Rachit is finding your ICP…";
  tools: string[];                  // allowlist
  budget: { billedCallsPerTurn: number };
};
```

### The three tiers, and why they are not one list

| Tier | Examples | Why it is separate |
|---|---|---|
| `free` | lead aggregates, leads-in-bbox, `resolveCategoryPhrase`, geocode cache | our own data, no cost, no risk |
| `billed` | Places Nearby (`/api/leads/find`), Place Details (`lib/enrichment.ts`) | **real money per call** |
| `scrape` | gosom sweep, third-party site fetch | **Google ToS risk**, slow, and gosom full mode wedges the t3.micro until it is rebooted (measured 2026-08-30) |

### Four enforcement rules

1. **The allowlist is enforced in code, not in the prompt.** Give the model only its own tools in
   `toolConfig`, and re-check the tool id in the dispatcher before executing. Model output is
   untrusted input — the same rule that governs `resolveCategoryPhrase`, the pSEO gate and the OG
   renderer. Writing "do not use X" in a system prompt is not enforcement.
2. **Billed tools carry a per-turn budget.** Rachit's is `0`. An agent that can silently spend money
   in a loop is one bad prompt away from a bill.
3. **`scrape` is never a default tool.** It is slow, it carries ToS risk, and it has a measured
   failure mode that takes the scraper box offline.
4. **Every tool call is logged** — agent, tool, args, cost, outcome — from day one. A multi-agent
   system without this cannot be debugged after the fact.

---

## The shimmer, and why it needs no streaming

"Live" here means a shimmering placeholder that names the working agent, not token streaming. That
is two ordinary JSON calls, no SSE and no queue:

```
POST /route  → cheap router → { agent: "rachit", label: "Rachit is finding your ICP…" }   ~300ms
     ↓ client shows the shimmer with that label
POST /run    → the agent works → returns the message
```

**The label must come from the server.** Guessing it client-side from keywords will eventually show
"Rachit is finding ICP" on a turn where Rachit never ran, which is a small dishonesty that is easy
to avoid now and awkward to remove later.

---

## Build order

1. `chat_sessions` table + merge helper — no LLM. Apply schema to production first.
2. `lib/agents/tools.ts` — registry with the three free tools.
3. `lib/agents/registry.ts` — Rachit only: allowlist, budget, call log.
4. `fetch_own_site` — homepage, `/about`, `/services` of the user's **own** domain. No ToS issue,
   and it carries more signal about what they sell than anything they type.
5. `POST /route` + the shimmer label in `ChatThread`.
6. Rachit's run path.

Steps 1–4 are enough for the focus question to work, shimmer or not.

---

## Open item, unrelated but adjacent

The chat UI shows **"Mantis Lite 1.2"** while the backend runs `amazon.nova-pro-v1:0`
(`lib/bedrock.ts`). If agents are going to run on different tiers — Rachit on a cheap model,
research on an expensive one — that label has to become true before it is ever sold as a tier.
