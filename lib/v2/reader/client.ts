/**
 * The app's door onto the site reader — one place for all of Mantis's self-hosted scraping. With
 * V2_READER_URL set (production: the AWS enrichment box, private VPC address) the fetching happens
 * there; otherwise — or if the box doesn't answer — it runs in-process, so a box outage slows things
 * down instead of failing them.
 *
 *   /read    the Qualifier's per-lead reads (crawl, careers, site extras, social counts, engines)
 *   /enrich  the Website Enrich API's crawl (lib/v2/enrich-crawl.ts)
 *   /fetch   one page (Scout reading a user's site, the website source checking a candidate)
 */
import { readSite, type ReadRequest, type ReadResult } from "./read";
import { crawlSite } from "../enrich-crawl";
import type { Module, SiteEnrichment } from "../enrich-crawl";
import { fetchPage, type Page } from "../net";

const URL_ = process.env.V2_READER_URL?.replace(/\/$/, "") ?? "";
const KEY = process.env.V2_READER_KEY ?? "";

export const readerMode = (): "remote" | "local" => (URL_ && KEY ? "remote" : "local");

async function remote<T>(path: string, body: unknown, timeoutMs: number): Promise<T | undefined> {
  if (!URL_ || !KEY) return undefined;
  // A busy box (503: its queue is full) is waited on, not bypassed — falling back to an in-process
  // read under load would move the whole crawl onto the app server exactly when it is busiest.
  for (const wait of [0, 1500, 4000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const res = await fetch(`${URL_}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-reader-key": KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return (await res.json()) as T;
      console.warn("site reader", path, res.status);
      if (res.status !== 503) return undefined;
    } catch (err) {
      console.warn("site reader unreachable", path, (err as Error).message);
      return undefined;
    }
  }
  return undefined;
}

/** In-process reads are the fallback, so they are capped: at most 4 at once per app instance. */
let localActive = 0;
const localWaiters: Array<() => void> = [];
async function local<T>(fn: () => Promise<T>): Promise<T> {
  if (localActive >= 4) await new Promise<void>((r) => localWaiters.push(r));
  localActive++;
  try { return await fn(); } finally { localActive--; localWaiters.shift()?.(); }
}

export async function readSiteVia(req: ReadRequest): Promise<ReadResult & { via: "remote" | "local" }> {
  // 30 s: one slow site must not hold a whole qualify batch past its tick.
  const r = await remote<ReadResult>("/read", req, 30_000);
  return r ? { ...r, via: "remote" } : { ...(await local(() => readSite(req))), via: "local" };
}

export async function crawlVia(url: string, modules: Module[]): Promise<SiteEnrichment & { profileText?: string }> {
  return (await remote<SiteEnrichment & { profileText?: string }>("/enrich", { url, modules }, 60_000)) ?? local(() => crawlSite(url, modules));
}

/** fetchPage through the box. A null page from the box is a real answer (the page didn't load). */
export async function fetchPageVia(url: string, timeoutMs = 7000): Promise<Page | null> {
  const r = await remote<{ page: Page | null }>("/fetch", { url, timeoutMs }, timeoutMs + 5000);
  return r ? r.page : fetchPage(url, timeoutMs);
}
