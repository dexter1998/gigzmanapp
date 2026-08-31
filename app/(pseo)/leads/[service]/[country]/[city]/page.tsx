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
