import type { Metadata } from "next";
import { publishedPages } from "@/lib/pseo/registry";
import { AreaLeadsView, areaMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; area: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "area" && p.city_slug && p.area_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug!, area: p.area_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, area } = await params;
  return areaMetadata(service, city, area);
}

export default async function AreaPage({ params }: Params) {
  const { service, city, area } = await params;
  return <AreaLeadsView serviceSlug={service} citySlug={city} areaSlug={area} />;
}
