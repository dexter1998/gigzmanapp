import type { Metadata } from "next";
import { publishedPages } from "@/lib/pseo/registry";
import { CityLeadsView, cityMetadata } from "@/components/pseo/views";

// Statically rendered and revalidated daily; the refresh job additionally revalidates a page the
// moment its figures actually change. dynamicParams stays on so a page the gate promotes today
// renders today rather than 404ing until the next build — with the registry lookup in
// loadPageData() acting as the guard against an unbounded URL space.
export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "city" && p.city_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city } = await params;
  return cityMetadata(service, city);
}

export default async function CityLeadsPage({ params }: Params) {
  const { service, city } = await params;
  return <CityLeadsView serviceSlug={service} citySlug={city} />;
}
