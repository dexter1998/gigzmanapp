import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cityForParams } from "@/lib/pseo/urls";
import {} from "@/lib/pseo/registry";
import { AreaLeadsView, areaMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

// Empty on purpose: declaring generateStaticParams is what makes `revalidate` above take effect.
// Without it Next treats the route as fully dynamic and re-renders on every visit. Returning []
// keeps the database out of the build, so a page is generated on first request and then cached.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ service: string; country: string; city: string; area: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, country, city, area } = await params;
  return areaMetadata(service, city, area);
}

export default async function AreaPage({ params }: Params) {
  const { service, country, city, area } = await params;
  // The country segment is redundant with the city — slugs are globally unique — which is
  // exactly why it is checked. Unchecked, every wrong country renders a real page under a URL
  // that lies about it, and each one is a duplicate for anything that crawls it.
  if (!cityForParams(country, city)) notFound();
  return <AreaLeadsView serviceSlug={service} citySlug={city} areaSlug={area} />;
}
