/**
 * Google Maps Platform keys, primary first.
 *
 * MANTIS_GOOGLE_PLACES_API_KEY belongs to Mantis's own GCP project (glowing-jetty-512416-k4,
 * tarun@mantisai.in). GOOGLE_PLACES_API_KEY is the older Dhando project key (dhando-506016), kept as
 * a fallback: on 2026-10-22 that project's billing lapsed and every geocode and Places call came back
 * REQUEST_DENIED, which silently stopped area lookups and lead discovery.
 *
 * A key is skipped for the next one only when Google refuses the KEY (401/403/429, a JSON status of
 * REQUEST_DENIED / OVER_QUERY_LIMIT, an invalid key or disabled billing) — never on a real "no results" answer.
 */

export function googleKeys(): string[] {
  return [...new Set([process.env.MANTIS_GOOGLE_PLACES_API_KEY, process.env.GOOGLE_PLACES_API_KEY].map((k) => k?.trim()).filter((k): k is string => !!k))];
}

export const hasGoogleKey = () => googleKeys().length > 0;

const KEY_REFUSED_HTTP = new Set([401, 403, 429]);
// Classic web services answer 200 + a JSON status; Places v1 answers 400 "API key not valid" for a bad key.
const KEY_REFUSED_JSON = /"status"\s*:\s*"(REQUEST_DENIED|OVER_QUERY_LIMIT|OVER_DAILY_LIMIT)"|API key not valid|API_KEY_INVALID|enable Billing|BILLING_DISABLED/;

/**
 * `fetch` against a Google API with the key in the `X-Goog-Api-Key` header (Places v1) or the `key`
 * query parameter (classic Maps web services). Returns the first answer that wasn't a key refusal,
 * or the last refusal if every key was refused.
 */
export async function googleFetch(url: string, init: RequestInit = {}, keyIn: "header" | "query" = "header"): Promise<Response> {
  const keys = googleKeys();
  if (!keys.length) throw new Error("No Google API key configured (MANTIS_GOOGLE_PLACES_API_KEY / GOOGLE_PLACES_API_KEY)");
  let last: Response | null = null;
  for (const [i, key] of keys.entries()) {
    const target = keyIn === "query" ? `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}` : url;
    const headers = new Headers(init.headers);
    if (keyIn === "header") headers.set("X-Goog-Api-Key", key);
    const res = await fetch(target, { ...init, headers });
    const text = await res.text();
    const copy = new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers });
    const refused = KEY_REFUSED_HTTP.has(res.status) || KEY_REFUSED_JSON.test(text.slice(0, 2000));
    if (!refused) return copy;
    if (i < keys.length - 1) console.warn(`[google] key #${i + 1} refused (HTTP ${res.status}) — trying the fallback key`);
    last = copy;
  }
  return last!;
}
