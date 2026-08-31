import type { Metadata } from "next";
import { cityForParams } from "@/lib/pseo/urls";
import { notFound } from "next/navigation";
import { CityLeadsView, cityMetadata } from "@/components/pseo/views";

// Pagination is rendered on demand rather than pre-built: page 2 onward is noindex and absent from
// the sitemap, so pre-rendering the tail would spend build time on pages nothing is asking for.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; country: string; city: string; n: string }> };

/** Only /page/2 and up are real URLs — /page/1 would duplicate the base path. */
function parsePage(n: string): number {
  if (!/^\d+$/.test(n)) notFound();
  const page = Number(n);
  if (page < 2) notFound();
  return page;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, country, city, n } = await params;
  return cityMetadata(service, city, parsePage(n));
}

export default async function CityLeadsPaged({ params }: Params) {
  const { service, country, city, n } = await params;
  // The country segment is redundant with the city — slugs are globally unique — which is
  // exactly why it is checked. Unchecked, every wrong country renders a real page under a URL
  // that lies about it, and each one is a duplicate for anything that crawls it.
  if (!cityForParams(country, city)) notFound();
  return <CityLeadsView serviceSlug={service} citySlug={city} page={parsePage(n)} />;
}
