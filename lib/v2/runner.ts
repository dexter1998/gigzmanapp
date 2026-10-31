/**
 * Runner + Qualifier (docs/v2-agents.md §3–4). Code, not an agent: executes a run's planned steps
 * inside client-driven ticks. Each tick claims the run with a lock ROW, works for at most
 * TICK_BUDGET_MS, and returns the snapshot that is also the progress update.
 *
 * Qualifier is the `qualify`/`contacts` ops: read each business's own site for signals and
 * emails, look the domain up in the AWS enrichment registry (scrape_emails), and queue domains the
 * registry has never crawled into scrape_domains, where the box picks them up (deep lane).
 */

import { createHash } from "node:crypto";
import { decideNext } from "./orchestrator";
import { chargeCredits } from "@/lib/credits/server";
import { CREDIT_COST } from "@/lib/credits/pricing";
import { sql } from "@/lib/db";
import { leadScore } from "./lms";
import { formatCategory } from "@/lib/categories";
import { hasKey } from "./sources/key-chain";
import { apolloMatch } from "./sources/apollo";
import { judgeFit, inBand, type FitJudgement } from "./size-fit";
import { liveDiscover } from "./search";
import { readState } from "./state";
import { domainOf } from "./net";
import { cleanSocials, socialSignals } from "./signals/social";
import { discoverFunded, websiteOf, fundingOf, fundingSignals, type Funding } from "./signals/funding";
import { readFacts, factOr, writeSignals } from "./signals/store";
import { deriveSignals, needsForSeller, NEEDS } from "./signals/rules";
import { needWeights } from "./signals/outcomes";
import type { Hiring } from "./signals/hiring";
import type { SocialStats } from "./signals/social";
import { findDecisionMaker, type DecisionMaker } from "./signals/decision-maker";
import { offerMatch, type SiteExtra } from "./signals/site-extra";
import { metaAdsActive, googleAdsActive, gbpProfile, foodDeliveryListing, otaListings, profileSignals } from "./signals/profiles";
import { readSiteVia } from "./reader/client";
import { bestPhone, tierEmails } from "./contact-quality";
import { cacheSiteText, fillRunExtras, foldFacts, knownFromRow, DEFAULT_COLUMNS } from "./extras";
import { websiteViaExa, rankWebsiteSources, knownWebsite } from "./sources/website";
import { PLAYBOOKS, SIGNALS, NOT_OWN_SITE, NOT_OWN_SITE_SQL, dataSignals, socialLinkFacts, playbookById, consistentSignals, type SignalId } from "./playbooks";
import type { CompiledPlan } from "./planner";
import { googleFetch, hasGoogleKey } from "@/lib/google-key";

const TICK_BUDGET_MS = 15_000;
// Funding discovery reads several news pages in one step (~30 s); the lock must outlive it.
const LOCK_SECONDS = 75;
// Sites read in parallel per qualify tick (the AWS reader runs 64 at once; several runs share it).
const QUALIFY_BATCH = Math.max(4, Math.min(64, Number(process.env.V2_QUALIFY_BATCH) || 32));
/** DB-only candidate pool for site-signal runs. */
const POOL_RADIUS_M = 12000;

export type RunStepView = {
  seq: number; op: string; label: string; status: string; detail: string | null;
  startedAt: string | null; endedAt: string | null;
};
export type RunResultView = {
  id: string; leadId: string | null; name: string; category: string | null; area: string | null;
  website: string | null; rating: number | null; reviewCount: number | null;
  /** Only after unlock — before that the count says contacts exist without giving them away. */
  emails: Array<{ email: string }>; emailCount: number; signals: string[]; deepQueued: boolean;
  /** The named person from the site — name/role/email only after unlock; `hasPerson` before. */
  person: { name: string; role: string | null; email: string | null; linkedin?: string | null } | null; hasPerson: boolean;
  /** Company LinkedIn read off their own site. */
  linkedin: string | null; hasLinkedin: boolean;
  phone: string | null; scorePct: number; signalKeys: string[];
  /** The evidence behind the signals, one line each ("3 open roles: Sales Executive, …", "Seed $2M (2025-01)"). */
  notes: string[];
  /** Site status for the row badge: read, still to read, or nothing to read. */
  siteState: "checked" | "pending" | "none" | "down" | "unread";
  score: number | null; rank: number | null; unlocked: boolean;
};
export type RunSnapshot = {
  id: string; status: string; kind: string; title: string; target: number; delivered: number;
  estCredits: number; startedAt: string | null; finishedAt: string | null;
  steps: RunStepView[]; results: RunResultView[];
  /** For the panel header and the progress ring: rows found, sites to read, sites read. */
  candidates: number; toCheck: number; checked: number;
  /** The signal(s) the run is about, for the title ("No Google Ads tag"). */
  headline: string[];
  /** Sub-tasks of the running step, newest first ("Reading a website — example.com"). */
  activity: Array<{ kind: "read_site" | "found"; label: string; url: string | null; ok: boolean }>;
  area: string; chatId: string | null;
  /** Text for the chat card's first phases (what was understood, which sources were chosen). */
  phaseInfo: { request: string; sources: string };
  summaryMessage?: Record<string, unknown> | null;
};

type RunRow = { id: string; chat_id: string; user_email: string; kind: string; plan: CompiledPlan; status: string; target: number };

export async function startRun(runId: string, userEmail: string): Promise<boolean> {
  const rows = await sql`
    UPDATE v2_runs SET status = 'running', started_at = now()
    WHERE id = ${runId} AND user_email = ${userEmail} AND status = 'planned' RETURNING id
  `;
  return rows.length > 0;
}

export async function tickRun(runId: string, userEmail: string): Promise<RunSnapshot | null> {
  const [claimed] = await sql`
    UPDATE v2_runs SET locked_until = now() + (${LOCK_SECONDS} || ' seconds')::interval
    WHERE id = ${runId} AND user_email = ${userEmail} AND status = 'running' AND locked_until < now()
    RETURNING id, chat_id, user_email, kind, plan, status, target
  `;
  let summaryMessage: Record<string, unknown> | null = null;
  if (claimed) {
    const run = claimed as unknown as RunRow;
    const started = Date.now();
    try {
      while (Date.now() - started < TICK_BUDGET_MS) {
        const [step] = await sql`
          SELECT id, op, input, cursor FROM v2_run_steps
          WHERE run_id = ${run.id} AND status IN ('planned', 'running') ORDER BY seq LIMIT 1
        `;
        if (!step) {
          summaryMessage = await finishRun(run);
          break;
        }
        await sql`UPDATE v2_run_steps SET status = 'running', started_at = coalesce(started_at, now()) WHERE id = ${step.id}`;
        const done = await runStep(run, step as { id: number; op: string; input: Record<string, unknown>; cursor: number });
        if (!done) break; // a multi-tick step yields so the client sees progress
      }
    } catch (err) {
      await sql`UPDATE v2_run_steps SET status = 'failed', error = ${(err as Error).message.slice(0, 300)}, ended_at = now()
                WHERE run_id = ${run.id} AND status = 'running'`;
      await sql`UPDATE v2_runs SET status = 'failed', finished_at = now() WHERE id = ${run.id}`;
    } finally {
      await sql`UPDATE v2_runs SET locked_until = 'epoch' WHERE id = ${run.id}`;
    }
  }
  const snap = await snapshot(runId, userEmail);
  if (snap && summaryMessage) snap.summaryMessage = summaryMessage;
  return snap;
}

/** Returns true when the step finished, false when it wants another tick. */
async function runStep(run: RunRow, step: { id: number; op: string; input: Record<string, unknown>; cursor: number }): Promise<boolean> {
  const plan = run.plan;
  const finish = async (raw: number | null, kept: number | null, detail: string) => {
    // A "more" run continues earlier runs: what they already delivered is not new, so it leaves
    // before the counts are written.
    if (step.op === "collect" && plan.excludeRunIds?.length) {
      const gone = await sql`
        DELETE FROM v2_results r WHERE r.run_id = ${run.id} AND r.rank IS NULL AND EXISTS (
          SELECT 1 FROM v2_results p WHERE p.run_id = ANY(${plan.excludeRunIds}) AND p.rank IS NOT NULL
            AND (p.lead_id = r.lead_id OR p.domain = r.domain OR lower(p.name) = lower(r.name)))
        RETURNING r.id`;
      if (gone.length && kept != null) {
        kept = Math.max(0, kept - gone.length);
        detail = `${detail} (${gone.length} already delivered before, skipped)`;
      }
    }
    await sql`UPDATE v2_run_steps SET status = 'done', raw_count = ${raw}, kept_count = ${kept}, detail = ${detail}, ended_at = now() WHERE id = ${step.id}`;
  };

  if (step.op === "discover") {
    if (SAVED_ONLY || plan.savedOnly) {
      await finish(0, null, "skipped — saved data only (no live search)");
      return true;
    }
    const placeType = String(step.input.placeType);
    const live = await liveDiscover(readState({ center: plan.center, radiusM: plan.radiusM, placeType, categoryText: placeType }));
    const detail =
      live.status === "searched" ? `searched live, ${live.found} found`
      : live.status === "cached" ? "area already searched — saved results (free)"
      : live.status === "throttled" ? "searched moments ago — saved results"
      : live.status === "credits_required" || live.status === "limit" ? "live search limit reached for today — saved results only"
      : "skipped";
    await finish(live.found, null, detail);
    return true;
  }

  if (step.op === "collect") {
    const books = plan.playbookIds.map((id) => playbookById(id)!).filter(Boolean);
    // Contacts are read from websites, but a business without one is still a result (its phone comes
    // with unlock) — only a contacts-only run or website-signal playbooks restrict to websites.
    const websiteOnly = step.input.websiteOnly === true || (books.length > 0 && books.every((b) => b.needsWebsite));
    const noWebsiteOnly = books.length > 0 && books.every((b) => !b.needsWebsite && b.signals.every((s) => s === "no_website" || s === "social_as_website" || s === "site_down"));
    const siteRun = books.some((b) => b.signals.some((x) => SIGNALS[x].source === "site"));
    const strategy = (typeof step.input.strategy === "string" ? step.input.strategy : "primary") as Strategy;
    const kws = (Array.isArray(step.input.keywords) ? (step.input.keywords as string[]) : plan.nameHints ?? []).filter((k) => /^[a-z]{3,20}$/.test(k));
    const keywordRe = kws.length ? `\\m(${kws.join("|")})` : null;
    const cap = siteRun ? Math.min(400, plan.target * 15) : Math.min(200, plan.target * 4);

    if (strategy === "funding_news") {
      const n = await collectFromFunding(run, plan, Math.min(60, plan.target * 2));
      await finish(n, n, `${n} startups that raised funding (from funding news)`);
      return true;
    }
    if (strategy === "web_search") {
      const n = await collectFromWebSearch(run, plan, cap);
      await finish(n, n, `${n} companies from web search`);
      return true;
    }
    if (strategy === "github") {
      const n = await collectFromGithub(run, plan, cap);
      await finish(n, n, `${n} developers / dev companies from developer profiles with their own site`);
      return true;
    }
    if (strategy === "registry") {
      const n = await collectFromRegistry(run, plan, keywordRe, cap);
      await finish(n, n, `${n} companies from the Mantis registry (already crawled; emails on file)`);
      return true;
    }

    // Saved leads are free to read, so every strategy reads a pool wider than the live search.
    const poolR = strategy === "wide" || strategy === "names" ? WIDE_RADIUS_M : Math.max(plan.radiusM, POOL_RADIUS_M);
    const latD = poolR / 111320;
    const lngD = poolR / (111320 * Math.cos((plan.center.lat * Math.PI) / 180));
    const types = strategy === "adjacent" ? (plan.adjacentTypes ?? []) : plan.trades.map((t) => t.placeType);
    const [{ started_at: startedAt }] = await sql`SELECT started_at FROM v2_runs WHERE id = ${run.id}`;
    const match = strategy === "names"
      ? (keywordRe ? sql`business_name ~* ${keywordRe}` : sql`false`)
      : sql`category = ANY(${types})`;
    // "Silver jewellery makers": the place type alone returns every gold showroom in India.
    const must = (plan.nameMustContain ?? []).filter((w) => /^[a-z]{3,20}$/.test(w));
    const nameGate = must.length && strategy !== "names" ? sql`AND business_name ~* ${`\\m(${must.join("|")})`}` : sql``;
    const rows = await sql`
      SELECT id, place_id, business_name, category, area_slug, city_slug, website_url, has_website, phone, rating, review_count,
             (created_at >= ${startedAt}) AS live
      FROM leads
      WHERE ${match} AND is_competitor = false ${nameGate}
        ${plan.scope === "country" ? sql`` : sql`AND lat BETWEEN ${plan.center.lat - latD} AND ${plan.center.lat + latD}
        AND lng BETWEEN ${plan.center.lng - lngD} AND ${plan.center.lng + lngD}`}
        AND id NOT IN (SELECT lead_id FROM v2_results WHERE run_id = ${run.id} AND lead_id IS NOT NULL)
        ${websiteOnly ? sql`AND has_website = true` : sql``}
        ${Array.isArray(step.input.leadIds) ? sql`AND id = ANY(${step.input.leadIds as string[]})` : sql``}
        ${noWebsiteOnly ? sql`AND (has_website = false OR website_url ~* ${NOT_OWN_SITE_SQL})` : sql``}
      ORDER BY ${plan.needContacts ? sql`(website_url IS NOT NULL) DESC,` : sql``} review_count DESC NULLS LAST LIMIT ${cap}
    `;
    // Bulk-loaded leads know a site exists (has_website) but not its URL; site signals need it.
    // Place Details is billed per call, so a run spends at most URL_LOOKUPS_PER_RUN across all its
    // strategies; what was already resolved is counted from the rows' provenance.
    const [{ used }] = await sql`SELECT count(*) FILTER (WHERE provenance->>'url_tried' = 'true')::int AS used FROM v2_results WHERE run_id = ${run.id}`;
    const budget = Math.max(0, URL_LOOKUPS_PER_RUN - used);
    const toResolve = rows.filter((r) => r.has_website && !r.website_url).slice(0, Math.min(budget, plan.target * 3));
    const resolved = websiteOnly || books.some((b) => b.needsWebsite) || plan.needContacts
      ? await resolveWebsites(toResolve, !!plan.savedOnly)
      : { found: 0, tried: 0, refused: false };
    const tried = new Set(toResolve.map((r) => r.id as string));
    // Listings sharing a name in the same city = a business with branches (expanding, buys in multiples).
    const names = [...new Set(rows.map((r) => String(r.business_name).toLowerCase()))];
    const branchRows = names.length ? await sql`
      SELECT lower(business_name) AS n, city_slug AS c, count(*)::int AS k FROM leads
      WHERE lower(business_name) = ANY(${names}) GROUP BY 1, 2` : [];
    const branches = new Map(branchRows.map((b) => [`${b.n}|${b.c}`, b.k as number]));
    for (const r of rows) {
      const viaDetails = !r.website_url && !!resolved.urls?.has(r.id);
      if (viaDetails) r.website_url = resolved.urls!.get(r.id);
      const signals = dataSignals({ website: r.website_url, has_website: r.has_website, rating: r.rating, review_count: r.review_count,
        branches: branches.get(`${String(r.business_name).toLowerCase()}|${r.city_slug}`) ?? null });
      const provenance = {
        strategy,
        discovered_by: strategy === "names" ? "name_match" : r.live ? "places_live" : "places_saved",
        url_by: r.website_url ? (viaDetails ? (resolved.via?.get(r.id) ?? "place_details") : "places_listing") : null,
        phone_by: r.phone ? "places_listing" : null,
        ...(tried.has(r.id) && resolved.tried ? { url_tried: "true" } : {}),
      };
      // A wa.me / Instagram "website" is a contact, not a site: keep its number and handle.
      const social = socialLinkFacts(r.website_url);
      await sql`
        INSERT INTO v2_results (run_id, lead_id, name, category, area, website, domain, phone, rating, review_count, signals, provenance, socials)
        VALUES (${run.id}, ${r.id}, ${r.business_name}, ${r.category}, ${r.area_slug}, ${r.website_url},
                ${r.website_url && !NOT_OWN_SITE.test(r.website_url) ? domainOf(r.website_url) : null}, ${r.phone ?? social.whatsapp}, ${r.rating}, ${r.review_count}, ${sql.json(signals)}, ${sql.json(provenance)},
                ${sql.json(social.socials)})
        ON CONFLICT (run_id, lead_id) DO NOTHING
      `;
    }
    const urlNote = resolved.tried
      ? resolved.refused ? "; website addresses unavailable (the listing lookup was refused)" : `; looked up ${resolved.found}/${resolved.tried} website addresses`
      : "";
    await finish(rows.length, rows.length, `${STRATEGY_LABEL[strategy]}: ${rows.length} candidates${websiteOnly ? " with a website" : ""}${noWebsiteOnly ? " without a real website" : ""}${urlNote}`);
    return true;
  }

  if (step.op === "qualify") {
    const limit = plan.target * 6;
    // Listing-signal leads ("no website") are complete the moment they are collected: rank them now
    // so they show as leads while the sites of the other segments are still being read.
    if (step.cursor === 0 && (plan.mustHave ?? []).some(isListingSignal)) await rankResults(run.id, plan).catch(() => null);
    if (!(await siteReadUseful(run.id, plan))) {
      await finish(0, 0, "No website reads needed — the asked signals come from the business listing");
      return true;
    }
    // Read until enough rows match, not a fixed count: a "no analytics" ask may need 5 sites read
    // per hit.
    const matched = await countMatches(run.id, plan);
    const batch = await sql`
      SELECT id, website, domain, name, category, lead_id FROM v2_results
      WHERE run_id = ${run.id} AND NOT site_checked AND website IS NOT NULL
      ORDER BY review_count DESC NULLS LAST, id
    `.then((rows) => rows.filter((r) => !NOT_OWN_SITE.test(r.website as string))
      // One row per domain per batch: a chain's listings share a site, and reading it six times at
      // once both wastes the reads and races on the same facts rows. The rest read it from the
      // facts store next tick.
      .filter((r, i, all) => !r.domain || all.findIndex((x) => x.domain === r.domain) === i)
      .slice(0, QUALIFY_BATCH));
    const checkedSoFar = step.cursor;
    if (!batch.length || checkedSoFar >= limit || matched >= plan.target) {
      const [c] = await sql`
        SELECT count(*) FILTER (WHERE site_checked)::int AS n,
               count(*) FILTER (WHERE (signals->>'site_down')::boolean)::int AS down,
               count(*) FILTER (WHERE signals->>'site_src' = 'registry')::int AS reg
        FROM v2_results WHERE run_id = ${run.id}`;
      await finish(c.n, c.n - c.down, `${c.n} websites read (${c.reg} already in Mantis registry), ${c.down} did not load`);
      return true;
    }
    const deep = deepFor(plan);
    await Promise.all(batch.map((r) => qualifySafe(r as { id: number; website: string; domain: string | null; name: string; category: string | null; lead_id: string | null }, deep)));
    const n = checkedSoFar + batch.length;
    await sql`UPDATE v2_run_steps SET cursor = ${n}, detail = ${`${n} websites read…`} WHERE id = ${step.id}`;
    return false;
  }

  if (step.op === "contacts") {
    const rows = (await sql`SELECT id, domain, emails, name, category, website FROM v2_results WHERE run_id = ${run.id} AND domain IS NOT NULL`)
      .filter((r) => !NOT_OWN_SITE.test(r.website as string));
    const domains = [...new Set(rows.map((r) => r.domain as string))];
    const reg = domains.length
      ? await sql`SELECT email, domain, tier FROM scrape_emails WHERE domain = ANY(${domains}) AND NOT suppressed AND NOT bounced ORDER BY tier NULLS LAST`
      : [];
    let fromRegistry = 0, queued = 0;
    for (const r of rows) {
      const have = (r.emails as Array<{ email: string; source: string }>) ?? [];
      const extra = reg.filter((e) => e.domain === r.domain && !have.some((h) => h.email === e.email)).slice(0, 3)
        .map((e) => ({ email: e.email as string, source: "registry" }));
      fromRegistry += extra.length;
      const merged = [...have, ...extra];
      let deep = false;
      if (!merged.length) {
        // Deep lane: the AWS box crawls scrape_domains rows it has never enriched, newest first.
        const ins = await sql`
          INSERT INTO scrape_domains (domain, first_source, campaigns, company, category, website, status)
          VALUES (${r.domain}, 'mantis-v2', 'mantis-v2', ${r.name}, ${r.category}, ${r.website}, 'unknown')
          ON CONFLICT (domain) DO NOTHING RETURNING domain
        `;
        deep = true;
        if (ins.length) queued++;
      }
      const prov = extra.length && !have.length ? { email_by: "registry" } : {};
      await sql`UPDATE v2_results SET emails = ${sql.json(merged)}, contacts_checked = true, deep_queued = ${deep},
                provenance = provenance || ${sql.json(prov)} WHERE id = ${r.id}`;
    }
    // The founder / concerned person and their LinkedIn (signals/decision-maker.ts): site first,
    // Exa second; saved as the `person` fact so a company is looked up once. Exa is billed, so only
    // the likely-delivered rows, and never in a saved-data test run.
    let people = 0;
    if (!plan.savedOnly && !SAVED_ONLY) {
      const cand = await sql`
        SELECT id, name, domain, area, category, contact, socials, emails FROM v2_results
        WHERE run_id = ${run.id} AND domain IS NOT NULL AND site_checked AND coalesce((signals->>'site_down')::boolean, false) = false
          AND (contact IS NULL OR contact->>'linkedin' IS NULL)
        ORDER BY (contact IS NOT NULL) DESC, review_count DESC NULLS LAST LIMIT ${Math.ceil(plan.target * 1.5)}`;
      for (let i = 0; i < cand.length; i += 6) {
        await Promise.all(cand.slice(i, i + 6).map(async (r) => {
          const domain = r.domain as string;
          const facts = await readFacts(domain);
          const site = r.contact as { name: string; role: string | null; email: string | null; tier?: string } | null;
          const dm = await factOr<DecisionMaker>(facts, domain, "person", site?.name ? "site+exa" : "exa", () => findDecisionMaker({
            company: String(r.name), domain, city: (r.area as string) ?? null, companyLinkedin: (r.socials as Record<string, string>)?.linkedin ?? null,
            sitePerson: site?.name ? { name: site.name, role: site.role } : null, entityKey: domain, placeType: (r.category as string) ?? null,
          }), (x) => x.linkedin);
          if (!dm) return;
          people++;
          const contact: Record<string, string | number | null> = { name: dm.name, role: dm.role, email: site?.email ?? null, tier: site?.tier ?? dm.via, linkedin: dm.linkedin };
          // Last link of the chain (signal → company → company LinkedIn → founder → contact): the named
          // person's own email via Apollo, only when the site gave no personal address for them. It was
          // built but never called (audit 2026-10-23: 0 Apollo attempts in production, ever).
          const emails = (Array.isArray(r.emails) ? r.emails : []) as Array<{ email: string; source?: string; person?: string }>;
          const hasPersonal = emails.some((e) => e.person) || !!site?.email;
          if (!hasPersonal && hasKey("APOLLO_API_KEY")) {
            const ap = await apolloMatch({ name: dm.name, domain, entityKey: domain, placeType: (r.category as string) ?? null }).catch(() => null);
            if (ap?.email) {
              contact.email = ap.email; contact.emailStatus = ap.emailStatus; contact.tier = "apollo";
              if (ap.phone) contact.phone = ap.phone;
              await sql`UPDATE v2_results SET emails = ${sql.json([{ email: ap.email, source: "apollo", person: dm.name, status: ap.emailStatus }, ...emails.filter((e) => e.email !== ap.email)])} WHERE id = ${r.id}`;
            }
          }
          await sql`UPDATE v2_results SET contact = ${sql.json(contact)}, provenance = provenance || ${sql.json({ person_by: dm.via, ...(contact.tier === "apollo" ? { email_by: "apollo" } : {}) })} WHERE id = ${r.id}`;
        }));
      }
    }
    const [c] = await sql`SELECT count(*) FILTER (WHERE jsonb_array_length(emails) > 0)::int AS n FROM v2_results WHERE run_id = ${run.id}`;
    await finish(rows.length, c.n, `${c.n} with an email (${fromRegistry} from registry); ${queued} queued for deep crawl${people ? `; ${people} decision-makers found` : ""}`);
    return true;
  }

  if (step.op === "rank") {
    // Delivered rows whose website was never read: a later strategy (web search, registry, Place
    // Details) found their URL after the reading step had already stopped at the target, so the run
    // finished with "Checking website…" rows nobody would ever check. Read those before finishing —
    // a few passes at most, each re-ranks, since a read can move a row out of the list.
    if (step.cursor < 3) {
      const read = await readUnreadDelivered(run.id, plan);
      if (read) {
        await sql`UPDATE v2_run_steps SET cursor = ${step.cursor + 1}, detail = ${`read ${read} websites of the final list`} WHERE id = ${step.id}`;
        return false;
      }
    }
    const { kept, total, reachable, segShort } = await rankResults(run.id, plan);
    // Extra columns for the leads that made the list: facts + one cheap read of the text already fetched.
    await fillRunExtras(run.id, plan.extraColumns?.length ? plan.extraColumns : DEFAULT_COLUMNS).catch((e) => console.warn("extras", (e as Error).message));
    // Short of the target: try the next way of finding them instead of stopping. The ladder is the
    // plan's order (learned from past yield in the Planner); each strategy is its own step, so its
    // yield is measured on its own.
    // Short of the target — or, when contacts were asked for, short of leads you can reach (20 Maps
    // listings with no website on file filled the target and web search, where the importers with
    // emails were, never ran).
    const shortOfReach = plan.needContacts && reachable < plan.target;
    // Short: the orchestrator decides — having seen what every source did in this run — whether
    // another source is worth it and which, or whether stopping is the honest call.
    let next: Strategy | null = null, why = "";
    // With segments, one signal's quota still empty is short even when the others filled the list.
    if (kept < plan.target || shortOfReach || segShort) {
      const used = (await sql`SELECT COALESCE(input->>'strategy', 'primary') AS s FROM v2_run_steps WHERE run_id = ${run.id} AND op = 'collect'`).map((r) => r.s as Strategy);
      const d = await decideNext({ runId: run.id, plan, kept, total, reachable, used });
      next = d.action === "continue" ? d.strategy : null;
      why = d.reasoning;
    }
    await finish(total, kept, `${kept} kept of ${total}${plan.needContacts ? ` (${reachable} reachable)` : ""}${next ? ` — short of ${segShort && kept >= plan.target ? "one signal's share" : plan.target}${kept >= plan.target && !segShort ? " reachable" : ""}, next: ${STRATEGY_LABEL[next]}` : ""}${why ? ` · ${why}` : ""}`);
    if (next) await appendStrategy(run.id, plan, next, why);
    return true;
  }

  await finish(null, null, "unknown step skipped");
  return true;
}

/**
 * Ranks, then reads the websites of delivered rows that were never read (up to one batch).
 * Returns how many were read — 0 means the delivered list is fully read. Exported so finished runs
 * from before this pass can be repaired (scripts/v2-repair-unread.ts).
 */
export async function readUnreadDelivered(runId: string, plan: CompiledPlan): Promise<number> {
  await rankResults(runId, plan);
  const unread = (await sql`
    SELECT id, website, domain, name, category, lead_id FROM v2_results
    WHERE run_id = ${runId} AND rank IS NOT NULL AND NOT site_checked AND website IS NOT NULL ORDER BY rank`)
    .filter((r) => !NOT_OWN_SITE.test(r.website as string)).slice(0, QUALIFY_BATCH);
  if (!unread.length) return 0;
  const deep = deepFor(plan);
  await Promise.all(unread.map((r) => qualifySafe(r as { id: number; website: string; domain: string | null; name: string; category: string | null; lead_id: string | null }, deep)));
  await rankResults(runId, plan);
  return unread.length;
}

/** What qualifyOne reads beyond the site for this plan — shared by the qualify step and by rank's
 *  final pass over delivered rows whose site was never read. */
function deepFor(plan: CompiledPlan) {
  const deep = { social: plan.playbookIds.includes("social-weak"), funding: plan.playbookIds.includes("funded-startups"),
    // The needs this seller can sell into ("commercial refrigeration" → new_outlet), for ranking.
    sellerNeeds: needsForSeller([plan.service, plan.buyerTrigger, ...(plan.tradeWords ?? [])].filter(Boolean).join(" ")),
    paid: !plan.savedOnly && !SAVED_ONLY, tradeWords: [...(plan.tradeWords ?? []), ...(plan.nameMustContain ?? [])],
    extraColumns: plan.extraColumns };
  // Public-profile reads (signals/profiles.ts), only where the seller needs them: ad libraries
  // (free) for marketing sellers; Google listing ($0.02) for local-SEO sellers; delivery apps /
  // OTAs (Exa) for food / hotel sellers.
  const svc = `${plan.service ?? ""} ${plan.buyerTrigger ?? ""}`;
  Object.assign(deep, {
    ads: plan.playbookIds.some((b) => ["no-tracking", "social-weak"].includes(b)) || deep.sellerNeeds.some((n) => ["needs_marketing_agency", "needs_social_media"].includes(n)),
    gbp: plan.playbookIds.includes("weak-reviews") || deep.sellerNeeds.includes("needs_local_seo"),
    food: deep.sellerNeeds.includes("new_outlet") || /restaurant|food|kitchen|zomato|swiggy/i.test(svc),
    hotel: /hotel|booking engine|channel manager|revenue management|\bota\b/i.test(svc),
  });
  return deep;
}

export type Strategy = "primary" | "wide" | "adjacent" | "names" | "registry" | "github" | "web_search" | "funding_news";
export const STRATEGY_LABEL: Record<Strategy, string> = {
  primary: "Saved + live businesses of that type nearby",
  wide: "Same type, wider area",
  adjacent: "Related business types",
  names: "Businesses whose name matches",
  registry: "Mantis registry (crawled companies)",
  github: "Developer profiles (developers & dev companies)",
  web_search: "Web search for companies",
  funding_news: "Funding news — startups that raised money",
};
const WIDE_RADIUS_M = 25000;
const URL_LOOKUPS_PER_RUN = 80;
/** V2_SAVED_ONLY=1: no billed Google calls at all (no live search, no Place Details) — test runs
 *  read only what is already saved. Never set in production. */
const SAVED_ONLY = process.env.V2_SAVED_ONLY === "1";

/**
 * Score and rank what the run holds; only rows that meet the ask are kept. Shared by the rank step
 * and by Stop — a stopped run once ranked its top rows regardless, and delivered physiotherapists
 * and opticians for a dentist ask.
 */
async function rankResults(runId: string, plan: CompiledPlan): Promise<{ kept: number; total: number; reachable: number; segShort: boolean }> {
  const segs = segmentsOf(plan);
  const books = plan.playbookIds.map((id) => playbookById(id)!).filter(Boolean);
  const wanted = new Set<SignalId>(books.flatMap((b) => b.signals));
  const rows = await sql`
    SELECT r.id, r.name, r.area, r.signals, r.emails, r.phone, r.review_count, r.site_checked, r.website, r.category, r.domain, r.extras, l.lat, l.lng
    FROM v2_results r LEFT JOIN leads l ON l.id = r.lead_id WHERE r.run_id = ${runId}`;
  const weights = await needWeights().catch(() => new Map<string, number>());
  const siteAsk = [...wanted].some((s) => SIGNALS[s]?.source === "site");
  // Ranking-only playbooks (gate: false) never drop a row for lacking their signals.
  const gated = books.some((b) => b.gate !== false);
  const gatedWanted = new Set<SignalId>(books.filter((b) => b.gate !== false).flatMap((b) => b.signals));
  const scored = rows.map((r) => {
    const sig = r.signals as Record<string, boolean>;
    const matched = [...wanted].filter((s) => sig[s] === true).length;
    const hasEmail = (r.emails as unknown[]).length > 0;
    // A lead you can actually reach (an email, or a website we read) ranks above one that is just a listing.
    // A phone from the listing is a real contact too — for a "no website" ask it is the only one.
    const reachable = hasEmail || (r.site_checked === true && !!r.website) || !!r.phone;
    // Hiring is the default buying signal: whatever the seller sells, a company adding people buys more.
    // A need this seller can sell into, derived from the company's facts, ranks like a signal.
    const fit = (Array.isArray((sig as Record<string, unknown>).derived) ? ((sig as Record<string, unknown>).derived as Array<{ signal: string; confidence: number; mine: boolean }>) : [])
      .filter((d) => d.mine).reduce((a, d) => a + d.confidence * 8 * (weights.get(d.signal) ?? 1), 0);
    // Default fit with no signal asked: the lead's own offerings page names what was asked for.
    // What the company really offers: the model-read services column when the run has one (right on
    // 7 of 8 sampled leads), else the offerings-page/heading guess (wrong on 9 of 15 — audit 2026-10-23).
    const ex = (r.extras ?? {}) as Record<string, string>;
    const aiOffer = Object.entries(ex).filter(([k, v]) => /^(services?|offerings?|products?|what_they_sell|offer)$/.test(k) && typeof v === "string" && v.trim()).map(([, v]) => v);
    const aiMatch = aiOffer.length ? offerMatch(aiOffer.join(",").split(/[,;/]|\band\b/).map((x) => x.trim()).filter(Boolean), [...(plan.tradeWords ?? [])]) : null;
    const offerScore = aiMatch ? aiMatch.score : sig.offer_match === true ? Number((sig as Record<string, unknown>).offer_score ?? 1) : 0;
    const offer = offerScore > 0 ? Math.min(9, 3 * offerScore) : 0;
    const score = matched * 10 + Math.min(16, fit) + offer + (sig.hiring === true ? 4 : 0) + (plan.needContacts && hasEmail ? 8 : 0) + (plan.needContacts && reachable ? 6 : 0) + Math.log10(1 + Number(r.review_count ?? 0));
    const must = meetsMust(plan, sig);
    // A website-signal ask can only be met by a site that was actually read.
    // ...except when the ask itself is "no website": that business has no site to read, and requiring
    // one dropped every candidate (production test I-01: 0 kept of 75, twice).
    // ...and a row that already carries a gated LISTING signal (no website, social page as website,
    // several branches) needs no read either: for a website seller those are the customers, and
    // dropping them for lack of a site to read left 1 of 97 (local run f3737e12, 2026-10-26).
    const listingMatch = [...gatedWanted].some((s) => SIGNALS[s]?.source !== "site" && sig[s] === true);
    // Segments: a site-signal match is only ever set by a read, and a listing one needs none.
    const read = !!segs || !siteAsk || !gated || r.site_checked === true || listingMatch;
    const gateOk = !gated || [...gatedWanted].some((s) => sig[s] === true);
    return { id: r.id as number, sig, score, reachable, cat: String(r.category ?? ""), domain: (r.domain as string | null) ?? null, keep: must && read && gateOk,
      name: String(r.name ?? ""), area: (r.area as string | null) ?? null, reviews: (r.review_count as number | null) ?? null, multi: sig.multi_location === true,
      lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng) };
  }).filter((r) => r.keep).sort((a, b) => b.score - a.score)
    // One lead per company: two Maps listings of one business share a domain (KALT replay).
    .filter((r, i, all) => !r.domain || all.findIndex((x) => x.domain === r.domain) === i);
  // Fit: the leads about to be shown are judged for company size (the ones this seller can
  // realistically win come first; bigger or smaller ones only fill what is left) and for area (one
  // clearly elsewhere is not shown on a local ask — fewer, right leads beat a full list of wrong ones).
  let fitted = scored;
  if (scored.length) {
    const pool = scored.slice(0, Math.min(60, Math.max(plan.target * 4, 20)));
    const local = plan.scope !== "country" ? plan.areaText || null : null;
    const fit = await judgeFit(pool.map((r) => ({ id: r.id, name: r.name, domain: r.domain, category: r.cat ? formatCategory(r.cat) ?? r.cat : null,
      reviews: r.reviews, branches: r.multi ? 2 : 1, area: r.area })), local).catch(() => new Map<number, FitJudgement>());
    const band = plan.buyerSize ?? null;
    for (const [id, f] of fit) {
      await sql`UPDATE v2_results SET signals = signals || ${sql.json({ size_tier: f.tier, size_fit: band ? inBand(f.tier, band) : null, in_area: f.inArea })} WHERE id = ${id}`;
    }
    // A mapped lead is measured, not judged: farther from the asked centre than the search could
    // reasonably mean (a city: 40 km; a neighbourhood: 1.25x the radius, at least 2.5 km — Koramangala is ~5 km from Indiranagar) is elsewhere — the model
    // called Koramangala "in" an Indiranagar ask (re-test). Leads without coordinates are judged.
    const c = plan.center;
    // The plan's radius is the same 3 km for "Jaipur" and "Indiranagar", so the scale comes from the
    // place itself: a city Mantis holds (a city_slug) may span 40 km; anything else is a neighbourhood.
    const head = (plan.areaText ?? "").split(",")[0].trim().toLowerCase().replace(/\s+/g, "-").replace(/^gurugram$/, "gurgaon").replace(/^bengaluru$/, "bangalore");
    const [isCity] = head ? await sql`SELECT 1 FROM leads WHERE city_slug = ${head} LIMIT 1` : [];
    const limitM = isCity ? 40_000 : Math.max(plan.radiusM * 1.25, 2500);
    const far = (r: (typeof scored)[number]) => r.lat != null && r.lng != null && !!c && haversineM(c, { lat: r.lat, lng: r.lng }) > limitM;
    // A neighbourhood is measured only (the judge called Koramangala "in" Indiranagar); a city also
    // takes the judge's "elsewhere" (40 km around Noida holds Ghaziabad and Faridabad — round 4).
    const elsewhere = (r: (typeof scored)[number]) => local !== null && (far(r) || ((isCity || r.lat == null || r.lng == null) && fit.get(r.id)?.inArea === false));
    const fits = (r: (typeof scored)[number]) => !band || inBand(fit.get(r.id)?.tier, band);
    const here = scored.filter((r) => !elsewhere(r));
    fitted = [...here.filter(fits), ...here.filter((r) => !fits(r))];
  }
  // "Different industries": with 3+ trades, take turns across categories so one trade can't fill
  // the list (the KALT replay came back all restaurants).
  const spread = plan.trades.length >= 3 ? roundRobin(fitted, (r) => r.cat) : fitted;
  // Segments: each asked signal gets its quota first, then any segment that ran dry is filled from
  // the others' extras, and the list is shown best-first.
  let top = spread.slice(0, plan.target);
  let segShort = false;
  if (segs) {
    const picked = new Set<number>();
    const take: typeof spread = [];
    for (const g of segs) {
      let n = 0;
      for (const r of spread) {
        if (n >= g.quota) break;
        if (!picked.has(r.id) && r.sig[g.signal] === true) { picked.add(r.id); take.push(r); n++; }
      }
      if (n < g.quota) segShort = true;
    }
    for (const r of spread) { if (take.length >= plan.target) break; if (!picked.has(r.id)) { picked.add(r.id); take.push(r); } }
    top = take.sort((a, b) => b.score - a.score);
  }
  await sql`UPDATE v2_results SET rank = NULL WHERE run_id = ${runId}`;
  for (const [i, r] of top.entries()) await sql`UPDATE v2_results SET score = ${r.score}, rank = ${i + 1} WHERE id = ${r.id}`;
  await sql`UPDATE v2_runs SET delivered = ${top.length} WHERE id = ${runId}`;
  return { kept: top.length, total: rows.length, reachable: top.filter((r) => r.reachable).length, segShort };
}

/** Best-first within each group, groups taking turns (group order = their best item's order). */
function roundRobin<T>(items: T[], key: (x: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const x of items) { const k = key(x); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(x); }
  const out: T[] = [];
  const lists = [...groups.values()];
  for (let i = 0; out.length < items.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

async function appendStrategy(runId: string, plan: CompiledPlan, strategy: Strategy, why = "") {
  const [{ max }] = await sql`SELECT max(seq)::int AS max FROM v2_run_steps WHERE run_id = ${runId}`;
  const ops = new Set(plan.steps.map((s) => s.op));
  const steps: Array<{ op: string; label: string; input: Record<string, unknown> }> = [
    { op: "collect", label: `Not enough yet — ${STRATEGY_LABEL[strategy]}`, input: { strategy, ...(why ? { why } : {}) } },
    ...(ops.has("qualify") ? [{ op: "qualify", label: "Read the new websites", input: {} }] : []),
    ...(ops.has("contacts") ? [{ op: "contacts", label: "Find emails for the new ones", input: {} }] : []),
    { op: "rank", label: `Rank & keep the best ${plan.target}`, input: {} },
  ];
  for (const [i, st] of steps.entries()) {
    await sql`INSERT INTO v2_run_steps (run_id, seq, playbook_id, op, label, input)
              VALUES (${runId}, ${max + 1 + i}, ${plan.playbookIds[0] ?? null}, ${st.op}, ${st.label}, ${sql.json(st.input as Parameters<typeof sql.json>[0])})`;
  }
}

/**
 * Web search (Exa) for companies Maps doesn't hold — SaaS, products, B2B firms. One query per
 * trade, a page of 25 results; directory/listing sites dropped; a LinkedIn company page is kept as
 * that company's LinkedIn, its site left for the Qualifier to find.
 */
const JUNK_HOST = /(^|\/\/)([a-z0-9-]+\.)*(exa\.ai|google\.|bing\.com|wikipedia\.org|youtube\.com|medium\.com|quora\.com|reddit\.com|indiamart\.com|justdial\.com|tradeindia\.com|exportersindia\.com|sulekha\.com|alibaba\.com|amazon\.|flipkart\.com|clutch\.co|glassdoor|naukri\.com|zaubacorp|tofler)/i;
const JUNK_TITLE = /\b(association|federation|council|directory|top\s+\d+|best\s+\d+|\d+\s+best|list of|near me|jobs?\b|careers?\b|news|wikipedia|vs\.?|how to|guide)\b/i;

/**
 * Haiku check over a page of web results: which are ONE business's own site that is the asked-for
 * kind of business. On any failure the regex-filtered list stands (it already dropped the worst).
 */
async function businessesOnly<T extends { url: string; title?: string | null; text?: string | null; highlights?: string[] | null }>(rows: T[], ask: string, place: string): Promise<T[]> {
  if (rows.length < 2) return rows;
  try {
    const { callTool, MODELS } = await import("./claude");
    const list = rows.map((x, i) => `${i}. ${x.title ?? ""} — ${x.url} — ${(x.highlights?.join(" ") ?? x.text ?? "").slice(0, 160)}`).join("\n");
    const out = await callTool({
      agent: "web_lead_filter", model: MODELS.cheap, maxTokens: 300,
      system: "You filter web search results into business leads. Keep a result only if it is the website (or LinkedIn page) of ONE business that is itself the kind asked for AND is located in, or clearly serves, the place given (a foreign company does not count for an Indian place). Drop directories, marketplaces, associations, government bodies, news, blogs, listicles ('Best X in Y 2025'), job pages, and businesses of a different kind.",
      messages: [{ role: "user", content: `Asked for: ${ask} (${place})\n\n${list}` }],
      tool: { name: "keep", description: "Indexes of results to keep.", input_schema: { type: "object", properties: { keep: { type: "array", items: { type: "number" } } }, required: ["keep"] } },
    });
    const idx = new Set((Array.isArray(out.keep) ? out.keep : []).map(Number));
    return rows.filter((_, i) => idx.has(i));
  } catch {
    return rows;
  }
}

/**
 * A page title is often not the business name ("Home", "Best Silver Manufacturer in India",
 * "Wholesale 925 Silver Jewellery Jaipur"). Those fall back to the brand in the domain.
 */
function leadName(title: string, domain: string | null, path: string): string {
  const parts = title.split(/\s[|\-–—:]\s/).map((p) => p.trim()).filter(Boolean);
  // "Family restaurant in Goregaon Mumbai", "Home Page" — descriptions, not names.
  const generic = (t: string) => /^(home|home\s*page|homepage|about( us)?|welcome|index|official (site|website))$/i.test(t) || /\b(in|near|at)\s+[A-Z][a-z]+/.test(t)
    || (/\b(best|top|leading|trusted|award|wholesale|wholesaler|manufacturers?|suppliers?|exporters?|online|india'?s|custom|buy|shop)\b/i.test(t) && t.split(/\s+/).length > 2);
  const fromTitle = parts.find((p) => !generic(p) && p.length <= 60);
  if (fromTitle) return fromTitle.slice(0, 120);
  const label = (domain ?? "").split(".")[0];
  if (label) return label.charAt(0).toUpperCase() + label.slice(1);
  return parts[0]?.slice(0, 120) || path;
}

/** Rough India bounding box — enough to tell an Indian city from New York or London. */
const inIndia = (c: { lat: number; lng: number } | null | undefined) => !c || (c.lat > 6 && c.lat < 37.5 && c.lng > 68 && c.lng < 97.5);

async function collectFromWebSearch(run: RunRow, plan: CompiledPlan, cap: number): Promise<number> {
  const { exaSearch } = await import("./sources/exa");
  const words = plan.tradeWords?.length ? plan.tradeWords : plan.trades.map((t) => t.label);
  const place = plan.areaText.split(",").pop()!.trim();
  let n = 0;
  for (const w of words.slice(0, 3)) {
    if (n >= cap) break;
    // ", India" only for Indian places — "New York, India" found nothing for US asks.
    const q = `${w} company in ${place}${plan.scope === "country" || /india/i.test(place) || !inIndia(plan.center) ? "" : ", India"} homepage`;
    const t0 = Date.now();
    const r = await exaSearch(q, { numResults: 25 }).catch(() => null);
    await sql`INSERT INTO v2_source_attempts (source, capability, city, ok, value, cost_usd, ms)
              VALUES ('exa', 'discover_company', ${place}, ${!!r?.results.length}, ${q}, ${r?.costUsd ?? 0}, ${Date.now() - t0})`;
    // Web results include directories, associations, lists and the search engine's own pages;
    // only a single business's own site (or its LinkedIn page) is a lead.
    const raw = (r?.results ?? []).filter((x) => !JUNK_HOST.test(x.url) && !JUNK_TITLE.test(x.title ?? "") && (x.title ?? "").toLowerCase().trim() !== q.toLowerCase());
    const keep = await businessesOnly(raw, w, place);
    for (const x of keep) {
      const isLinkedin = /linkedin\.com\/company\//i.test(x.url);
      if (!isLinkedin && NOT_OWN_SITE.test(x.url)) continue;
      const u = new URL(x.url);
      const domain = isLinkedin ? null : domainOf(x.url);
      const name = leadName(x.title ?? "", domain, u.pathname);
      if (domain && (await sql`SELECT 1 FROM v2_results WHERE run_id = ${run.id} AND domain = ${domain} LIMIT 1`).length) continue;
      await sql`
        INSERT INTO v2_results (run_id, lead_id, name, category, area, website, domain, signals, provenance, socials)
        VALUES (${run.id}, NULL, ${name}, ${w}, ${place}, ${isLinkedin ? null : `${u.protocol}//${u.host}/`}, ${domain},
                ${sql.json({ no_website: false })}, ${sql.json({ strategy: "web_search", discovered_by: "exa_search", url_by: isLinkedin ? null : "exa_search" })},
                ${sql.json(isLinkedin ? { linkedin: x.url.split("?")[0] } : {})})`;
      n++;
    }
  }
  return n;
}

/**
 * Funding news (Exa) for startups that raised money in the plan's place — the source for anyone
 * selling to startups. Each row carries its round as evidence; the Qualifier then reads its site.
 */
const CITY_ALIAS: Record<string, string[]> = { gurugram: ["gurgaon"], gurgaon: ["gurugram"], bengaluru: ["bangalore"], bangalore: ["bengaluru"],
  delhi: ["new delhi", "delhi ncr"], "new delhi": ["delhi"], mumbai: ["bombay", "navi mumbai"], noida: ["greater noida"] };

/**
 * Funded startups, cheapest source first (2026-10-31):
 *  1. funded_startups — the weekly funding-news store (it existed, only the public pages read it);
 *  2. VC-portfolio + YC companies already in the registry (scrape_domains.first_source vc:* / yc-oss),
 *     which come WITH a domain, so they are reachable;
 *  3. live funding news (Exa) for whatever is still short — and what it finds is saved back to (1),
 *     so the next run, for any signal, starts from it.
 */
async function collectFromFunding(run: RunRow, plan: CompiledPlan, cap: number): Promise<number> {
  const words = (plan.tradeWords ?? []).filter((w) => !/^(startups?|companies|funded startups?)$/i.test(w.trim()));
  const place = plan.scope === "country" ? "India" : plan.areaText.split(",").pop()!.trim();
  const indian = inIndia(plan.center);
  const cities = /^india$/i.test(place) ? null : [place.toLowerCase(), ...(CITY_ALIAS[place.toLowerCase()] ?? [])];
  const prefer = (plan.mustHave ?? []).includes("funded_recent") ? "recent" : plan.playbookIds.includes("funded-startups") && /fundrais|invest|m&a|capital|cfo|pitch/i.test(plan.service ?? "") ? "due" : "recent";
  const seen = new Set<string>((await sql`SELECT coalesce(domain, lower(name)) AS k FROM v2_results WHERE run_id = ${run.id}`).map((r) => String(r.k)));
  let n = 0;
  const add = async (c: { company: string; website: string | null; about: string | null; round?: string | null; amount?: string | null; date?: string | null; investors?: string[]; monthsAgo?: number | null; source?: string | null }, by: string) => {
    const domain = c.website ? domainOf(c.website) : null;
    const key = domain ?? c.company.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const f = fundingSignals({ round: c.round ?? null, amount: c.amount ?? null, date: c.date ?? null, investors: c.investors ?? [], source: c.source ?? null, monthsAgo: c.monthsAgo ?? null } as Parameters<typeof fundingSignals>[0]);
    await sql`
      INSERT INTO v2_results (run_id, lead_id, name, category, area, website, domain, signals, provenance)
      VALUES (${run.id}, NULL, ${c.company}, ${c.about ?? "startup"}, ${place}, ${c.website}, ${domain},
              ${sql.json({ no_website: false, ...f.sig, notes: { funding: f.note, funding_source: c.source ?? by } })},
              ${sql.json({ strategy: "funding_news", discovered_by: by, url_by: c.website ? by : null, funding_by: by })})`;
    n++;
  };
  const monthsAgo = (d: unknown) => (d ? Math.max(0, Math.round((Date.now() - new Date(String(d)).getTime()) / (30.4 * 864e5))) : null);

  // 1. The store. Rounds within 30 months; the newest first unless the seller wants raise-due companies.
  if (indian) {
    const store = await sql`
      SELECT company, website, about, round, amount, announced, investors, source_url, company_key FROM funded_startups
      WHERE announced > now() - interval '30 months'
        ${cities ? sql`AND lower(coalesce(city, '')) = ANY(${cities})` : sql``}
      ORDER BY ${prefer === "due" ? sql`abs(extract(epoch from (now() - announced)) - 47304000)` : sql`announced DESC`} LIMIT ${cap * 2}`;
    for (const r of store) {
      if (n >= cap) break;
      let website = (r.website as string | null) ?? null;
      // Most store rows were saved without a site (2 of 171 on prod): resolve once and keep it.
      if (!website) {
        website = await websiteOf({ company: String(r.company), about: (r.about as string | null) ?? null }).catch(() => null);
        if (website) await sql`UPDATE funded_startups SET website = ${website}, updated_at = now() WHERE company_key = ${r.company_key}`;
      }
      if (!website) continue;
      await add({ company: String(r.company), website, about: (r.about as string | null) ?? null, round: r.round as string | null, amount: r.amount as string | null,
        date: r.announced ? new Date(r.announced as string).toISOString().slice(0, 10) : null, investors: Array.isArray(r.investors) ? (r.investors as string[]) : [],
        monthsAgo: monthsAgo(r.announced), source: r.source_url as string | null }, "funded_store");
    }
    // 2. VC-portfolio / YC companies from the registry: backed, with a domain; no round date.
    if (n < cap) {
      const vc = await sql`
        SELECT domain, company, category, first_source FROM scrape_domains
        WHERE (first_source LIKE 'vc:%' OR first_source LIKE 'yc%') AND domain IS NOT NULL
          ${cities ? sql`AND lower(coalesce(city, '')) = ANY(${cities})` : sql``}
          ${words.length ? sql`AND (coalesce(category, '') || ' ' || coalesce(company, '')) ~* ${words.slice(0, 4).map((w) => w.replace(/[^a-z0-9 ]/gi, "")).filter(Boolean).join("|") || "."}` : sql``}
        ORDER BY random() LIMIT ${(cap - n) * 2}`.catch(() => []);
      for (const r of vc) {
        if (n >= cap) break;
        const firm = String(r.first_source).replace(/^vc:/, "").replace(/^yc.*/, "Y Combinator");
        await add({ company: String(r.company ?? r.domain), website: `https://${r.domain}/`, about: (r.category as string | null) ?? null, investors: [firm], source: `portfolio:${firm}` }, "vc_portfolio");
      }
    }
  }

  // 3. Live funding news for the rest; saved to the store for next time.
  if (n < cap) {
    const t0 = Date.now();
    const list = await discoverFunded(words, place, cap - n, prefer, indian);
    await sql`INSERT INTO v2_source_attempts (source, capability, city, ok, value, cost_usd, ms)
              VALUES ('exa', 'discover_funded', ${place}, ${list.length > 0}, ${words.join(", ") || "startups"}, 0, ${Date.now() - t0})`;
    for (const c of list) {
      await add(c, "funding_news");
      if (indian) {
        const key = c.company.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key) await sql`
          INSERT INTO funded_startups (company_key, company, website, about, city, city_slug, round, amount, announced, investors, source_url)
          VALUES (${key}, ${c.company}, ${c.website}, ${c.about}, ${c.city ?? (cities ? place : null)}, ${(c.city ?? (cities ? place : "")).toLowerCase().replace(/[^a-z0-9]+/g, "-") || null},
                  ${c.round}, ${c.amount}, ${c.date && /^\d{4}-\d{2}/.test(c.date) ? c.date.slice(0, 10).padEnd(10, "-01").slice(0, 10) : null}, ${sql.json(c.investors ?? [])}, ${c.source ?? "news"})
          ON CONFLICT (company_key) DO UPDATE SET website = coalesce(funded_startups.website, EXCLUDED.website), updated_at = now()`.catch(() => {});
      }
    }
  }
  return n;
}

/** GitHub users + orgs in the plan's city, matching its words; only those with their own site. */
async function collectFromGithub(run: RunRow, plan: CompiledPlan, cap: number): Promise<number> {
  const { searchGithub, NOT_A_SITE } = await import("./sources/github");
  const city = plan.areaText.split(",").pop()!.trim();
  const lang = (plan.nameHints ?? []).find((w) => /^(typescript|javascript|python|java|golang|go|rust|php|ruby|kotlin|swift|dart|flutter|react|node)$/i.test(w));
  const runs = [{ type: "org" as const }, { type: "user" as const }];
  let n = 0;
  for (const r of runs) {
    const people = await searchGithub({ location: city, language: lang && lang !== "flutter" ? lang : lang === "flutter" ? "Dart" : undefined, type: r.type, minFollowers: 3, limit: Math.min(cap, 50) }).catch(() => []);
    for (const p of people) {
      if (!p.blog || NOT_A_SITE.test(p.blog)) continue;
      const domain = domainOf(p.blog);
      if (!domain) continue;
      const exists = await sql`SELECT 1 FROM v2_results WHERE run_id = ${run.id} AND domain = ${domain} LIMIT 1`;
      if (exists.length) continue;
      await sql`
        INSERT INTO v2_results (run_id, lead_id, name, category, area, website, domain, signals, provenance, contact)
        VALUES (${run.id}, NULL, ${p.name ?? p.login}, ${p.type === "Organization" ? "dev_company" : "developer"}, ${p.location}, ${p.blog}, ${domain},
                ${sql.json({ no_website: false })}, ${sql.json({ strategy: "github", discovered_by: "github", url_by: "github_blog" })},
                ${p.type === "User" && p.name ? sql.json({ name: p.name, role: p.company ? `at ${p.company}` : "developer", email: null, tier: "github" }) : null})`;
      n++;
    }
  }
  return n;
}

/** Companies the AWS box already crawled, matched by category/name words in the plan's city. */
async function collectFromRegistry(run: RunRow, plan: CompiledPlan, keywordRe: string | null, cap: number): Promise<number> {
  if (!keywordRe) return 0;
  const city = plan.areaText.split(",").pop()!.trim().toLowerCase().replace(/^gurugram$/, "gurgaon");
  const rows = await sql`
    SELECT d.domain, d.website, d.company, d.category, d.city
    FROM scrape_domains d
    WHERE NOT d.do_not_crawl AND d.domain <> ''
      AND (d.category ~* ${keywordRe} OR d.company ~* ${keywordRe})
      ${plan.scope === "country" ? sql`` : sql`AND (d.city IS NULL OR lower(d.city) LIKE ${"%" + city + "%"})`}
      AND NOT EXISTS (SELECT 1 FROM v2_results x WHERE x.run_id = ${run.id} AND x.domain = d.domain)
    ORDER BY d.email_count DESC, d.enriched_at DESC NULLS LAST
    LIMIT ${cap}
  `;
  // The registry also holds whatever earlier web searches wrote back (an association, a "Best
  // plumbers 2025" list) — the same checks as web search apply before anything becomes a lead.
  const clean = rows.filter((d) => !JUNK_HOST.test(`https://${d.domain}`) && !JUNK_TITLE.test(String(d.company ?? "")));
  type Reg = { domain: string; website: string | null; company: string | null; category: string | null; city: string | null; url: string; title: string | null };
  const kept = await businessesOnly<Reg>(clean.map((d) => ({ domain: d.domain as string, website: d.website as string | null, company: d.company as string | null,
    category: d.category as string | null, city: d.city as string | null, url: (d.website as string) ?? `https://${d.domain}`, title: d.company as string | null })),
    (plan.tradeWords ?? []).join(", ") || plan.title, plan.areaText);
  for (const d of kept) {
    await sql`
      INSERT INTO v2_results (run_id, lead_id, name, category, area, website, domain, signals, provenance)
      VALUES (${run.id}, NULL, ${d.company ?? d.domain}, ${d.category}, ${d.city}, ${d.website ?? `https://${d.domain}`}, ${d.domain},
              ${sql.json({ no_website: false })}, ${sql.json({ strategy: "registry", discovered_by: "registry", url_by: "registry" })})
    `;
  }
  return kept.length;
}

/** A business with no website has none of these either — "no website and no Meta ads" (all mode) is
 *  every no-website business. They are only ever set on a site that was read. */
export const NO_SITE_IMPLIES = new Set(["no_analytics", "no_ad_pixel", "no_meta_pixel", "no_google_ads", "no_booking", "no_https", "no_mobile", "no_blog", "seo_basics_missing"]);

/** Known from the listing alone (no website read needed): "no website", "social page as website", branches. */
const isListingSignal = (m: string) => SIGNALS[m as SignalId]?.source !== "site";
const noSite = (sig: Record<string, unknown>) => sig.no_website === true || sig.social_as_website === true;

/**
 * Several asked signals are, by default, separate reasons a business qualifies — "CA with no website
 * and no Meta ads" means some of each (2026-10-26, Tarun). The target is split into one quota per
 * signal (20 → 10 + 10); a segment that runs dry is filled from the others at rank time. "all" mode
 * (every signal on the same business) is only used when the user said so.
 */
export type Segment = { signal: string; quota: number; listing: boolean };
export function segmentsOf(plan: Pick<CompiledPlan, "mustHave" | "signalMode" | "target">): Segment[] | null {
  const must = plan.mustHave ?? [];
  if (must.length < 2 || plan.signalMode !== "segments") return null;
  const base = Math.floor(plan.target / must.length);
  let extra = plan.target - base * must.length;
  // Listing segments first: they are known without reading a single site.
  return must.map((m) => ({ signal: m, quota: base + (extra-- > 0 ? 1 : 0), listing: isListingSignal(m) }))
    .sort((a, b) => Number(b.listing) - Number(a.listing));
}

function meetsMust(plan: CompiledPlan, sig: Record<string, unknown>): boolean {
  const must = plan.mustHave ?? [];
  if (segmentsOf(plan)) return must.some((m) => sig[m] === true);
  return must.every((m) => sig[m] === true || (NO_SITE_IMPLIES.has(m) && noSite(sig)));
}

/** A row only counts once it can be contacted: its site was read (emails), or — for a listing
 *  signal like "no website" — the listing's phone is the contact and there is no site to read. */
function contactReady(plan: CompiledPlan, r: { site_checked: boolean; phone: unknown }, sig: Record<string, unknown>): boolean {
  if (!plan.needContacts || r.site_checked) return true;
  return !!r.phone && (plan.mustHave ?? []).some((m) => isListingSignal(m) && sig[m] === true);
}

/** Per segment: how many contactable rows match it (a row counts for the first segment it fits). */
async function segmentFill(runId: string, plan: CompiledPlan, segs: Segment[]): Promise<Map<string, number>> {
  const rows = await sql`SELECT signals, site_checked, phone FROM v2_results WHERE run_id = ${runId}`;
  const fill = new Map(segs.map((g) => [g.signal, 0]));
  for (const r of rows) {
    const sig = r.signals as Record<string, unknown>;
    if (!contactReady(plan, r as { site_checked: boolean; phone: unknown }, sig)) continue;
    const g = segs.find((x) => sig[x.signal] === true);
    if (g) fill.set(g.signal, fill.get(g.signal)! + 1);
  }
  return fill;
}

/**
 * Whether reading websites can still help this run. Asked signals that all come from the listing
 * ("no website") are never found by reading a site — the CA Gurugram run read 183 sites for 9 minutes
 * and kept 0. With segments, sites are read only while a site-signal segment is short.
 */
async function siteReadUseful(runId: string, plan: CompiledPlan): Promise<boolean> {
  const must = plan.mustHave ?? [];
  if (!must.length) return true; // default pipeline: sites are read for emails and LinkedIn
  const segs = segmentsOf(plan);
  if (segs) {
    const site = segs.filter((g) => !g.listing);
    if (!site.length) return false;
    const fill = await segmentFill(runId, plan, segs);
    return site.some((g) => (fill.get(g.signal) ?? 0) < g.quota);
  }
  // all mode: a site signal a no-website business already implies needs no read either
  const asksNoSite = must.some((m) => m === "no_website" || m === "social_as_website");
  return must.some((m) => !isListingSignal(m) && !(asksNoSite && NO_SITE_IMPLIES.has(m)));
}

/** Rows that already satisfy the plan: all required signals, else any of the playbook's. */
async function countMatches(runId: string, plan: CompiledPlan): Promise<number> {
  const must = plan.mustHave ?? [];
  const segs = segmentsOf(plan);
  if (segs) {
    const fill = await segmentFill(runId, plan, segs);
    return segs.reduce((a, g) => a + Math.min(g.quota, fill.get(g.signal) ?? 0), 0);
  }
  const wanted = [...new Set(plan.playbookIds.flatMap((id) => playbookById(id)?.signals ?? []))];
  // A match only counts once it can be contacted (contactReady): funding-news rows arrive already
  // "matched", and the Qualifier stopped before reading a single site for emails (local run f3737e12).
  const rows = await sql`SELECT signals, site_checked, phone FROM v2_results WHERE run_id = ${runId}`;
  return rows.filter((r) => {
    const sig = r.signals as Record<string, unknown>;
    if (!contactReady(plan, r as { site_checked: boolean; phone: unknown }, sig)) return false;
    return must.length ? meetsMust(plan, sig) : wanted.some((w) => sig[w] === true);
  }).length;
}

const SITE_KEYS = ["site_down", "no_https", "no_mobile", "old_copyright", "no_analytics", "no_ad_pixel", "no_meta_pixel", "no_google_ads", "no_booking", "has_whatsapp",
  "has_booking", "has_menu", "has_admissions", "has_careers", "has_portfolio", "has_locations", "has_online_store", "has_login", "has_contact_form"] as const;
const REGISTRY_FRESH_DAYS = 30;

/**
 * Qualifier for one business: the registry first (the AWS box may have read this site already),
 * else the shared enricher in fast mode. What the app reads is written back to the registry so the
 * next run — anyone's — and the box start from it.
 */
/** qualifyOne, but one lead's failure (a DB conflict, a parser throw) never fails the run: it is
 *  retried once, then marked read-with-error so the batch moves on. */
async function qualifySafe(r: Parameters<typeof qualifyOne>[0], deep: Parameters<typeof qualifyOne>[1]) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await qualifyOne(r, deep); } catch (err) {
      if (attempt === 1) {
        console.warn("qualify failed", r.domain ?? r.website, (err as Error).message);
        await sql`UPDATE v2_results SET site_checked = true, signals = signals || ${sql.json({ read_error: (err as Error).message.slice(0, 120) })} WHERE id = ${r.id}`;
      }
    }
  }
}

async function qualifyOne(r: { id: number; website: string; domain: string | null; name: string; category: string | null; lead_id?: string | null },
  deep: { social: boolean; funding: boolean; sellerNeeds?: string[]; tradeWords?: string[]; paid?: boolean; ads?: boolean; gbp?: boolean; food?: boolean; hotel?: boolean; extraColumns?: CompiledPlan["extraColumns"] } = { social: false, funding: false }) {
  const domain = r.domain ?? domainOf(r.website);
  let site: Record<string, unknown> | null = null;
  let src: "registry" | "live" = "live";
  let emails: Array<{ email: string; source: string; person?: string }> = [];

  if (domain) {
    const [reg] = await sql`
      SELECT site_signals FROM scrape_domains
      WHERE domain = ${domain} AND site_signals IS NOT NULL
        AND (site_signals->>'checked_at')::timestamptz > now() - (${REGISTRY_FRESH_DAYS} || ' days')::interval
    `;
    if (reg) {
      site = reg.site_signals as Record<string, unknown>;
      src = "registry";
      // Addresses an earlier app read found on the site travel with its signals (the box's own
      // graded addresses are in scrape_emails and join in the contacts step).
      emails = (Array.isArray(site.emails) ? (site.emails as Array<{ email: string; person?: string }>) : [])
        .map((x) => ({ email: x.email, source: "registry", ...(x.person ? { person: x.person } : {}) }));
    }
  }
  // Facts store first (lib/v2/signals/store.ts): what any earlier run observed and is still fresh is
  // reused; only missing or expired facts are read now, and what is read is kept for the next run.
  const facts = domain ? await readFacts(domain) : {};
  const isHotel = /hotel|lodging|resort|guest_house|motel/i.test(r.category ?? "");
  const wantsProfiles = !!domain && !!deep.paid && !!(deep.ads || deep.gbp || deep.food || deep.hotel);
  // Every website read in ONE call to the site reader (lib/v2/reader) — the AWS box in production,
  // in-process otherwise. A registry hit that says the site is down needs nothing read.
  const regDown = !!site && (site.site_down === true || site.parked === true);
  const want = domain && !regDown ? {
    enrich: !site,
    hiring: !facts.hiring,
    extra: !facts.site_extra,
    social: deep.social && !facts.social_stats,
    engine: wantsProfiles && isHotel && !facts.profiles,
  } : null;
  const read = want && Object.values(want).some(Boolean)
    ? await readSiteVia({ domain: domain!, website: r.website, want, socials: (site?.socials as Record<string, string> | undefined) ?? undefined }).catch(() => null)
    : null;
  // The pages' text, kept for the extra columns (filled at rank, for delivered rows only).
  if (domain && read?.text) await cacheSiteText(domain, read.text).catch(() => undefined);
  if (!site && domain) {
    const e = read?.enriched ?? null;
    site = e
      ? { ...e.signals, cms: e.cms, phones: e.phones, socials: e.socials, title: e.title, final_url: e.final_url,
          // The named person, only as written on the site (founder / director / partner …).
          person: e.founder_name ? { name: e.founder_name, role: e.founder_role, email: e.best_email, tier: e.tier } : null }
      : { site_down: true };
    // Own-domain and freemail addresses only: an off-domain business address on someone's site is
    // usually their web agency's, not theirs (the enricher's own ranking says the same).
    emails = (e?.emails ?? []).filter((x) => x.same_domain || x.freemail).slice(0, 4)
      .map((x) => ({ email: x.email, source: "site", ...(x.page ? { page: x.page } : {}), ...(x.person ? { person: x.person } : {}) }));
  }
  const s = site ?? { site_down: true };
  const up = s.site_down !== true && s.parked !== true;

  const hi = up && domain ? await factOr<Hiring>(facts, domain, "hiring", "careers_page", async () => read?.hiring ?? null, (h) => h.url) : null;
  const socials = cleanSocials(s.socials && typeof s.socials === "object" ? (s.socials as Record<string, string>) : {});
  // Followers / activity only for social sellers (one more read per profile).
  const stats = up && domain && deep.social ? await factOr<SocialStats>(facts, domain, "social_stats", "public_profiles", async () => read?.socialStats ?? null) : null;

  // Website extras (signals/site-extra.ts) on every lead — free reads: forms and whether they work,
  // booking forms, exposed secrets, SSL/headers/CMS, email DNS, blog, SEO, coming soon, exporter,
  // Shopify apps, and the OFFERINGS page, which is what a lead is matched on when no signal is asked.
  const extra = up && domain ? await factOr<SiteExtra>(facts, domain, "site_extra", "site", async () => read?.extra ?? null,
    (x) => (x.facts.offerings_url as string) ?? null) : null;

  // Public profiles, once per company (the `profiles` fact), only what this seller needs. These are
  // keyed / paid lookups (Exa, Places), so they stay in the app.
  const prof = up && wantsProfiles ? await factOr<ReturnType<typeof profileSignals>>(facts, domain!, "profiles", "public_profiles", async () => {
    const [lead] = r.lead_id ? await sql`SELECT place_id, city_slug FROM leads WHERE id = ${r.lead_id}` : [];
    const city = (lead?.city_slug as string | undefined)?.replace(/-/g, " ") ?? "";
    const isFood = /restaurant|cafe|bakery|food|meal|dhaba|kitchen|caterer|ice_cream/i.test(r.category ?? "");
    const [meta, google, gbp, food, ota] = await Promise.all([
      deep.ads ? metaAdsActive(r.name, socials.facebook).catch(() => undefined) : undefined,
      deep.ads ? googleAdsActive(domain!).catch(() => undefined) : undefined,
      deep.gbp && lead?.place_id ? gbpProfile(String(lead.place_id), { atmosphere: false }).catch(() => undefined) : undefined,
      deep.food && isFood && city ? foodDeliveryListing(r.name, city).catch(() => undefined) : undefined,
      deep.hotel && isHotel && city ? otaListings(r.name, city).catch(() => undefined) : undefined,
    ]);
    return profileSignals({ meta, google, gbp: gbp ?? undefined, food, ota, engine: isHotel ? (read?.engine ?? undefined) : undefined } as Parameters<typeof profileSignals>[0]);
  }) : null;

  if (domain && src === "live") {
    const stamped = { ...s, emails: emails.map(({ email, person }) => ({ email, ...(person ? { person } : {}) })), checked_at: new Date().toISOString(), source: "app" };
    await sql`
      INSERT INTO scrape_domains (domain, website, company, category, first_source, campaigns, status, site_signals)
      VALUES (${domain}, ${r.website}, ${r.name}, ${r.category}, 'mantis-v2', 'mantis-v2', 'unknown', ${sql.json(stamped as Parameters<typeof sql.json>[0])})
      ON CONFLICT (domain) DO UPDATE SET site_signals = EXCLUDED.site_signals
        WHERE scrape_domains.site_signals IS NULL OR scrape_domains.site_signals->>'source' = 'app'
    `;
  }

  const sig: Record<string, unknown> = { site_src: src };
  for (const k of SITE_KEYS) if (typeof s[k] === "boolean") sig[k] = s[k];
  if (s.parked === true) sig.site_down = true; // a parked page is not the business's site
  if (typeof s.cms === "string") sig.cms = s.cms;
  const [{ notes: prevNotes, has_funding }] = await sql`SELECT coalesce(signals->'notes', '{}'::jsonb) AS notes, signals ? 'funded' AS has_funding FROM v2_results WHERE id = ${r.id}`;
  const notes: Record<string, string> = { ...(prevNotes as Record<string, string>) };
  if (hi && typeof hi.hiring === "boolean") {
    sig.hiring = hi.hiring;
    if (hi.hiring) notes.hiring = `${hi.count} open role${hi.count === 1 ? "" : "s"}${hi.roles.length ? `: ${hi.roles.slice(0, 4).join(", ")}` : ""}`;
  }
  if (prof) { Object.assign(sig, prof.sig); if (prof.note) notes.profiles = prof.note; }
  if (extra) {
    Object.assign(sig, extra.signals);
    // A site's own booking or enquiry form is a way to book: never "no online booking" then
    // (Tarun, 2026-10-22). A form with no working backend is its own signal (form_no_backend).
    if (extra.signals.booking_capable === true) { sig.no_booking = false; if (extra.signals.has_booking_form) sig.has_booking = true; }
    if (extra.signals.has_enquiry_form === true) sig.has_contact_form = true;
    const offers = Array.isArray(extra.facts.offerings) ? (extra.facts.offerings as string[]) : [];
    if (offers.length) {
      notes.offerings = `Offers: ${offers.slice(0, 5).join(", ")}`;
      const m = offerMatch(offers, [...(deep.tradeWords ?? [])]);
      if (m.score > 0) { sig.offer_match = true; sig.offer_score = m.score; notes.offer_match = `Sells ${m.matched.slice(0, 3).join(", ")}`; }
    }
    if (extra.signals.exposed_secret) notes.security = "A credential is visible in the site's public code (type only; value never stored)";
    else if (extra.signals.ssl_expired || extra.signals.ssl_expiring) notes.security = extra.signals.ssl_expired ? "SSL certificate expired" : `SSL expires in ${extra.facts.ssl_days_left} days`;
  }
  if (up) {
    const so = socialSignals(socials, stats);
    Object.assign(sig, so.sig);
    if (so.note) notes.social = so.note;
  }
  // Funding per lead (one news search) only for funding plans, and only when collect didn't bring it.
  if (deep.funding && !has_funding) {
    const f = fundingSignals(domain ? await factOr<Funding>(facts, domain, "funding", "news", () => fundingOf(r.name, domain), (x) => x.source) : await fundingOf(r.name, domain).catch(() => null));
    Object.assign(sig, f.sig);
    if (f.note) notes.funding = f.note;
  }
  // Derived needs (lib/v2/signals/rules.ts): what these facts imply beyond themselves, saved per
  // company with the facts they came from. Ones this seller can sell into become the "why now".
  if (domain) {
    const derived = deriveSignals(facts, sig);
    await writeSignals(domain, derived);
    const mine = derived.filter((d) => deep.sellerNeeds?.includes(d.signal)).sort((a, b) => b.confidence - a.confidence);
    sig.derived = derived.map((d) => ({ signal: d.signal, ruleId: d.ruleId, confidence: d.confidence, reason: d.reason, mine: deep.sellerNeeds?.includes(d.signal) ?? false }));
    if (mine.length) notes.why = `${NEEDS[mine[0].signal].label} — ${mine[0].reason}`;
  }
  sig.notes = notes;
  const phones = Array.isArray(s.phones) ? (s.phones as string[]) : [];
  const person = s.person && typeof s.person === "object" ? (s.person as { name: string; role: string | null; email: string | null; tier: string }) : null;
  const prov: Record<string, string> = {};
  if (person) prov.person_by = src === "registry" ? "site_cached" : "site";
  if (emails.length) prov.email_by = src === "registry" ? "site_cached" : "site";
  if (socials.linkedin) prov.linkedin_by = src === "registry" ? "site_cached" : "site";
  // The site's best number for an empty listing phone: a mobile over the landline in the footer.
  const sitePhone = bestPhone(phones);
  if (sitePhone) prov.site_phone = "site";
  if (sig.hiring !== undefined) prov.hiring_by = (hi as { via?: string } | null)?.via ?? "careers_page";
  await sql`
    UPDATE v2_results SET site_checked = true,
      provenance = provenance || ${sql.json(prov)},
      contact = ${person ? sql.json(person) : null},
      socials = ${sql.json(socials)},
      signals = signals || ${sql.json(sig as Parameters<typeof sql.json>[0])},
      emails = ${sql.json(emails)},
      phone = coalesce(phone, ${sitePhone}),
      extras = coalesce(extras, '{}'::jsonb) || ${sql.json(foldFacts(deep.extraColumns ?? DEFAULT_COLUMNS, knownFromRow({ contact: person, socials, signals: sig, name: r.name })))}
    WHERE id = ${r.id}
  `;
}

/**
 * Place Details with ONLY websiteUri in the field mask — the cheapest SKU that carries it. Stored on
 * the lead so the next run (and the jobs discovery that reads website_url) never pays for it again.
 * Stops at the first refusal: a key/IP problem fails every call the same way.
 */
async function resolveWebsites(rows: Array<Record<string, unknown>>, savedOnly = false): Promise<{ found: number; tried: number; refused: boolean; urls?: Map<string, string>; via?: Map<string, string> }> {
  if (!rows.length) return { found: 0, tried: 0, refused: false };
  const urls = new Map<string, string>();
  const via = new Map<string, string>();
  let refused = false;
  const order = SAVED_ONLY || savedOnly ? [] : await rankWebsiteSources((rows[0].category as string) ?? null);
  for (let i = 0; i < rows.length; i += 6) {
    await Promise.all(rows.slice(i, i + 6).map(async (r) => {
      const id = String(r.id);
      const key = `place:${r.place_id}`;
      // 1. Shared facts: any pipeline that met this business before already paid for it.
      const known = await knownWebsite(key);
      if (known) { urls.set(id, known); via.set(id, "facts"); return; }
      // 2. Paid sources in measured order (cost per verified URL).
      for (const src of order) {
        let url: string | null = null;
        if (src === "exa" && hasKey("EXA_API_KEY")) {
          url = (await websiteViaExa({ name: String(r.business_name), category: (r.category as string) ?? null, city: (r.city_slug as string) ?? null,
            entityKey: key, placeType: (r.category as string) ?? null, phone: (r.phone as string) ?? null }).catch(() => null))?.url ?? null;
        } else if (src === "place_details" && !refused) {
          url = await placeDetailsWebsite(r, key).catch((e) => { if (String(e).includes("refused")) refused = true; return null; });
        }
        if (url) {
          urls.set(id, url); via.set(id, src);
          await sql`UPDATE leads SET website_url = ${url} WHERE id = ${id} AND website_url IS NULL`;
          return;
        }
      }
    }));
  }
  return { found: urls.size, tried: rows.length, refused, urls, via };
}

/** Place Details with ONLY websiteUri in the field mask — the cheapest SKU that carries it. */
async function placeDetailsWebsite(r: Record<string, unknown>, key: string): Promise<string | null> {
  if (!hasGoogleKey()) return null;
  const t0 = Date.now();
  const res = await googleFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(String(r.place_id))}`, {
    headers: { "X-Goog-FieldMask": "websiteUri" }, signal: AbortSignal.timeout(6000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("refused");
  const data = res.ok ? ((await res.json().catch(() => ({}))) as { websiteUri?: string }) : {};
  // A social page is not their site; it still cost a call, recorded as a miss.
  const url = data.websiteUri && !NOT_OWN_SITE.test(data.websiteUri) ? data.websiteUri : null;
  await sql`INSERT INTO v2_source_attempts (source, capability, place_type, entity_key, ok, value, cost_usd, ms)
            VALUES ('place_details', 'website', ${(r.category as string) ?? null}, ${key}, ${!!url}, ${data.websiteUri ?? null}, 0.017, ${Date.now() - t0})`;
  if (url) await sql`INSERT INTO v2_facts (entity_key, field, value, source, confidence) VALUES (${key}, 'website', ${url}, 'place_details', 0.9)
                     ON CONFLICT (entity_key, field, source) DO UPDATE SET value = EXCLUDED.value, checked_at = now()`;
  return url;
}

/**
 * Pipelines are stored by shape: the same ops over the same playbooks and place types share one row
 * and accumulate yield, so "which pipeline works" is a read of this table, not a guess.
 */
export function pipelineShape(plan: CompiledPlan) {
  return {
    ops: plan.steps.map((s) => s.op),
    playbookIds: [...plan.playbookIds].sort(),
    mustHave: [...(plan.mustHave ?? [])].sort(),
    placeTypes: plan.trades.map((t) => t.placeType).sort(),
    keywordMode: !!plan.keywords?.length,
  };
}

/**
 * V2 has no unlock — every delivered lead goes to Leads — so delivery is where a lead is paid for:
 * CREDIT_COST.lead_unlock per NEW business (one this user has never been charged for, by Places id
 * or domain). Leads beyond what the balance covers are un-ranked, never given away.
 */
async function chargeDelivered(run: RunRow): Promise<{ charged: number; free: number; dropped: number }> {
  const rows = await sql`SELECT id, lead_id, domain, name FROM v2_results WHERE run_id = ${run.id} AND rank IS NOT NULL ORDER BY rank`;
  let charged = 0, free = 0, dropped = 0;
  for (const r of rows) {
    const ref = r.lead_id ? null : `v2:${run.user_email}:${(r.domain as string) ?? String(r.name).toLowerCase()}`;
    const [had] = r.lead_id
      ? await sql`SELECT 1 FROM credit_ledger WHERE user_email = ${run.user_email} AND lead_id = ${r.lead_id} AND reason = 'lead_unlock' LIMIT 1`
      : await sql`SELECT 1 FROM credit_ledger WHERE reason = 'lead_unlock' AND ref = ${ref} LIMIT 1`;
    if (had) { free++; continue; }
    const c = await chargeCredits(run.user_email, "lead_unlock", { leadId: r.lead_id ?? null, ref: ref ?? `v2run:${run.id}:${r.id}` });
    if (c.ok) { charged++; continue; }
    await sql`UPDATE v2_results SET rank = NULL WHERE id = ${r.id}`;
    dropped++;
  }
  if (dropped) await sql`UPDATE v2_runs SET delivered = delivered - ${dropped} WHERE id = ${run.id}`;
  return { charged, free, dropped };
}

/** One id per use case (same ops, playbooks, signals, trades) — what the learning keys on. */
export function pipelineId(plan: CompiledPlan) {
  return createHash("sha1").update(JSON.stringify(pipelineShape(plan))).digest("hex").slice(0, 16);
}

async function recordPipeline(run: RunRow, plan: CompiledPlan, got: { delivered: number; site: number; email: number; linkedin: number }) {
  const shape = pipelineShape(plan);
  const id = pipelineId(plan);
  const label = `${shape.placeTypes.join("+") || "name-match"} · ${shape.playbookIds.join("+") || "default"}${shape.mustHave.length ? ` · must ${shape.mustHave.join("+")}` : ""}`;
  await sql`
    INSERT INTO v2_pipelines (id, shape, label, runs, target_sum, delivered_sum, site_sum, email_sum, linkedin_sum)
    VALUES (${id}, ${sql.json(shape)}, ${label}, 1, ${plan.target}, ${got.delivered}, ${got.site}, ${got.email}, ${got.linkedin})
    ON CONFLICT (id) DO UPDATE SET runs = v2_pipelines.runs + 1,
      target_sum = v2_pipelines.target_sum + EXCLUDED.target_sum, delivered_sum = v2_pipelines.delivered_sum + EXCLUDED.delivered_sum,
      site_sum = v2_pipelines.site_sum + EXCLUDED.site_sum, email_sum = v2_pipelines.email_sum + EXCLUDED.email_sum,
      linkedin_sum = v2_pipelines.linkedin_sum + EXCLUDED.linkedin_sum, last_run_at = now()
  `;
  // Confidence = the delivered leads' scores (sum on the pipeline, mean on the run), plus who the run
  // was for and where — the keys outcome learning needs (audit 2026-10-23: none were stored).
  const [sc] = await sql`SELECT COALESCE(sum(score), 0)::float AS total, avg(score)::float AS mean FROM v2_results WHERE run_id = ${run.id} AND rank IS NOT NULL`;
  const [cs] = await sql`SELECT state->>'businessProfileId' AS bp FROM v2_chat_state WHERE chat_id = ${run.chat_id}`;
  const bp = typeof cs?.bp === "string" && /^[0-9a-f-]{36}$/i.test(cs.bp) ? cs.bp : null;
  await sql`UPDATE v2_pipelines SET score_sum = score_sum + ${Number(sc?.total ?? 0)} WHERE id = ${id}`;
  await sql`UPDATE v2_runs SET pipeline_id = ${id}, confidence = ${sc?.mean ?? null}, seller_service = ${plan.service ?? null},
            area_text = ${plan.areaText ?? null}, business_profile_id = ${bp} WHERE id = ${run.id}`;
}

/** The chat message written from the results — the reply-after-result rule, for runs. */
async function finishRun(run: RunRow, end: "done" | "stopped" = "done"): Promise<Record<string, unknown> | null> {
  const flipped = await sql`UPDATE v2_runs SET status = ${end}, finished_at = now() WHERE id = ${run.id} AND status = 'running' RETURNING id`;
  if (!flipped.length) return null;
  const plan = run.plan;
  const billing = await chargeDelivered(run);
  const rows = await sql`SELECT signals, emails, deep_queued, website, socials, site_checked FROM v2_results WHERE run_id = ${run.id} AND rank IS NOT NULL`;
  const withLinkedin = rows.filter((r) => (r.socials as Record<string, string>)?.linkedin).length;
  // Name what was delivered by where it came from: a GitHub run found developers, not "consultants".
  const [{ gh }] = await sql`SELECT count(*) FILTER (WHERE provenance->>'discovered_by' = 'github')::int AS gh FROM v2_results WHERE run_id = ${run.id} AND rank IS NOT NULL`;
  const whatLabel = rows.length && gh >= rows.length / 2
    ? "developers / dev companies (from developer profiles)"
    : plan.trades.map((t) => (formatCategory(t.placeType) ?? t.label).toLowerCase()).join(" / ");
  const withSite = rows.filter((r) => r.site_checked && (r.signals as Record<string, unknown>).site_down !== true).length;
  const noAddress = rows.filter((r) => !r.website).length;
  // Signals worth reporting: the ones the user required, else the playbook's (minus the generic
  // "what the site offers" list, which is only meaningful when asked for).
  const wanted = (plan.mustHave?.length ? plan.mustHave : [...new Set(plan.playbookIds.filter((id) => id !== "site-features").flatMap((id) => playbookById(id)?.signals ?? []))]) as SignalId[];
  const counts = wanted.map((s) => ({ s, n: rows.filter((r) => (r.signals as Record<string, boolean>)[s] === true).length })).filter((x) => x.n > 0);
  const withEmail = rows.filter((r) => (r.emails as unknown[]).length > 0).length;
  const queued = rows.filter((r) => r.deep_queued).length;

  const parts = [
    end === "stopped" ? `Stopped before the run finished — ${rows.length ? `${rows.length} matched so far and were added to Leads` : "nothing matched the ask yet, so nothing was added to Leads"}.` : null,
    end === "stopped" ? null : rows.length
      ? `Found ${rows.length} of ${plan.target} ${whatLabel} in ${plan.areaText}.`
      : `No ${plan.trades.map((t) => t.label.toLowerCase()).join(" / ") || plan.title} found in ${plan.areaText}${wanted.length ? " with those signals" : ""}.`,
    counts.length ? `Signals: ${counts.map((c) => `${c.n} ${SIGNALS[c.s].label.toLowerCase()}`).join(", ")}.` : null,
    plan.needContacts ? `${withEmail} have an email${withLinkedin ? `, ${withLinkedin} a company LinkedIn` : ""}.${queued ? ` ${queued} more are queued for a deeper crawl.` : ""}` : null,
    plan.needContacts && noAddress ? `${noAddress} have a website but no address on file, so their sites couldn't be read.` : null,
    billing.charged ? `${billing.charged * CREDIT_COST.lead_unlock} credits used for ${billing.charged} new lead${billing.charged === 1 ? "" : "s"}${billing.free ? ` (${billing.free} you already had were free)` : ""}.` : null,
    billing.dropped ? `Your credits ran out — ${billing.dropped} more matched but weren't added. Top up and tap Find more to get them.` : null,
  ].filter(Boolean);
  // Short of the target: say why, from the counts, so "1 of 20" is never a mystery.
  if (end === "done" && rows.length < plan.target) {
    const [w] = await sql`
      SELECT count(*) FILTER (WHERE site_checked)::int AS read,
             count(*) FILTER (WHERE website IS NULL AND (signals->>'no_website') = 'false')::int AS no_addr
      FROM v2_results WHERE run_id = ${run.id}`;
    const why = [
      w.read ? `read ${w.read} websites` : null,
      w.no_addr ? `${w.no_addr} more have a website we have no address for yet` : null,
    ].filter(Boolean).join("; ");
    // Widening only helps when we ran out of sites to read, not when addresses were missing.
    if (why) parts.push(`Only ${rows.length} matched — ${why}.${w.no_addr ? "" : " Widen the area or add a trade for more."}`);
  }
  // Only a run that finished teaches the pipeline stats; a stopped one says nothing about yield.
  if (end === "done") await recordPipeline(run, plan, { delivered: rows.length, site: withSite, email: withEmail, linkedin: withLinkedin });

  // A run that fell short is the clearest record of "we couldn't serve this user" — logged with the
  // chat turns so the gap read sees it.
  if (end === "done" && rows.length < plan.target) {
    sql`
      INSERT INTO v2_turn_log (chat_id, user_email, turn_type, gap, gap_note, steps)
      VALUES (${run.chat_id}, ${run.user_email}, 'run', true,
              ${`run short: ${rows.length}/${plan.target} for ${plan.title}${plan.keywords?.length ? " (name match)" : ""}${plan.mustHave?.length ? `; must have ${plan.mustHave.join(",")}` : ""}`}, '[]'::jsonb)
    `.catch(() => {});
  }
  const reply = parts.join(" ");
  const chips = [] as Array<{ label: string; action: Record<string, unknown> }>;
  const needEmails = rows.filter((r) => r.website && !(r.emails as unknown[]).length).length;
  if (!plan.needContacts && needEmails) chips.push({ label: `Find emails for ${needEmails} without one`, action: { type: "plan", brief: `emails:${run.id}` } });

  if (end === "stopped") chips.push({ label: "Continue this run", action: { type: "more_run", runId: run.id, count: plan.target - rows.length > 0 ? plan.target - rows.length : plan.target } });
  const intent = { v2: true, action: "search_leads", reply, chips, question: "What next?", runId: run.id, turnType: "run", steps: [], tookMs: 0 };
  const [msg] = await sql`
    INSERT INTO chat_messages (chat_id, role, content, intent)
    VALUES (${run.chat_id}, 'assistant', ${reply}, ${sql.json(intent as unknown as Parameters<typeof sql.json>[0])})
    RETURNING id, role, content, intent, created_at
  `;
  await sql`UPDATE v2_runs SET summary_msg = ${msg.id} WHERE id = ${run.id}`;
  await sql`UPDATE chats SET updated_at = now() WHERE id = ${run.chat_id}`;
  return { ...msg, created_at: (msg.created_at as Date).toISOString() };
}

export async function snapshot(runId: string, userEmail: string): Promise<RunSnapshot | null> {
  const [run] = await sql`SELECT * FROM v2_runs WHERE id = ${runId} AND user_email = ${userEmail}`;
  if (!run) return null;
  const steps = await sql`SELECT seq, op, label, status, detail, started_at, ended_at FROM v2_run_steps WHERE run_id = ${runId} ORDER BY seq`;
  const done = run.status === "done" || run.status === "stopped";
  const results = await sql`
    SELECT r.* FROM v2_results r
    WHERE r.run_id = ${runId} ${done ? sql`AND r.rank IS NOT NULL` : sql``}
    ORDER BY r.rank NULLS LAST, r.score DESC NULLS LAST, r.review_count DESC NULLS LAST LIMIT 100
  `;
  const [c] = await sql`
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE website IS NOT NULL)::int AS with_site,
           count(*) FILTER (WHERE site_checked)::int AS checked,
           max(score) AS max_score
    FROM v2_results WHERE run_id = ${runId}`;
  const recent = await sql`
    SELECT name, website, domain, (signals->>'site_down')::boolean AS down FROM v2_results
    WHERE run_id = ${runId} AND site_checked ORDER BY id DESC LIMIT 6`;
  const plan = run.plan as CompiledPlan;
  const wanted = new Set<string>(plan.playbookIds.flatMap((id) => playbookById(id)?.signals ?? []));
  const maxScore = Number(c.max_score ?? 0);
  return {
    id: run.id, status: run.status, kind: run.kind, title: plan.title, target: run.target, delivered: run.delivered,
    estCredits: run.est_credits, startedAt: run.started_at?.toISOString() ?? null, finishedAt: run.finished_at?.toISOString() ?? null,
    candidates: c.n, toCheck: c.with_site, checked: c.checked,
    headline: (plan.mustHave ?? []).map((m) => SIGNALS[m as SignalId]?.label).filter(Boolean),
    phaseInfo: {
      request: [plan.trades.map((t) => t.label).join(", "), ...(plan.mustHave ?? []).map((m) => SIGNALS[m as SignalId]?.label), plan.areaText].filter(Boolean).join(" · "),
      sources: (plan.strategies ?? ["primary"]).map((s) => STRATEGY_LABEL[s as Strategy] ?? s).join(", "),
    },
    area: plan.areaText, chatId: run.chat_id,
    activity: recent.map((r) => ({ kind: "read_site" as const, label: r.domain ?? r.name, url: r.website, ok: r.down !== true })),
    steps: steps.map((st) => ({
      seq: st.seq, op: st.op, label: st.label, status: st.status, detail: st.detail,
      startedAt: st.started_at?.toISOString() ?? null, endedAt: st.ended_at?.toISOString() ?? null,
    })),
    results: results.map((r) => {
      const sig = r.signals as Record<string, boolean>;
      // V2: every ranked result is added to the user's Leads automatically — nothing is masked.
      const keys = consistentSignals(Object.keys(sig).filter((k) => sig[k] === true && (wanted.size === 0 || wanted.has(k) || k === "no_website" || k === "hiring") && k in SIGNALS));
      const noteMap = ((r.signals as Record<string, unknown>)?.notes ?? {}) as Record<string, string>;
      const notes = ["why", "offer_match", "hiring", "funding", "security", "social", "profiles", "offerings"].map((k) => noteMap[k]).filter((x): x is string => typeof x === "string" && !!x);
      return {
        id: String(r.id), leadId: r.lead_id, name: r.name,
        category: r.category ? (formatCategory(r.category) ?? r.category) : null,
        area: r.area ? String(r.area).replace(/-/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase()) : null,
        website: r.website, rating: r.rating, reviewCount: r.review_count,
        // Address only: an email's `source` is an internal code (lib/v2/public.ts).
        // Tier order (lib/v2/contact-quality.ts): a named person first, support@ / careers@ last.
        emails: tierEmails((r.emails as Array<{ email: string }>).map((e) => e.email), { businessName: r.name, domain: r.domain, personName: r.contact?.name ?? null })
          .map((e) => ({ email: e.email, tier: e.tier })), emailCount: (r.emails as unknown[]).length,
        linkedin: (r.socials as Record<string, string>)?.linkedin ?? null,
        hasLinkedin: !!(r.socials as Record<string, string>)?.linkedin,
        person: r.contact ? { name: r.contact.name, role: r.contact.role ?? null, email: r.contact.email ?? null, linkedin: r.contact.linkedin ?? null } : null,
        hasPerson: !!r.contact?.name,
        // A finished run never shows "Checking website…": nothing will check it any more.
        siteState: !r.website ? "none" : !r.site_checked ? (done || run.status === "failed" ? "unread" : "pending") : sig.site_down ? "down" : "checked",
        phone: r.phone ?? null,
        // Before ranking there's no score yet; show a provisional one from what is already known.
        scorePct: r.score != null ? leadScore(r.score, maxScore || 1)
          : Math.min(95, 35 + 20 * keys.filter((k) => wanted.has(k)).length + ((r.emails as unknown[]).length ? 15 : 0) + (Number(r.rating ?? 0) >= 4.5 ? 10 : 0) + (r.phone ? 5 : 0)),
        signalKeys: keys, notes,
        deepQueued: r.deep_queued, score: r.score, rank: r.rank, unlocked: true,
        signals: keys.map((k) => SIGNALS[k as SignalId].label),
      };
    }),
  };
}

/** Pause / resume / stop. Stop skips what's left and writes the summary from what was found. */
export async function controlRun(runId: string, userEmail: string, action: "pause" | "resume" | "stop"): Promise<RunSnapshot | null> {
  if (action === "pause") await sql`UPDATE v2_runs SET status = 'paused' WHERE id = ${runId} AND user_email = ${userEmail} AND status = 'running'`;
  if (action === "resume") await sql`UPDATE v2_runs SET status = 'running' WHERE id = ${runId} AND user_email = ${userEmail} AND status = 'paused'`;
  let summaryMessage: Record<string, unknown> | null = null;
  if (action === "stop") {
    const [run] = await sql`
      UPDATE v2_runs SET status = 'running' WHERE id = ${runId} AND user_email = ${userEmail} AND status IN ('running', 'paused')
      RETURNING id, chat_id, user_email, kind, plan, status, target`;
    if (run) {
      await sql`UPDATE v2_run_steps SET status = 'skipped', detail = coalesce(detail, 'stopped by you'), ended_at = now()
                WHERE run_id = ${runId} AND status IN ('planned', 'running')`;
      // Rank with the same rule as a finished run: only what already meets the ask is delivered.
      await rankResults(runId, (run as unknown as RunRow).plan);
      summaryMessage = await finishRun(run as unknown as RunRow, "stopped");
    }
  }
  const snap = await snapshot(runId, userEmail);
  if (snap && summaryMessage) snap.summaryMessage = summaryMessage;
  return snap;
}

export { PLAYBOOKS };

/** Great-circle distance in metres. */
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
