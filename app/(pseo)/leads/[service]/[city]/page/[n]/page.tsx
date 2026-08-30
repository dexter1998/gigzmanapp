import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityLeadsView, cityMetadata } from "@/components/pseo/views";

// Pagination is rendered on demand rather than pre-built: page 2 onward is noindex and absent from
// the sitemap, so pre-rendering the tail would spend build time on pages nothing is asking for.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; n: string }> };

/** Only /page/2 and up are real URLs — /page/1 would duplicate the base path. */
function parsePage(n: string): number {
  if (!/^\d+$/.test(n)) notFound();
  const page = Number(n);
  if (page < 2) notFound();
  return page;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, n } = await params;
  return cityMetadata(service, city, parsePage(n));
}

export default async function CityLeadsPaged({ params }: Params) {
  const { service, city, n } = await params;
  return <CityLeadsView serviceSlug={service} citySlug={city} page={parsePage(n)} />;
}
