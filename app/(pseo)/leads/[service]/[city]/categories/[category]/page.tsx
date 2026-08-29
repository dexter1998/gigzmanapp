import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { loadPageData } from "@/lib/pseo/page-data";
import { publishedPages } from "@/lib/pseo/registry";
import { areaDisplayName } from "@/lib/pseo/locations";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { LeadCard } from "@/components/pseo/LeadCard";
import { ProvenanceNote } from "@/components/pseo/ProvenanceNote";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; category: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "category" && p.city_slug && p.category_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug!, category: p.category_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, category } = await params;
  const d = await loadPageData(service, city, { kind: "category", citySlug: city, category });
  return {
    title: `${d.categoryLabel} businesses with no website in ${d.city.name} — ${d.stats.qualifying} leads`,
    description:
      `${d.stats.qualifying} of ${d.stats.checked} ${String(d.categoryLabel).toLowerCase()} businesses mapped in ` +
      `${d.city.name} have no website — a ${Math.round(d.stats.gapRate * 100)}% gap.`,
    alternates: { canonical: `${COMPANY.site}/leads/${service}/${city}/categories/${category}` },
    robots: d.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { service, city, category } = await params;
  const d = await loadPageData(service, city, { kind: "category", citySlug: city, category });
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: d.service.name, href: `/leads/${service}` },
    { label: d.city.name, href: `/leads/${service}/${city}` },
    { label: d.categoryLabel ?? category },
  ];

  // Where this category's businesses actually sit, computed from the leads shown.
  const byArea = new Map<string, number>();
  for (const l of d.leads) if (l.area_slug) byArea.set(l.area_slug, (byArea.get(l.area_slug) ?? 0) + 1);
  const topAreas = [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        {d.categoryLabel} businesses with no website in {d.city.name}
      </h1>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0" }}>
        {d.stats.qualifying} of the {d.stats.checked} {String(d.categoryLabel).toLowerCase()} businesses we have mapped in{" "}
        {d.city.name} have no website — a {pct(d.stats.gapRate)} gap.
        {d.stats.medianReviewsNoWebsite !== null && d.stats.medianReviewsNoWebsite > 0 &&
          ` Among those carrying reviews, the median has ${d.stats.medianReviewsNoWebsite} — these are trading businesses, not stale listings.`}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "30px 0 14px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>Highest-scoring opportunities</h2>
        <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>showing {d.leads.length} of {d.totalQualifying}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {d.leads.map((l) => (
          <LeadCard key={l.id} lead={l} areaName={l.area_slug ? areaDisplayName(l.area_slug) : null} />
        ))}
      </div>

      {topAreas.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
            Where they are concentrated
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {topAreas.map(([slug, n]) => {
              const name = areaDisplayName(slug);
              const linked = d.children.areas.some((a) => a.slug === slug);
              const label = `${name} · ${n}`;
              return linked ? (
                <Link key={slug} href={`/leads/${service}/${city}/areas/${slug}`} style={chip}>{label}</Link>
              ) : (
                <span key={slug} style={chip}>{label}</span>
              );
            })}
          </div>
        </section>
      )}

      <p style={{ fontSize: 14, marginTop: 28 }}>
        <Link href={`/leads/${service}/${city}`} style={{ color: "var(--g-green-text)" }}>
          ← All {d.service.name.toLowerCase()} leads in {d.city.name}
        </Link>
      </p>

      <ProvenanceNote observedOn={d.stats.verifiedRange.newest} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}

const chip: React.CSSProperties = {
  fontSize: 13,
  color: "var(--g-ink-soft)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  borderRadius: "var(--radius-pill)",
  padding: "7px 14px",
  textDecoration: "none",
};
