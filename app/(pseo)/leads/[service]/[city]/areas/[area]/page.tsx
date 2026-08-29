import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { loadPageData } from "@/lib/pseo/page-data";
import { publishedPages } from "@/lib/pseo/registry";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { LeadCard } from "@/components/pseo/LeadCard";
import { ProvenanceNote } from "@/components/pseo/ProvenanceNote";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; area: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "area" && p.city_slug && p.area_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug!, area: p.area_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, area } = await params;
  const d = await loadPageData(service, city, { kind: "area", citySlug: city, areaSlug: area });
  return {
    title: `${d.stats.qualifying} businesses with no website in ${d.areaName}, ${d.city.name}`,
    description:
      `${d.stats.qualifying} of ${d.stats.checked} businesses mapped in ${d.areaName} have no website — ` +
      `a ${Math.round(d.stats.gapRate * 100)}% gap. Ranked by opportunity score.`,
    alternates: { canonical: `${COMPANY.site}/leads/${service}/${city}/areas/${area}` },
    robots: d.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function AreaPage({ params }: Params) {
  const { service, city, area } = await params;
  const d = await loadPageData(service, city, { kind: "area", citySlug: city, areaSlug: area });
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const cityGap = d.areas.reduce((acc, a) => acc + a.qualifying, 0) /
    Math.max(1, d.areas.reduce((acc, a) => acc + a.checked, 0));
  const delta = d.stats.gapRate - cityGap;

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: d.service.name, href: `/leads/${service}` },
    { label: d.city.name, href: `/leads/${service}/${city}` },
    { label: d.areaName ?? area },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 38, lineHeight: 1.12, letterSpacing: -1.2, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        {d.stats.qualifying} businesses with no website in {d.areaName}
      </h1>

      {/* The comparison against the city is the reason this page exists separately from its parent:
          the same list without it would be a slice, not a finding. */}
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0" }}>
        {d.stats.qualifying} of the {d.stats.checked} businesses we have mapped in {d.areaName} have no
        website — a {pct(d.stats.gapRate)} gap,{" "}
        {Math.abs(delta) < 0.02
          ? `close to the ${pct(cityGap)} average across ${d.city.name}`
          : `${Math.abs(Math.round(delta * 100))} points ${delta > 0 ? "above" : "below"} the ${pct(cityGap)} average across ${d.city.name}`}
        .{" "}
        {d.rank && `That ranks ${d.areaName} ${ordinal(d.rank.byCount)} of ${d.rank.of} areas by volume, and ${ordinal(d.rank.byGapRate)} by gap rate.`}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "30px 0 14px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: 0 }}>Highest-scoring opportunities</h2>
        <span style={{ fontSize: 12.5, color: "var(--g-gray-500)" }}>showing {d.leads.length} of {d.totalQualifying}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {d.leads.map((l) => <LeadCard key={l.id} lead={l} areaName={d.areaName} />)}
      </div>

      {d.stats.categories.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>
            What kind of businesses these are
          </h2>
          <div style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {d.stats.categories.slice(0, 8).map((c) => (
              <div key={c.category} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--g-border)", fontSize: 13.5 }}>
                <span style={{ color: "var(--g-ink)" }}>{c.label}</span>
                <span style={{ color: "var(--g-gray-500)" }}>{c.qualifying} of {c.checked} · {pct(c.gapRate)} gap</span>
              </div>
            ))}
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
