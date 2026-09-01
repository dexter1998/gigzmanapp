import { cityPath, servicePath } from "@/lib/pseo/urls";
import type { Metadata } from "next";
import { ogImageMeta } from "@/lib/og";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { SERVICES } from "@/lib/pseo/services";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { publishedPages } from "@/lib/pseo/registry";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";

export const revalidate = 86400;

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
  title: { absolute: "Local Lead Market — Businesses With No Website" },
  description:
    "Which local businesses have an active Google listing and no website, by city and by area. Gap rates, opportunity scores and coverage, measured by Mantis.",
  alternates: { canonical: `${COMPANY.site}/leads` },
};

export default async function LeadMarketHub() {
  const pages = await publishedPages();
  const cities = pages.filter((p) => p.page_type === "city");
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Lead Market" }];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 42, lineHeight: 1.1, letterSpacing: -1.4, fontWeight: 800, color: "var(--g-ink)", margin: "22px 0 0" }} className="marketing-h1">
        The local lead market
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "16px 0 0", maxWidth: 700 }}>
        A large share of small businesses run entirely on a Google listing and a phone number. We map
        which ones, where, and how strong an opportunity each represents — then publish the counts.
      </p>

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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px" }}>Cities covered</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {cities.map((p) => {
              const city = CITY_BY_SLUG.get(p.city_slug!);
              if (!city) return null;
              return (
                <Link key={p.page_key} href={cityPath(p.service_slug, p.city_slug!)} style={cardStyle}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)" }}>{city.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 4 }}>
                    {p.qualifying_leads} businesses with no website
                  </div>
                </Link>
              );
            })}
          </div>
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
