/**
 * The crawl half of the Website Enrich API (lib/v2/enrich-site.ts): every page read and every
 * static-HTML module — contacts, meta, tech, pages, people. No database, no LLM, no keys, so it runs
 * on the AWS enrichment box behind services/site-reader (POST /enrich) as well as in-process.
 * For `profile` it returns the page text; the app does the evidence-checked LLM read.
 */

import { enrichFast, type EnrichedDomain } from "./enricher";
import { domainOf, fetchPage, htmlToText, fetchLog } from "./net";

export const MODULES = ["contacts", "meta", "tech", "pages", "people", "profile"] as const;
export type Module = (typeof MODULES)[number];

export type SiteEnrichment = {
  url: string; domain: string | null; finalUrl: string | null; ok: boolean; error?: string;
  fetchedVia: string[]; pagesRead: number; ms: number;
  contacts?: {
    emails: string[]; bestEmail: string | null; phones: string[]; socials: Record<string, string>;
    /** Where each address was found (the page URL or surface) and whose it is, as the site says. */
    emailSources?: Array<{ email: string; page: string | null; person: string | null; personRole: string | null }>;
  };
  meta?: { title: string | null; description: string | null; ogTitle: string | null; ogImage: string | null; canonical: string | null;
           lang: string | null; schemaTypes: string[]; noindex: boolean };
  tech?: Record<string, string[]>;
  pages?: Record<string, string>;
  people?: Array<{ name: string; role: string | null; page: string | null }>;
  profile?: SiteProfile | null;
};

export type SiteProfile = {
  company: string | null; whatTheySell: string | null; services: string[]; offer: string | null; pricing: string | null;
  icp: string | null; industriesServed: string[]; locations: string[]; businessModel: string | null; sellsTo?: "businesses" | "consumers" | "both" | null;
  evidence: Record<string, string>; evidenceVerified: number; evidenceSupported: number; evidenceTotal: number;
};

// ---------------------------------------------------------------- tech fingerprints (static HTML only)
const TECH: Record<string, Array<[string, RegExp]>> = {
  cms: [["wordpress", /wp-content\/|wp-includes\//i], ["shopify", /cdn\.shopify\.com/i], ["wix", /static\.wixstatic\.com/i],
        ["squarespace", /squarespace-cdn|static1\.squarespace/i], ["webflow", /data-wf-site|webflow\.(com|io)/i], ["framer", /framerusercontent\.com|framer\.website/i],
        ["nextjs", /\/_next\/static\/|__NEXT_DATA__/i], ["gatsby", /___gatsby/i], ["hubspot_cms", /hs-sites\.com|hubspotusercontent/i], ["godaddy", /img1\.wsimg\.com/i],
        ["joomla", /generator[^>]+joomla/i], ["drupal", /generator[^>]+drupal/i], ["ghost", /generator[^>]+ghost/i]],
  analytics: [["google_analytics", /google-analytics\.com|gtag\(|googletagmanager\.com\/gtag/i], ["gtm", /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/i],
              ["hotjar", /static\.hotjar\.com/i], ["clarity", /clarity\.ms/i], ["mixpanel", /cdn\.mxpnl\.com|mixpanel/i], ["segment", /cdn\.segment\.com/i],
              ["posthog", /posthog/i], ["plausible", /plausible\.io/i]],
  ads: [["meta_pixel", /connect\.facebook\.net|fbq\(/i], ["google_ads", /googleadservices\.com|['"]AW-\d{6,}/i], ["linkedin_insight", /snap\.licdn\.com/i],
        ["tiktok_pixel", /analytics\.tiktok\.com/i]],
  chat: [["intercom", /widget\.intercom\.io|intercomcdn/i], ["crisp", /client\.crisp\.chat/i], ["tawk", /embed\.tawk\.to/i], ["drift", /js\.driftt\.com/i],
         ["zendesk", /static\.zdassets\.com/i], ["freshchat", /wchat\.freshchat\.com/i], ["hubspot_chat", /js\.hs-scripts\.com|js\.usemessages\.com/i], ["whatsapp", /wa\.me\/|api\.whatsapp\.com/i]],
  booking: [["calendly", /calendly\.com/i], ["practo", /practo\.com/i], ["setmore", /setmore/i], ["fresha", /fresha\.com/i], ["simplybook", /simplybook/i],
            ["acuity", /acuityscheduling/i], ["hubspot_meetings", /meetings\.hubspot\.com/i], ["cal_com", /cal\.com\//i]],
  payments: [["razorpay", /checkout\.razorpay\.com|razorpay/i], ["stripe", /js\.stripe\.com/i], ["paypal", /paypal\.com\/sdk|paypalobjects/i],
             ["cashfree", /cashfree/i], ["payu", /payu\.in|payumoney/i]],
  email_marketing: [["mailchimp", /list-manage\.com|chimpstatic/i], ["hubspot_forms", /js\.hsforms\.net/i], ["zoho", /zohopublic|salesiq\.zoho/i],
                    ["klaviyo", /klaviyo/i], ["convertkit", /convertkit/i]],
};

function detectTech(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [group, list] of Object.entries(TECH)) {
    const hits = list.filter(([, re]) => re.test(html)).map(([name]) => name);
    if (hits.length) out[group] = hits;
  }
  return out;
}

// ---------------------------------------------------------------- meta
function attr(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? htmlToText(m[1], 400) || null : null;
}
function readMeta(html: string) {
  const schemaTypes = [...html.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map((m) => m[1]);
  return {
    title: attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: attr(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ?? attr(html, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i),
    ogTitle: attr(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i),
    ogImage: attr(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i),
    canonical: attr(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i),
    lang: attr(html, /<html[^>]+lang=["']([^"']+)["']/i),
    schemaTypes: [...new Set(schemaTypes)].slice(0, 12),
    noindex: /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),
  };
}

// ---------------------------------------------------------------- pages
const PAGE_KINDS: Array<[string, RegExp]> = [
  ["pricing", /pricing|plans|packages|fees|rate-card/],
  ["services", /services?|solutions?|what-we-do|offerings?|products?|treatments|courses|programs?|menu/],
  ["about", /about|who-we-are|our-story|company/],
  ["team", /team|people|leadership|founders?|doctors|faculty|our-experts|management/],
  ["partners", /partners?|partnership|affiliates?|resellers?|integrations?|alliances?/],
  ["careers", /careers?|jobs|join-us|hiring|vacanc/],
  ["case_studies", /case-stud|portfolio|our-work|projects|clients|testimonials|success-stor/],
  ["contact", /contact|reach-us|get-in-touch|locations?|branches/],
  ["blog", /blog|news|insights|articles|resources/],
];

function findPages(html: string, base: string): Record<string, string> {
  const b = new URL(base);
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL;
    try { u = new URL(m[1], b); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== b.hostname.replace(/^www\./, "")) continue;
    const key = `${u.pathname.toLowerCase()} ${htmlToText(m[2], 60).toLowerCase().replace(/\s+/g, "-")}`;
    for (const [kind, re] of PAGE_KINDS) if (!out[kind] && re.test(key) && u.pathname.length > 1) out[kind] = u.origin + u.pathname;
  }
  return out;
}

export async function crawlSite(url: string, modules: Module[] = [...MODULES]): Promise<SiteEnrichment & { profileText?: string }> {
  const t0 = Date.now();
  const domain = domainOf(url);
  const pages: Array<{ group: string; url: string; html: string }> = [];
  const logStart = fetchLog.length;
  const out: SiteEnrichment & { profileText?: string } = { url, domain, finalUrl: null, ok: false, fetchedVia: [], pagesRead: 0, ms: 0 };
  if (!domain) return { ...out, error: "bad_url" };

  let e: EnrichedDomain | null = null;
  try {
    e = await enrichFast(domain, url, (group, u, html) => pages.push({ group, url: u, html }));
  } catch (err) {
    out.error = String(err).slice(0, 200);
  }
  const home = pages.find((p) => p.group === "home");
  out.ok = !!home;
  out.finalUrl = e?.final_url ?? home?.url ?? null;
  if (!home) { out.error = out.error ?? e?.error ?? "home_unreachable"; }

  if (home) {
    if (modules.includes("meta")) out.meta = readMeta(home.html);
    if (modules.includes("tech")) out.tech = detectTech(pages.map((p) => p.html).join("\n"));
    const found = findPages(home.html, home.url);
    if (modules.includes("pages")) out.pages = found;
    if (modules.includes("contacts") && e) {
      out.contacts = {
        emails: e.emails.filter((x) => x.same_domain || x.freemail).map((x) => x.email).slice(0, 8),
        bestEmail: e.best_email, phones: e.phones ?? [], socials: e.socials ?? {},
        emailSources: e.emails.filter((x) => x.same_domain || x.freemail).slice(0, 8)
          .map((x) => ({ email: x.email, page: x.page ?? null, person: x.person ?? null, personRole: x.person_role ?? null })),
      };
    }
    if (modules.includes("people") && e) {
      out.people = (e.people ?? []).slice(0, 12).map((p) => ({ name: p.name, role: p.role ?? null, page: p.page ?? null }));
    }
    if (modules.includes("profile")) {
      // Profile reads the pages that describe the business, fetching any the crawl skipped.
      const want = ["services", "about", "pricing"].map((k) => found[k]).filter((u): u is string => !!u && !pages.some((p) => p.url === u));
      const extra = await Promise.all(want.slice(0, 3).map((u) => fetchPage(u, 8000)));
      const texts = [home, ...pages.filter((p) => p.group !== "home"), ...extra.filter((x): x is NonNullable<typeof x> => !!x?.html).map((x) => ({ group: "extra", url: x.url, html: x.html }))]
        .slice(0, 5).map((p) => `### ${p.url}\n${htmlToText(p.html, 4000)}`);
      // The LLM read happens in the app (lib/v2/enrich-site.ts); the crawl hands it the text.
      (out as SiteEnrichment & { profileText?: string }).profileText = texts.join("\n\n");
    }
  }
  out.pagesRead = pages.length;
  out.fetchedVia = [...new Set(fetchLog.slice(logStart).filter((f) => f.host.endsWith(domain.replace(/^www\./, "")) && f.ok).map((f) => f.method))];
  if (!out.fetchedVia.length && home) out.fetchedVia = ["plain"];
  out.ms = Date.now() - t0;
  return out;
}
