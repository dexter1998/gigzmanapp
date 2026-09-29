import { cityPath, servicePath } from "@/lib/pseo/urls";
import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { SERVICES } from "@/lib/pseo/services";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards } from "@/lib/landing/no-website";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { CitySearch, type CityItem } from "@/components/pseo/CitySearch";

/**
 * Rendered per request, from a cached read — not prerendered.
 *
 * This is a parameterless route that queries Postgres, so once the group layout stopped forcing
 * everything dynamic, Next started prerendering it at build time and `next build` needed a live
 * database again. That failed the container build with ECONNREFUSED, which is the exact coupling
 * the layout's old force-dynamic was there to avoid — it was just avoiding it with a sledgehammer
 * that also disabled caching on the 8,471 pages underneath.
 *
 * The child routes keep ISR: they are dynamic segments with an empty generateStaticParams, so they
 * are never built ahead of time and cache after first render. A route with no params cannot do
 * that, so it opts out of the build explicitly and gets its speed from getCityCards() being cached
 * for a day instead.
 *
 * Worth noting for the next person: a local `next build` will NOT catch a regression here, because
 * Next loads .env.local and the database is reachable from this machine. Reproduce the container
 * build with an unreachable URL:
 *   DATABASE_URL="postgres://x:x@127.0.0.1:1/x" npx next build
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  openGraph: {
    images: ogImageMeta({
      v: "network",
      eyebrow: "Local lead market",
      t1: "High-intent local leads,",
      t2: "ready to pitch.",
      cta: "Browse the free list →",
      url: "mantisai.in/leads",
    }),
  },
  twitter: { card: "summary_large_image" },
  // Retargeted at the city-browsing intent ("list of businesses without websites", "businesses
  // without websites in <place>") and deliberately NOT at the generic head term, which belongs to
  // /find-businesses-without-websites. Two pages chasing "local businesses without websites" would
  // split the only demand this section has. The old title — "Local Lead Market — Businesses With No
  // Website" — led with a phrase nobody searches; "local lead market" has no measurable volume.
  title: { absolute: "Businesses Without Websites, By City" },
  description:
    "Browse businesses with an active Google listing and no website, city by city. Gurgaon alone has 2,125. Verified counts, gap rates and opportunity scores.",
  alternates: { canonical: `${COMPANY.site}/leads` },
};

export default async function LeadMarketHub() {
  const cityRows = await getCityCards().catch(() => []);
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Businesses Without Websites" }];

  const cities: CityItem[] = cityRows
    .map((p): CityItem | null => {
      const city = CITY_BY_SLUG.get(p.city_slug);
      if (!city) return null;
      return {
        slug: p.city_slug,
        name: city.name,
        href: cityPath(p.service_slug, p.city_slug),
        qualifying: p.qualifying_leads,
        region: city.state,
      };
    })
    .filter((c): c is CityItem => c !== null);

  const totalNoWebsite = cities.reduce((n, c) => n + c.qualifying, 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      {/* The H1 states the thing people search for. "The local lead market" was a phrase we coined;
          it has no search volume and told a visitor nothing about what the page lists. */}
      <h1 style={{ fontSize: 42, lineHeight: 1.1, letterSpacing: -1.4, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        Businesses without websites, city by city
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "16px 0 0", maxWidth: 700 }}>
        {totalNoWebsite > 0 ? (
          <>
            <strong style={{ color: "var(--g-ink)" }}>{totalNoWebsite.toLocaleString("en-IN")} businesses</strong>{" "}
            across {cities.length} cities have an active Google listing, real customers and no website
            at all. Every one is a business that can be pitched today. Pick a city to see who they are.
          </>
        ) : (
          <>
            A large share of small businesses run entirely on a Google listing and a phone number. We
            map which ones, where, and how strong an opportunity each represents.
          </>
        )}
      </p>

      {/* Entry points into the new landing pages. These carry the search demand — the head term is
          1,300/mo against 1-4 impressions a quarter for this whole tree — so the hub links up into
          them rather than treating itself as the top of the section. */}
      <nav aria-label="Ways to search" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {[
          ["Businesses near me", "/businesses-near-me-without-websites"],
          ["Search any city worldwide", "/find-businesses-without-websites"],
          ["By industry", "/industries-without-websites"],
          ["Web design leads", "/web-design-leads"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: 13.5, fontWeight: 600, color: "var(--g-green-text)", textDecoration: "none",
              border: "1px solid var(--g-border)", borderRadius: 999, padding: "7px 14px",
              background: "var(--g-white)",
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>By opportunity</h2>
        {SERVICES.map((s) => (
          <Link key={s.slug} href={servicePath(s.slug)} style={cardStyle}>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "var(--g-ink)" }}>{s.name}</div>
            <div style={{ fontSize: 13.5, color: "var(--g-ink-soft)", marginTop: 5 }}>{s.intro}</div>
          </Link>
        ))}
      </section>

      {cities.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
            Find your city
          </h2>
          <CitySearch cities={cities} />
        </section>
      )}

      <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", marginTop: 34 }}>
        <Link href="/leads/methodology" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>How these figures are produced</Link>
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: "block",
  background: "var(--g-white)",
  border: "1px solid var(--g-border)",
  borderRadius: "var(--radius-lg)",
  padding: 18,
  textDecoration: "none",
  marginBottom: 10,
};
