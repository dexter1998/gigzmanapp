import { cityPath, servicePath } from "@/lib/pseo/urls";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import type { PseoPageData } from "@/lib/pseo/page-data";
import { faqsFor } from "@/lib/pseo/copy";
import { areaDisplayName } from "@/lib/pseo/locations";
import { MIN_RATED_SHARE } from "@/lib/pseo/gate";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { SearchBar } from "@/components/pseo/SearchBar";
import { FilterSidebar } from "@/components/pseo/FilterSidebar";
import { SortPills } from "@/components/pseo/SortPills";
import { LeadCard } from "@/components/pseo/LeadCard";
import { Pagination } from "@/components/pseo/Pagination";
import { ProvenanceNote } from "@/components/pseo/ProvenanceNote";
import {
  UpdatedPill, SignalStrip, AreaTiles, HighIntentStrip, CategoryTiles, EmailCapture,
} from "@/components/pseo/Modules";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingCta } from "@/components/landing/LandingCta";
import { ArrowRightIcon, ZapIcon } from "@/components/icons";

/**
 * The single layout every public listing page uses — city, area and category alike.
 *
 * They share one shell on purpose: the three page types differ in their *figures*, not in their
 * furniture, and giving each its own hand-built page was how the copy started drifting apart in
 * ways that had nothing to do with the data. Everything variable arrives as props computed from
 * that page's own slice.
 *
 * Server-rendered throughout apart from two inert islands, the filter rail and the sort control.
 * Neither fetches; both only rearrange cards that are already in the HTML.
 */

const pct = (n: number) => `${Math.round(n * 100)}%`;
const longDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

/** Cards take even orders so the interleaved module block can hold the odd slot between the fourth
 *  and fifth of them whatever the sort control does. */
const CARDS_BEFORE_MODULES = 4;
const MODULE_ORDER = 2 * CARDS_BEFORE_MODULES + 1;
const orderFor = (rank: number) => 2 * (rank + 1);

export function ListingShell({
  data,
  serviceSlug,
  citySlug,
  crumbs,
  basePath,
  canonical,
  h1,
  intro,
  listingNoun,
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
  /** What the listing is counting, e.g. "opportunities" or "restaurant opportunities". */
  listingNoun: string;
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

  const tileCategories = children.categories
    .filter((c) => c.slug !== activeCategorySlug)
    .slice(0, 6)
    .map((c) => ({ slug: c.slug, name: c.name, count: c.qualifying, href: `${cityBase}/categories/${c.slug}` }));
  const tileAreas = children.areas
    .filter((a) => a.slug !== activeAreaSlug)
    .slice(0, 4)
    .map((a) => ({ slug: a.slug, name: a.name, count: a.qualifying, href: `${cityBase}/areas/${a.slug}` }));

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
  const place = data.areaName ?? city.name;

  return (
    <>
      <SearchBar
        serviceName={service.name}
        cityName={data.areaName ? `${data.areaName}, ${city.name}` : city.name}
        serviceHref={`/leads/${serviceSlug}`}
        cityHref={cityBase}
      />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 60px" }}>
        <Breadcrumbs items={crumbs} />

        <header style={{ paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <h1 className="marketing-h1" style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: 0, flex: "1 1 420px" }}>
              {h1}
            </h1>
            <div style={{ paddingTop: 6 }}>
              <UpdatedPill at={data.statsComputedAt} />
            </div>
          </div>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--g-ink-soft)", margin: "12px 0 0", maxWidth: 720 }}>
            {intro}
          </p>
        </header>

        <SignalStrip
          qualifying={stats.qualifying}
          highIntent={data.intentCounts.high}
          addedThisWeek={stats.addedThisWeek}
        />

        <div className="pseo-layout" style={{ display: "grid", gridTemplateColumns: "252px 1fr", gap: 26, marginTop: 24, alignItems: "start" }}>
          <div className="pseo-rail">
            <FilterSidebar
              items={leads.map((l) => ({
                id: l.id, intent: l.intent, rating: l.rating, score: l.score, fresh: l.verifiedDaysAgo,
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
            <div id="leads" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--g-ink)", margin: 0 }}>
                Showing {leads.length} {listingNoun}
                {data.pageCount > 1 && (
                  <span style={{ fontWeight: 500, color: "var(--g-gray-500)" }}> · page {data.page} of {data.pageCount}</span>
                )}
              </h2>
              <SortPills items={leads.map((l) => ({ id: l.id, score: l.score, fresh: l.verifiedDaysAgo }))} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leads.map((l, i) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  order={orderFor(i)}
                  areaName={l.area_slug && l.area_slug !== activeAreaSlug ? areaDisplayName(l.area_slug) : null}
                  hideCategory={l.category === activeCategorySlug}
                />
              ))}

              {/* Dropped into the run of cards rather than stacked underneath it, so a reader deep in
                  a list has somewhere sideways to go before they run out of patience. */}
              <div style={{ order: MODULE_ORDER, display: "flex", flexDirection: "column", gap: 12 }}>
                <AreaTiles title={`Top opportunity areas in ${city.name}`} href={`${cityBase}/areas`} items={tileAreas} />
                <HighIntentStrip leads={leads} />
                <CategoryTiles title={`Popular business categories in ${city.name}`} href={`${cityBase}/categories`} items={tileCategories} />
                <EmailCapture cityName={city.name} />
              </div>
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
              <Section title={`What the numbers say about ${place}`} bare>
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
                        {pct(intentShare)} of the total. These are the ones already winning customers without a site.
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
              <Section title={`Which trades are missing a website in ${place}`}
                       sub="Count and gap rate for each category we have checked here." bare>
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
                       sub="Share of mapped businesses with no website, by area." bare>
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
                {stats.coverage.exhausted} of {stats.coverage.cells} scan cells covering {place} have been searched to
                exhaustion
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
                    <Link key={n.slug} href={cityPath(serviceSlug, n.slug)}
                      style={{ fontSize: 13, color: "var(--g-green-text)", border: "1px solid var(--g-border)", background: "var(--g-cream)", borderRadius: "var(--radius-pill)", padding: "7px 14px", textDecoration: "none" }}>
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

        <ProvenanceNote observedOn={stats.verifiedRange.newest} />
      </div>

      {/* The same two sections the landing page closes with, so the lead pages don't read as a
          separate site bolted on. Only the questions change — and they are generated from this
          page's own figures, which is what stops ninety pages sharing one FAQ block. */}
      <LandingFaq
        faqs={faqs}
        title="Questions about"
        accent="this data."
        sub={`How the ${place} figures on this page are produced, and what they do and don't cover.`}
      />

      <LandingCta
        pill="Free to read, free to start"
        title={`All ${stats.qualifying.toLocaleString("en-IN")} of these are`}
        accent="one call away."
        sub="Everything on this page is free. A Mantis account adds phone numbers, saved lists and the full map."
        primary={{ label: "Get Free Access →", href: "/login" }}
        secondary={{ label: "See pricing ›", href: "/pricing" }}
      />

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
    </>
  );
}

/** Sections read as cards unless they already contain their own boxes — `bare` is for those, so a
 *  grid of panels isn't wrapped in a second identical panel. */
function Section({ title, sub, children, bare }: {
  title: string; sub?: string; children: React.ReactNode; bare?: boolean;
}) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 5px" }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 12px" }}>{sub}</p>}
      {!sub && <div style={{ height: 10 }} />}
      {bare ? children : <Panel>{children}</Panel>}
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
    <section style={{ marginTop: 44, borderTop: "1px solid var(--g-border)", paddingTop: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 16px" }}>
        Browse {serviceName.toLowerCase()} leads
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {areas.length > 0 && (
          <QuickCol title={`By area in ${cityName}`} moreHref={`${cityBase}/areas`} moreLabel="All areas"
            items={areas.map((a) => ({ label: `${a.name} leads`, href: a.href, count: a.qualifying }))} />
        )}
        {categories.length > 0 && (
          <QuickCol title="By business category" moreHref={`${cityBase}/categories`} moreLabel="All categories"
            items={categories.map((c) => ({ label: `${c.name} leads`, href: c.href, count: c.qualifying }))} />
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
            { label: `${serviceName} leads by city`, href: servicePath(serviceSlug) },
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
    <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "15px 17px" }}>
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
