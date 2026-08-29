import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { SERVICE_BY_SLUG } from "@/lib/pseo/services";
import { getPage, pageKeyFor, cityAreaBreakdown, publishedChildren, publishedPages } from "@/lib/pseo/registry";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";

/**
 * The area index for a city — every area we cover, ranked, with the gap rate for each.
 *
 * This page is the hierarchy made explicit. Google's doorway definition contrasts "substantially
 * similar pages" with "a clearly defined, browseable hierarchy", and an index that ranks its own
 * children and says how they differ is the clearest form of that. It also carries a finding of its
 * own: which parts of the city have the widest website gap, which is not on any child page.
 */
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "city" && p.city_slug)
    .map((p) => ({ service: p.service_slug, city: p.city_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city } = await params;
  const c = CITY_BY_SLUG.get(city);
  if (!c) return {};
  return {
    title: `Website gap by area in ${c.name} — every area we cover`,
    description: `How the share of businesses without a website varies across ${c.name}, area by area, with counts for each.`,
    alternates: { canonical: `${COMPANY.site}/leads/${service}/${city}/areas` },
  };
}

export default async function AreaIndex({ params }: Params) {
  const { service: serviceSlug, city: citySlug } = await params;
  const service = SERVICE_BY_SLUG.get(serviceSlug);
  const city = CITY_BY_SLUG.get(citySlug);
  if (!service || !city) notFound();

  const cityPage = await getPage(pageKeyFor(serviceSlug, { kind: "city", citySlug }));
  if (!cityPage || cityPage.status === "withheld") notFound();

  const areas = await cityAreaBreakdown(citySlug);
  const children = await publishedChildren(serviceSlug, citySlug);
  const linkable = new Set(children.areas.map((a) => a.slug));

  // Ranked by gap rate rather than volume — the point of this page is where the gap is widest, not
  // simply where we have the most rows. Small areas are held out so one shop at 100% can't top it.
  const ranked = [...areas].filter((a) => a.checked >= 25).sort((a, b) => b.gapRate - a.gapRate);
  const cityGap = areas.reduce((s, a) => s + a.qualifying, 0) / Math.max(1, areas.reduce((s, a) => s + a.checked, 0));
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: service.name, href: `/leads/${serviceSlug}` },
    { label: city.name, href: `/leads/${serviceSlug}/${citySlug}` },
    { label: "Areas" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        The website gap across {city.name}, area by area
      </h1>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0", maxWidth: 720 }}>
        {city.name} averages a {pct(cityGap)} website gap, but it is not spread evenly.
        {ranked[0] && ranked.at(-1) &&
          ` It runs from ${pct(ranked[0].gapRate)} in ${ranked[0].name} down to ${pct(ranked.at(-1)!.gapRate)} in ${ranked.at(-1)!.name}.`}{" "}
        Areas with fewer than 25 checked businesses are left out — the rate isn&rsquo;t meaningful there.
      </p>

      <div style={{ marginTop: 26, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--g-border)", fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: "var(--g-gray-500)" }}>
          <span>AREA</span><span style={{ textAlign: "right" }}>NO SITE</span><span style={{ textAlign: "right" }}>GAP RATE</span>
        </div>
        {ranked.map((a) => (
          <div key={a.area_slug} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--g-border)", fontSize: 14 }}>
            <span>
              {linkable.has(a.area_slug) ? (
                <Link href={`/leads/${serviceSlug}/${citySlug}/areas/${a.area_slug}`} style={{ color: "var(--g-green-text)", textDecoration: "none", fontWeight: 600 }}>
                  {a.name}
                </Link>
              ) : (
                <span style={{ color: "var(--g-ink)" }}>{a.name}</span>
              )}
            </span>
            <span style={{ textAlign: "right", color: "var(--g-ink-soft)" }}>{a.qualifying}</span>
            <span style={{ textAlign: "right", fontWeight: 700, color: a.gapRate > cityGap ? "#b45309" : "var(--g-ink-soft)" }}>
              {pct(a.gapRate)}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 14 }}>
        Areas without a link don&rsquo;t yet have enough verified data for a page of their own; they get
        one automatically when they do.
      </p>

      <p style={{ fontSize: 14, marginTop: 24 }}>
        <Link href={`/leads/${serviceSlug}/${citySlug}`} style={{ color: "var(--g-green-text)" }}>
          ← All {service.name.toLowerCase()} leads in {city.name}
        </Link>
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}
