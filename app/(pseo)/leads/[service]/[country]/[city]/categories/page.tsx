import type { Metadata } from "next";
import { cityForParams, cityPath, cityIndexPath, categoryPath, servicePath } from "@/lib/pseo/urls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { SERVICE_BY_SLUG } from "@/lib/pseo/services";
import { getPage, pageKeyFor, publishedChildren} from "@/lib/pseo/registry";
import { loadScope } from "@/lib/pseo/stats";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";

/**
 * The category index for a city: which kinds of business are least likely to have a website.
 *
 * Like the area index, this is both a navigation surface and a finding in its own right — the
 * per-category gap rates are not visible on any single child page, and the spread between them is
 * the most useful thing on it for someone deciding who to approach.
 */
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; country: string; city: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, country, city } = await params;
  const c = cityForParams(country, city);
  if (!c) return {};
  return {
    title: `Which businesses in ${c.name} have no website, by category`,
    description: `The website gap in ${c.name} broken down by business category, with counts and rates for each.`,
    alternates: { canonical: `${COMPANY.site}${cityIndexPath(service, city, "categories")}` },
  };
}

export default async function CategoryIndex({ params }: Params) {
  const { service: serviceSlug, country, city: citySlug } = await params;
  // The country segment is redundant with the city — slugs are globally unique — which is
  // exactly why it is checked. Unchecked, every wrong country renders a real page under a URL
  // that lies about it, and each one is a duplicate for anything that crawls it.
  if (!cityForParams(country, citySlug)) notFound();
  const service = SERVICE_BY_SLUG.get(serviceSlug);
  const city = CITY_BY_SLUG.get(citySlug);
  if (!service || !city) notFound();

  const cityPage = await getPage(pageKeyFor(serviceSlug, { kind: "city", citySlug }));
  if (!cityPage || cityPage.status === "withheld") notFound();

  const { stats } = await loadScope({ kind: "city", citySlug });
  const children = await publishedChildren(serviceSlug, citySlug);
  const linkable = new Set(children.categories.map((c) => c.slug));

  // Only categories with enough checked businesses for the rate to mean something.
  const ranked = stats.categories.filter((c) => c.checked >= 20).sort((a, b) => b.gapRate - a.gapRate);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: service.name, href: servicePath(serviceSlug) },
    { label: city.name, href: cityPath(serviceSlug, citySlug) },
    { label: "Categories" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        Which businesses in {city.name} have no website
      </h1>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0", maxWidth: 720 }}>
        The gap varies far more by trade than by neighbourhood.
        {ranked[0] && ranked.at(-1) &&
          ` Among the categories we have enough data on, it runs from ${pct(ranked[0].gapRate)} of ${ranked[0].label.toLowerCase()} businesses down to ${pct(ranked.at(-1)!.gapRate)} of ${ranked.at(-1)!.label.toLowerCase()}.`}{" "}
        Categories with fewer than 20 checked businesses are left out.
      </p>

      <div style={{ marginTop: 26, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--g-border)", fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: "var(--g-gray-500)" }}>
          <span>CATEGORY</span><span style={{ textAlign: "right" }}>NO SITE</span><span style={{ textAlign: "right" }}>GAP RATE</span>
        </div>
        {ranked.map((c) => (
          <div key={c.category} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--g-border)", fontSize: 14 }}>
            <span>
              {linkable.has(c.category) ? (
                <Link href={categoryPath(serviceSlug, citySlug, c.category)} style={{ color: "var(--g-green-text)", textDecoration: "none", fontWeight: 600 }}>
                  {c.label}
                </Link>
              ) : (
                <span style={{ color: "var(--g-ink)" }}>{c.label}</span>
              )}
            </span>
            <span style={{ textAlign: "right", color: "var(--g-ink-soft)" }}>{c.qualifying}</span>
            <span style={{ textAlign: "right", fontWeight: 700, color: c.gapRate > stats.gapRate ? "#b45309" : "var(--g-ink-soft)" }}>
              {pct(c.gapRate)}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 14 }}>
        Categories without a link don&rsquo;t yet have enough verified data for a page of their own.
      </p>

      <p style={{ fontSize: 14, marginTop: 24 }}>
        <Link href={cityPath(serviceSlug, citySlug)} style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>
          ← All {service.name.toLowerCase()} leads in {city.name}
        </Link>
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}
