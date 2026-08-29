import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { loadPageData } from "@/lib/pseo/page-data";
import { publishedPages } from "@/lib/pseo/registry";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { LeadCard } from "@/components/pseo/LeadCard";
import { ProvenanceNote } from "@/components/pseo/ProvenanceNote";
import { areaDisplayName } from "@/lib/pseo/locations";
import { SERVICE_BY_SLUG } from "@/lib/pseo/services";

// Statically rendered and revalidated daily; the refresh job additionally revalidates a page the
// moment its figures actually change. dynamicParams stays on so a page the gate promotes today
// renders today rather than 404ing until the next build — with the registry lookup in
// loadPageData() acting as the guard against an unbounded URL space.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string }> };

export async function generateStaticParams() {
  const pages = await publishedPages();
  return pages
    .filter((p) => p.page_type === "city" && p.city_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service: serviceSlug, city: citySlug } = await params;
  const data = await loadPageData(serviceSlug, citySlug, { kind: "city", citySlug });
  const { stats, city, service } = data;
  const pct = Math.round(stats.gapRate * 100);

  return {
    title: `${stats.qualifying} ${service.name} Leads in ${city.name} — businesses with no website`,
    description:
      `${stats.qualifying} businesses in ${city.name} have an active Google listing and no website — ` +
      `${pct}% of the ${stats.checked} we've checked. Ranked by opportunity, with category and area breakdowns.`,
    alternates: { canonical: `${COMPANY.site}/leads/${serviceSlug}/${citySlug}` },
    // Below the publication threshold the page still renders and stays linked from its parent, but
    // it is kept out of the index until the data supports it.
    robots: data.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CityLeadsPage({ params }: Params) {
  const { service: serviceSlug, city: citySlug } = await params;
  const data = await loadPageData(serviceSlug, citySlug, { kind: "city", citySlug });
  const { stats, leads, city, service, areas, children, nearby } = data;

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: service.name, href: `/leads/${serviceSlug}` },
    { label: city.name },
  ];

  const topAreas = areas.slice(0, 6);
  // A rate over a handful of businesses isn't a finding. At 40 the widest gap was a 40-lead village
  // at 85%, which is noise presented as insight; 150 is enough for the claim to hold up.
  const strongest = [...areas].filter((a) => a.checked >= 150).sort((a, b) => b.gapRate - a.gapRate)[0];
  // Only worth saying when the two medians actually differ — otherwise it reads as filler.
  const reviewComparison =
    stats.medianReviewsNoWebsite !== null &&
    stats.medianReviewsWithWebsite !== null &&
    stats.medianReviewsNoWebsite > 0 &&
    stats.medianReviewsNoWebsite !== stats.medianReviewsWithWebsite;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />

      <header style={{ paddingTop: 22 }}>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: -1.3, fontWeight: 800, color: "var(--g-ink)", margin: 0 }} className="marketing-h1">
          {stats.qualifying} {service.name} Leads in {city.name}
        </h1>
        {/* Written from the page's own numbers, so it changes when they do rather than being spun
            filler that reads the same on every page. */}
        <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0", maxWidth: 760 }}>
          {stats.qualifying} businesses in {city.name} ({city.aliases.includes("gurugram") ? "Gurugram" : city.state}) have an
          active Google listing and no website of their own — {pct(stats.gapRate)} of the {stats.checked} we have
          checked here.{" "}
          {strongest && `The gap is widest in ${strongest.name}, where ${pct(strongest.gapRate)} of businesses have no site.`}{" "}
          {reviewComparison &&
            `They are not dormant listings: among those carrying reviews, the median business without a website has ${stats.medianReviewsNoWebsite}, against ${stats.medianReviewsWithWebsite} for those that have one.`}
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, margin: "22px 0 0", padding: "14px 18px", background: "var(--g-green-mint)", borderRadius: "var(--radius-md)" }}>
        <Stat label="no website" value={String(stats.qualifying)} />
        <Stat label="checked here" value={String(stats.checked)} />
        <Stat label="website gap" value={pct(stats.gapRate)} />
        <Stat label="categories" value={String(stats.distinctCategories)} />
        <Stat label="areas covered" value={String(areas.length)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 28, marginTop: 30, alignItems: "start" }} className="pseo-layout">
        {/* The sidebar is the hierarchy, not a filter widget: every entry is a real page that
            exists. That is the structure Google's doorway definition contrasts itself against. */}
        <aside style={{ position: "sticky", top: 20 }}>
          {children.areas.length > 0 && (
            <SidebarBlock title="By area" moreHref={`/leads/${serviceSlug}/${citySlug}/areas`} moreLabel="All areas, ranked by gap">
              {children.areas.slice(0, 12).map((a) => (
                <SidebarLink key={a.slug} href={`/leads/${serviceSlug}/${citySlug}/areas/${a.slug}`} label={a.name} count={a.qualifying} />
              ))}
            </SidebarBlock>
          )}
          {children.categories.length > 0 && (
            <SidebarBlock title="By business category" moreHref={`/leads/${serviceSlug}/${citySlug}/categories`} moreLabel="All categories, ranked by gap">
              {children.categories.slice(0, 12).map((c) => (
                <SidebarLink key={c.slug} href={`/leads/${serviceSlug}/${citySlug}/categories/${c.slug}`} label={c.name} count={c.qualifying} />
              ))}
            </SidebarBlock>
          )}
        </aside>

        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>
              Highest-scoring opportunities
            </h2>
            <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>
              showing {leads.length} of {data.totalQualifying}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leads.map((l) => (
              <LeadCard key={l.id} lead={l} areaName={l.area_slug ? areaDisplayName(l.area_slug) : null} />
            ))}
          </div>

          {topAreas.length > 0 && (
            <section style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>
                Where the gap is widest in {city.name}
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", margin: "0 0 14px" }}>
                Share of mapped businesses with no website, by area.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {topAreas.map((a) => {
                  const linked = children.areas.some((c) => c.slug === a.area_slug);
                  const inner = (
                    <>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--g-ink)" }}>{a.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 4 }}>
                        {a.qualifying} of {a.checked} · {pct(a.gapRate)} gap
                      </div>
                    </>
                  );
                  return linked ? (
                    <Link key={a.area_slug} href={`/leads/${serviceSlug}/${citySlug}/areas/${a.area_slug}`}
                      style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 16, textDecoration: "none" }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={a.area_slug} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>How this list was built</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--g-ink-soft)", margin: 0 }}>
              {stats.coverage.exhausted} of {stats.coverage.cells} scan cells covering {city.name} have been searched to
              exhaustion{stats.coverage.lastVerified ? `, most recently on ${stats.coverage.lastVerified.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
              {stats.unknown > 0 && ` ${stats.unknown} businesses here have not been checked either way and are excluded from every figure above, rather than counted as having no website.`}
            </p>
          </section>

          {nearby.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 10px" }}>Nearby cities</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {nearby.map((n) => (
                  <Link key={n.slug} href={`/leads/${serviceSlug}/${n.slug}`}
                    style={{ fontSize: 13, color: "var(--g-green-text)", border: "1px solid var(--g-border)", background: "var(--g-white)", borderRadius: "var(--radius-pill)", padding: "7px 14px", textDecoration: "none" }}>
                    {n.name} · {n.km} km
                  </Link>
                ))}
              </div>
            </section>
          )}

          <ProvenanceNote observedOn={stats.verifiedRange.newest} />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${service.name} leads in ${city.name}`,
            url: `${COMPANY.site}/leads/${serviceSlug}/${citySlug}`,
            isPartOf: { "@id": `${COMPANY.site}/#website` },
            publisher: { "@id": `${COMPANY.site}/#organization` },
            ...(data.lastMaterialChangeAt ? { dateModified: data.lastMaterialChangeAt.toISOString() } : {}),
            // Minimal item nodes on purpose: naming a business is fine, but asserting its address,
            // phone or rating in our own structured data would be claiming to be the authoritative
            // record for a business we don't own.
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: leads.length,
              itemListElement: leads.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: l.business_name })),
            },
          }),
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g-ink)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--g-green-text)", fontWeight: 700, letterSpacing: 0.2 }}>{label}</div>
    </div>
  );
}

function SidebarBlock({ title, children, moreHref, moreLabel }: {
  title: string; children: React.ReactNode; moreHref?: string; moreLabel?: string;
}) {
  return (
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)", marginBottom: 10 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{children}</div>
      {moreHref && (
        <Link href={moreHref} style={{ display: "block", marginTop: 10, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
          {moreLabel} →
        </Link>
      )}
    </div>
  );
}

function SidebarLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--g-ink-soft)", textDecoration: "none" }}>
      <span>{label}</span>
      <span style={{ color: "var(--g-gray-500)" }}>{count}</span>
    </Link>
  );
}
