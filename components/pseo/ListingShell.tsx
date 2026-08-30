import Link from "next/link";
import { COMPANY } from "@/lib/company";
import type { PseoPageData } from "@/lib/pseo/page-data";
import { faqsFor } from "@/lib/pseo/copy";
import { areaDisplayName } from "@/lib/pseo/locations";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { SearchBar } from "@/components/pseo/SearchBar";
import { FilterSidebar } from "@/components/pseo/FilterSidebar";
import { LeadCard } from "@/components/pseo/LeadCard";
import { CategoryStrip } from "@/components/pseo/CategoryStrip";
import { Pagination } from "@/components/pseo/Pagination";
import { ProvenanceNote } from "@/components/pseo/ProvenanceNote";
import { ArrowRightIcon, ZapIcon } from "@/components/icons";
import { MIN_RATED_SHARE } from "@/lib/pseo/gate";

/**
 * The single layout every public listing page uses — city, area and category alike.
 *
 * They share one shell on purpose: the three page types differ in their *figures*, not in their
 * furniture, and giving each its own hand-built page was how the copy started drifting apart in
 * ways that had nothing to do with the data. Everything variable arrives as props computed from
 * that page's own slice.
 *
 * The whole thing is a server component apart from the filter rail. Every card, statistic,
 * breadcrumb and link is in the initial HTML.
 */

const pct = (n: number) => `${Math.round(n * 100)}%`;
const longDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

export function ListingShell({
  data,
  serviceSlug,
  citySlug,
  crumbs,
  basePath,
  canonical,
  h1,
  intro,
  headlineStats,
  listingTitle,
  activeAreaSlug,
  activeCategorySlug,
  showAreaGrid,
  extraSections,
}: {
  data: PseoPageData;
  serviceSlug: string;
  citySlug: string;
  crumbs: Crumb[];
  basePath: string;
  canonical: string;
  h1: string;
  intro: React.ReactNode;
  headlineStats: Array<{ label: string; value: string }>;
  listingTitle: string;
  activeAreaSlug?: string | null;
  activeCategorySlug?: string | null;
  showAreaGrid?: boolean;
  extraSections?: React.ReactNode;
}) {
  const { stats, leads, city, service, areas, children, nearby } = data;
  const cityBase = `/leads/${serviceSlug}/${citySlug}`;

  const areaFacets = children.areas.slice(0, 10).map((a) => ({
    slug: a.slug, name: a.name, count: a.qualifying, href: `${cityBase}/areas/${a.slug}`,
  }));
  const categoryFacets = children.categories.slice(0, 10).map((c) => ({
    slug: c.slug, name: c.name, count: c.qualifying, href: `${cityBase}/categories/${c.slug}`,
  }));

  // The strip is dropped into the run of cards rather than sitting above it, so a reader deep in a
  // list of restaurants has a way sideways without scrolling back to the rail.
  const stripItems = children.categories
    .filter((c) => c.slug !== activeCategorySlug)
    .slice(0, 10)
    .map((c) => ({ slug: c.slug, name: c.name, count: c.qualifying, category: c.slug, href: `${cityBase}/categories/${c.slug}` }));
  const stripAt = leads.length > 8 ? 6 : -1;

  const intentShare = data.intentCounts.high / Math.max(1, stats.qualifying);
  // A single high-intent business out of fifteen hundred is not a finding, and rounding it to
  // "0% of the total" states the opposite of what the panel is for.
  const showIntentPanel = data.intentCounts.high >= 10 && intentShare >= 0.02;
  // Without ratings the score bands collapse into a single "under 40" bar, which is a chart of our
  // own missing data rather than a finding about the market.
  const showScoreBands = stats.scoreBands.length > 0 && stats.ratedShare >= MIN_RATED_SHARE;

  const faqs = faqsFor(data);
  const topAreas = areas.slice(0, 8);
  const mix = stats.categories.slice(0, 8);

  return (
    <>
      <SearchBar
        serviceName={service.name}
        cityName={data.areaName ? `${data.areaName}, ${city.name}` : city.name}
        serviceHref={`/leads/${serviceSlug}`}
        cityHref={cityBase}
      />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 96px" }}>
        <Breadcrumbs items={crumbs} />

        <header style={{ paddingTop: 20 }}>
          <h1 className="marketing-h1" style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>
            {h1}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0", maxWidth: 780 }}>
            {intro}
          </p>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, margin: "20px 0 0", padding: "14px 18px", background: "var(--g-green-mint)", borderRadius: "var(--radius-md)" }}>
          {headlineStats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "var(--g-ink)" }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--g-green-text)", fontWeight: 700, letterSpacing: 0.2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="pseo-layout" style={{ display: "grid", gridTemplateColumns: "252px 1fr", gap: 26, marginTop: 26, alignItems: "start" }}>
          <div className="pseo-rail">
            <FilterSidebar
              items={leads.map((l) => ({
                id: l.id,
                intent: l.intent,
                rating: l.rating,
                score: l.score,
                fresh: l.verifiedDaysAgo,
              }))}
              areas={areaFacets}
              categories={categoryFacets}
              areasMoreHref={children.areas.length > 10 ? `${cityBase}/areas` : undefined}
              categoriesMoreHref={children.categories.length > 10 ? `${cityBase}/categories` : undefined}
              activeAreaSlug={activeAreaSlug}
              activeCategorySlug={activeCategorySlug}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div id="leads" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>{listingTitle}</h2>
              <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>
                {data.pageCount > 1
                  ? `Page ${data.page} of ${data.pageCount} · ${data.listed} listed of ${data.totalQualifying}`
                  : `Showing ${leads.length} of ${data.totalQualifying}`}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* flatMap rather than a wrapper element: the strip has to be a sibling of the cards
                  in the flex column, and wrapping each card in a container would nest it out of that
                  flow. */}
              {leads.flatMap((l, i) => {
                const card = (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    areaName={l.area_slug && l.area_slug !== activeAreaSlug ? areaDisplayName(l.area_slug) : null}
                    hideCategory={l.category === activeCategorySlug}
                  />
                );
                return i === stripAt
                  ? [card, <CategoryStrip key="strip" title={`Other categories in ${city.name}`} items={stripItems} />]
                  : [card];
              })}
            </div>

            {/* Shown only when the filter rail has hidden everything. Server-rendered and hidden by
                default, so it costs nothing and needs no second render pass. */}
            <p data-pseo-empty="" style={{ display: "none", fontSize: 14, color: "var(--g-gray-500)", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 24, textAlign: "center" }}>
              No businesses on this page match those filters. Clear one to see the rest.
            </p>

            {data.page === data.pageCount && data.listed < data.totalQualifying && (
              <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 16 }}>
                {data.totalQualifying - data.listed} further businesses here match but are not listed on these pages.
                They are all in the Mantis map, filterable by category, rating and score.
              </p>
            )}

            <Pagination basePath={basePath} page={data.page} pageCount={data.pageCount} />

            {extraSections}

            {/* ---- Below the listing: what the data says, rather than more of the same list ---- */}

            {(showScoreBands || showIntentPanel) && (
              <Section title={`What the numbers say about ${data.areaName ?? city.name}`}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                  {showIntentPanel && (
                    <Panel>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                        <ZapIcon size={13} color="var(--g-green-text)" />
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)" }}>HIGH INTENT</span>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--g-ink)" }}>{data.intentCounts.high}</div>
                      <p style={{ fontSize: 13, color: "var(--g-ink-soft)", lineHeight: 1.6, margin: "6px 0 0" }}>
                        businesses here carry 20 or more reviews at 4.0★ or better and still have no website —{" "}
                        {pct(intentShare)} of the total. These are the ones
                        already winning customers without a site.
                      </p>
                      <a href="#leads" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none", marginTop: 10 }}>
                        Filter the list to these <ArrowRightIcon size={12} color="var(--g-green-text)" />
                      </a>
                    </Panel>
                  )}

                  {showScoreBands && (
                    <Panel>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)", marginBottom: 12 }}>
                        LEAD SCORE DISTRIBUTION
                      </div>
                      {stats.scoreBands.map((b) => {
                        const share = b.count / Math.max(1, stats.qualifying);
                        return (
                          <div key={b.label} style={{ marginBottom: 9 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--g-ink-soft)", marginBottom: 3 }}>
                              <span>{b.label}</span>
                              <span style={{ color: "var(--g-gray-500)" }}>{b.count}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: "var(--g-border)", overflow: "hidden" }}>
                              <div style={{ width: `${Math.round(share * 100)}%`, height: "100%", background: "var(--g-green)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </Panel>
                  )}

                  {stats.medianReviewsNoWebsite !== null && stats.medianReviewsWithWebsite !== null && stats.medianReviewsNoWebsite > 0 && (
                    <Panel>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)", marginBottom: 8 }}>
                        ARE THEY STILL TRADING?
                      </div>
                      <div style={{ display: "flex", gap: 22, marginTop: 4 }}>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)" }}>{stats.medianReviewsNoWebsite}</div>
                          <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>median reviews, no website</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--g-gray-500)" }}>{stats.medianReviewsWithWebsite}</div>
                          <div style={{ fontSize: 11.5, color: "var(--g-gray-500)" }}>median reviews, has website</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", lineHeight: 1.6, margin: "10px 0 0" }}>
                        Counted only over businesses that carry at least one review, so unrated listings cannot drag
                        either figure toward zero.
                      </p>
                    </Panel>
                  )}
                </div>
              </Section>
            )}

            {mix.length >= 3 && (
              <Section title={`Which trades are missing a website in ${data.areaName ?? city.name}`}
                       sub="Count and gap rate for each category we have checked here.">
                <div style={{ overflowX: "auto", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 460 }}>
                    <thead>
                      <tr>
                        <Th align="left">Category</Th>
                        <Th align="right">No website</Th>
                        <Th align="right">Checked</Th>
                        <Th align="right">Gap</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {mix.map((c) => {
                        const linked = children.categories.find((x) => x.slug === c.category);
                        return (
                          <tr key={c.category} style={{ borderTop: "1px solid var(--g-border)" }}>
                            <Td align="left">
                              {linked ? (
                                <Link href={`${cityBase}/categories/${linked.slug}`} style={{ color: "var(--g-ink)", textDecoration: "none", fontWeight: 600 }}>
                                  {c.label}
                                </Link>
                              ) : (
                                c.label
                              )}
                            </Td>
                            <Td align="right">{c.qualifying}</Td>
                            <Td align="right" muted>{c.checked}</Td>
                            <Td align="right">
                              <span style={{ fontWeight: 700, color: c.gapRate > stats.gapRate ? "#b45309" : "var(--g-ink-soft)" }}>
                                {pct(c.gapRate)}
                              </span>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {showAreaGrid && topAreas.length > 1 && (
              <Section title={`Where the gap is widest in ${city.name}`}
                       sub="Share of mapped businesses with no website, by area.">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
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
                    const box: React.CSSProperties = {
                      background: "var(--g-white)", border: "1px solid var(--g-border)",
                      borderRadius: "var(--radius-md)", padding: 15, textDecoration: "none",
                    };
                    return linked ? (
                      <Link key={a.area_slug} href={`${cityBase}/areas/${a.area_slug}`} style={box}>{inner}</Link>
                    ) : (
                      <div key={a.area_slug} style={box}>{inner}</div>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title="How this list was built">
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--g-ink-soft)", margin: 0 }}>
                {stats.coverage.exhausted} of {stats.coverage.cells} scan cells covering {data.areaName ?? city.name} have
                been searched to exhaustion
                {longDate(stats.coverage.lastVerified) ? `, most recently on ${longDate(stats.coverage.lastVerified)}` : ""}.
                {stats.unknown > 0 &&
                  ` ${stats.unknown} businesses here have not been checked either way and are excluded from every figure above, rather than counted as having no website.`}{" "}
                Names are shown for the {Math.min(40, data.listed)} highest-scoring businesses; beyond those they are
                masked, and contact details are never published on this page at all.
              </p>
            </Section>

            {nearby.length > 0 && (
              <Section title="Nearby cities">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {nearby.map((n) => (
                    <Link key={n.slug} href={`/leads/${serviceSlug}/${n.slug}`}
                      style={{ fontSize: 13, color: "var(--g-green-text)", border: "1px solid var(--g-border)", background: "var(--g-white)", borderRadius: "var(--radius-pill)", padding: "7px 14px", textDecoration: "none" }}>
                      {n.name} · {n.km} km
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* ---- Full width, below both columns ---- */}

        <QuickLinks
          cityBase={cityBase}
          cityName={city.name}
          serviceSlug={serviceSlug}
          serviceName={service.name}
          areas={children.areas.slice(0, 12).map((a) => ({ ...a, href: `${cityBase}/areas/${a.slug}` }))}
          categories={children.categories.slice(0, 12).map((c) => ({ ...c, href: `${cityBase}/categories/${c.slug}` }))}
        />

        <section style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px", letterSpacing: -0.5 }}>
            Questions about this data
          </h2>
          <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 18px" }}>
            Answered from this page&rsquo;s own figures, not a template.
          </p>
          {/* <details>, not an accordion component: the answers are in the DOM either way, it needs no
              JavaScript, and it keeps this page down to a single client island. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "0 40px" }}>
            {faqs.map((f) => (
              <details key={f.q} className="pseo-faq" style={{ borderTop: "1px solid var(--g-border)", padding: "14px 0" }}>
                <summary style={{ fontSize: 15, fontWeight: 700, color: "var(--g-ink)", cursor: "pointer", listStyle: "none" }}>
                  {f.q}
                </summary>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--g-ink-soft)", margin: "10px 0 0" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <PseoCta cityName={data.areaName ?? city.name} qualifying={stats.qualifying} />

        <ProvenanceNote observedOn={stats.verifiedRange.newest} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: h1,
            url: canonical,
            isPartOf: { "@id": `${COMPANY.site}/#website` },
            publisher: { "@id": `${COMPANY.site}/#organization` },
            ...(data.lastMaterialChangeAt ? { dateModified: data.lastMaterialChangeAt.toISOString() } : {}),
            // Minimal item nodes on purpose: naming a business is fine, but asserting its address,
            // phone or rating in our own structured data would be claiming to be the authoritative
            // record for a business we don't own. Masked names are excluded outright.
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: leads.filter((l) => !l.masked).length,
              itemListElement: leads
                .filter((l) => !l.masked)
                .map((l, i) => ({ "@type": "ListItem", position: i + 1, name: l.business_name })),
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 5px" }}>{title}</h2>
      {sub && <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", margin: "0 0 14px" }}>{sub}</p>}
      {!sub && <div style={{ height: 12 }} />}
      {children}
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 18 }}>
      {children}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th style={{ textAlign: align, padding: "11px 16px", fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)" }}>
      {children}
    </th>
  );
}

function Td({ children, align, muted }: { children: React.ReactNode; align: "left" | "right"; muted?: boolean }) {
  return (
    <td style={{ textAlign: align, padding: "11px 16px", color: muted ? "var(--g-gray-500)" : "var(--g-ink-soft)" }}>
      {children}
    </td>
  );
}

type LinkItem = { slug: string; name: string; qualifying: number; href: string };

function QuickLinks({ cityBase, cityName, serviceSlug, serviceName, areas, categories }: {
  cityBase: string; cityName: string; serviceSlug: string; serviceName: string;
  areas: LinkItem[]; categories: LinkItem[];
}) {
  return (
    <section style={{ marginTop: 52, borderTop: "1px solid var(--g-border)", paddingTop: 30 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 18px" }}>
        Browse {serviceName.toLowerCase()} leads
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 26 }}>
        {areas.length > 0 && (
          <QuickCol title={`By area in ${cityName}`} moreHref={`${cityBase}/areas`} moreLabel="All areas"
            items={areas.map((a) => ({ label: `${a.name} leads`, href: a.href, count: a.qualifying }))} />
        )}
        {categories.length > 0 && (
          <QuickCol title="By business category" moreHref={`${cityBase}/categories`} moreLabel="All categories"
            items={categories.map((c) => ({ label: `${c.name} with no website`, href: c.href, count: c.qualifying }))} />
        )}
        <QuickCol title="By opportunity"
          items={[
            { label: "Highest lead score first", href: `${cityBase}#leads` },
            { label: "High-intent businesses", href: `${cityBase}#leads` },
            { label: "Most recently verified", href: `${cityBase}#leads` },
            { label: `Every area in ${cityName}`, href: `${cityBase}/areas` },
          ]} />
        <QuickCol title="About this data"
          items={[
            { label: "How we measure the website gap", href: "/leads/methodology" },
            { label: `${serviceName} leads by city`, href: `/leads/${serviceSlug}` },
            { label: "The whole lead market", href: "/leads" },
            { label: "New coverage feed (RSS)", href: "/leads/feed.xml" },
          ]} />
      </div>
    </section>
  );
}

function QuickCol({ title, items, moreHref, moreLabel }: {
  title: string;
  items: Array<{ label: string; href: string; count?: number }>;
  moreHref?: string; moreLabel?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.45, color: "var(--g-gray-500)", marginBottom: 11 }}>
        {title.toUpperCase()}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} style={{ fontSize: 13, color: "var(--g-ink-soft)", textDecoration: "none", display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{i.label}</span>
              {i.count !== undefined && <span style={{ color: "var(--g-gray-500)" }}>{i.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {moreHref && (
        <Link href={moreHref} style={{ display: "inline-block", marginTop: 10, fontSize: 12.5, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none" }}>
          {moreLabel} →
        </Link>
      )}
    </div>
  );
}

function PseoCta({ cityName, qualifying }: { cityName: string; qualifying: number }) {
  return (
    <section style={{ marginTop: 56, background: "var(--g-ink)", borderRadius: "var(--radius-lg)", padding: "44px 36px", textAlign: "center" }}>
      <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.8, textWrap: "balance" }}>
        Get the phone numbers for all {qualifying.toLocaleString("en-IN")} of them.
      </h2>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "12px auto 24px", maxWidth: 520 }}>
        Everything on this page is free to read. A free Mantis account adds contact details, saved lists and the full
        {" "}{cityName} map — no card needed.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/login" style={{ background: "var(--g-green)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "13px 28px", fontSize: 14.5, fontWeight: 700, textDecoration: "none" }}>
          Get free access
        </Link>
        <Link href="/pricing" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "var(--radius-pill)", padding: "13px 28px", fontSize: 14.5, fontWeight: 700, textDecoration: "none" }}>
          See pricing
        </Link>
      </div>
    </section>
  );
}
