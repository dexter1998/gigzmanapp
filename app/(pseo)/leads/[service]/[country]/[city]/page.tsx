import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cityForParams } from "@/lib/pseo/urls";
import {} from "@/lib/pseo/registry";
import { CityLeadsView, cityMetadata } from "@/components/pseo/views";

// Statically rendered and revalidated daily; the refresh job additionally revalidates a page the
// moment its figures actually change. dynamicParams stays on so a page the gate promotes today
// renders today rather than 404ing until the next build — with the registry lookup in
// loadPageData() acting as the guard against an unbounded URL space.
export const revalidate = 86400;
export const dynamicParams = true;

/**
 * Empty on purpose, and load-bearing.
 *
 * With no generateStaticParams at all, Next classifies this route as fully dynamic and the
 * `revalidate` above never applies — every visit re-renders the page from scratch. Declaring it,
 * even returning nothing, makes the route statically generated with dynamicParams: a city renders
 * on demand the first time it is asked for and is then served from cache until it revalidates.
 *
 * Returning `[]` rather than the city list is what keeps the build free of the database, which is
 * the constraint that pushed this section to force-dynamic in the first place. Same pattern the
 * blog already uses in app/(resources)/resources/[slug]/page.tsx.
 */
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ service: string; country: string; city: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city } = await params;
  return cityMetadata(service, city);
}

export default async function CityLeadsPage({ params }: Params) {
  const { service, country, city } = await params;
  // The country segment is redundant with the city — slugs are globally unique — which is
  // exactly why it is checked. Unchecked, every wrong country renders a real page under a URL
  // that lies about it, and each one is a duplicate for anything that crawls it.
  if (!cityForParams(country, city)) notFound();
  return <CityLeadsView serviceSlug={service} citySlug={city} />;
}
