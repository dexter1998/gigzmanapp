import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { loadFunded } from "@/lib/funded/load";
import { FUNDED_CITIES } from "@/lib/funded/refresh";
import { FundedView } from "@/components/lists/FundedView";
import { fmtCount } from "@/lib/landing/no-website";

/**
 * Statically generated on demand, then cached for a day (see the /leads city page for why): without
 * generateStaticParams Next treats the route as fully dynamic and `revalidate` never applies, so every
 * visit would re-run the queries. Returning nothing keeps `next build` free of database access.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}


type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).city;
  const c = FUNDED_CITIES.find((x) => x.slug === slug);
  if (!c) return {};
  const d = await loadFunded(c.slug).catch(() => null);
  return {
    title: { absolute: `Recently Funded Startups in ${c.name} (Weekly) | Mantis` },
    description: `${d ? fmtCount(d.total) : "Every"} startups in ${c.name} that raised a round in the last six months — round, amount, investors and the source article. Updated weekly.`,
    alternates: { canonical: `${COMPANY.site}/funded-startups-india/${c.slug}` },
    robots: d && d.total >= 25 ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const slug = (await params).city;
  const c = FUNDED_CITIES.find((x) => x.slug === slug);
  if (!c) notFound();
  const data = await loadFunded(c.slug);
  if (!data.total) notFound();
  return <FundedView data={data} cityName={c.name} citySlug={c.slug} />;
}
