import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLeadsView, categoryMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; category: string; n: string }> };

function parsePage(n: string): number {
  if (!/^\d+$/.test(n)) notFound();
  const page = Number(n);
  if (page < 2) notFound();
  return page;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, category, n } = await params;
  return categoryMetadata(service, city, category, parsePage(n));
}

export default async function CategoryPaged({ params }: Params) {
  const { service, city, category, n } = await params;
  return <CategoryLeadsView serviceSlug={service} citySlug={city} category={category} page={parsePage(n)} />;
}
