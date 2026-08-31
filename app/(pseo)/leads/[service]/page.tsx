import { cityPath, servicePath } from "@/lib/pseo/urls";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { SERVICES, SERVICE_BY_SLUG } from "@/lib/pseo/services";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { publishedPages } from "@/lib/pseo/registry";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";

export const revalidate = 86400;
export const dynamicParams = false;

type Params = { params: Promise<{ service: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ service: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service: slug } = await params;
  const service = SERVICE_BY_SLUG.get(slug);
  if (!service) return {};
  return {
    title: { absolute: `${service.name} leads by city — businesses with no website | Mantis` },
    description: `Cities where Mantis has mapped businesses with an active Google listing and no website, ranked by how large the gap is.`,
    alternates: { canonical: `${COMPANY.site}${servicePath(slug)}` },
  };
}

export default async function ServiceHub({ params }: Params) {
  const { service: slug } = await params;
  const service = SERVICE_BY_SLUG.get(slug);
  if (!service) notFound();

  const cities = (await publishedPages()).filter((p) => p.page_type === "city" && p.service_slug === slug);
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Lead Market", href: "/leads" },
    { label: service.name },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: -1.3, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        {service.name} leads by city
      </h1>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "14px 0 0", maxWidth: 720 }}>
        {service.intro}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginTop: 28 }}>
        {cities.map((p) => {
          const city = CITY_BY_SLUG.get(p.city_slug!);
          if (!city) return null;
          const stats = p.stats as { gapRate?: number; checked?: number };
          return (
            <Link key={p.page_key} href={cityPath(slug, p.city_slug!)}
              style={{ display: "block", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 18, textDecoration: "none" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--g-ink)" }}>{city.name}</div>
              <div style={{ fontSize: 13, color: "var(--g-ink-soft)", marginTop: 6 }}>
                {p.qualifying_leads} with no website
                {typeof stats?.gapRate === "number" && ` · ${Math.round(stats.gapRate * 100)}% gap`}
              </div>
            </Link>
          );
        })}
      </div>

      {cities.length === 0 && (
        <p style={{ fontSize: 14.5, color: "var(--g-gray-500)", marginTop: 24 }}>
          No city has enough verified coverage to publish yet.
        </p>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs, COMPANY.site)) }} />
    </div>
  );
}
