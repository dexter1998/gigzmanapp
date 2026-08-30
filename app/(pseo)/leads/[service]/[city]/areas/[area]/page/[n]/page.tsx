import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaLeadsView, areaMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; area: string; n: string }> };

function parsePage(n: string): number {
  if (!/^\d+$/.test(n)) notFound();
  const page = Number(n);
  if (page < 2) notFound();
  return page;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, area, n } = await params;
  return areaMetadata(service, city, area, parsePage(n));
}

export default async function AreaPaged({ params }: Params) {
  const { service, city, area, n } = await params;
  return <AreaLeadsView serviceSlug={service} citySlug={city} areaSlug={area} page={parsePage(n)} />;
}
