import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { loadList, listCityCounts } from "./load";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { LIST_MIN_ROWS, type ListDef } from "./defs";
import { ListView, listPath, cityHeading } from "@/components/lists/ListView";
import { fmtCount } from "@/lib/landing/no-website";

/** Shared metadata + page for the three list routes, so they cannot drift apart. */
export async function listMetadata(def: ListDef | undefined, citySlug?: string): Promise<Metadata> {
  if (!def) return {};
  const city = citySlug ? CITY_BY_SLUG.get(citySlug) : undefined;
  if (citySlug && !city) return {};
  const data = await loadList(def, citySlug).catch(() => null);
  const url = `${COMPANY.site}${listPath(def)}${citySlug ? `/${citySlug}` : ""}`;
  const n = data?.total ?? 0;
  const description = n
    ? `${fmtCount(n)} ${def.noun}${city ? ` in ${city.name}` : def.country ? " in India" : ""}, found and checked by Mantis${data && data.withPhone ? ` — ${fmtCount(data.withPhone)} with phone numbers` : ""}. See where they are and what their websites show; unlock contacts free.`
    : `${def.h1}: found and checked by Mantis from live map data and our own website reads.`;
  return {
    title: { absolute: city ? `${cityHeading(def, city.name)}${n ? `: ${fmtCount(n)} ${def.kind === "industry" ? "Verified" : "Checked"}` : ""} | Mantis` : `${def.title} | Mantis` },
    description: description.slice(0, 158),
    alternates: { canonical: url },
    // The single gate: under LIST_MIN_ROWS real rows a page is reachable but not indexed.
    robots: n >= LIST_MIN_ROWS ? undefined : { index: false, follow: true },
    openGraph: {
      title: def.title, url, type: "website",
      images: ogImageMeta({ v: "leads", eyebrow: def.kind === "service" ? "Leads by signal" : "Business lists", t1: def.h1.split(" ").slice(0, 4).join(" "), t2: def.h1.split(" ").slice(4).join(" ").slice(0, 46) || (n ? `${fmtCount(n)} checked` : ""), url: `mantisai.in${listPath(def)}` }),
    },
    twitter: { card: "summary_large_image" },
  };
}

export async function ListPage({ def, citySlug }: { def: ListDef | undefined; citySlug?: string }) {
  if (!def) notFound();
  const city = citySlug ? CITY_BY_SLUG.get(citySlug) : undefined;
  if (citySlug && !city) notFound();
  // Nosite city pages would duplicate /leads/website-development/<country>/<city>; not built.
  if (citySlug && def.kind === "nosite") notFound();
  // City chips come from the cheap lead-table count only; the website-signal city count is a
  // sitemap-time query (lib/lists/sitemap.ts), never run while a visitor waits.
  const cheap = def.kind === "industry";
  const [data, counts] = await Promise.all([loadList(def, citySlug), cheap ? listCityCounts(def).catch(() => []) : Promise.resolve([])]);
  if (data.total === 0) notFound();
  const cityPages = counts.filter((c) => c.n >= LIST_MIN_ROWS).map((c) => ({ ...c, name: CITY_BY_SLUG.get(c.slug)!.name }));
  return <ListView def={def} data={data} city={city ? { slug: city.slug, name: city.name } : undefined} cityPages={cityPages} />;
}
