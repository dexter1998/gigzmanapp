import type { Metadata } from "next";
import { cityForParams } from "@/lib/pseo/urls";
import { notFound } from "next/navigation";
import { CategoryLeadsView, categoryMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; country: string; city: string; category: string; n: string }> };

function parsePage(n: string): number {
  if (!/^\d+$/.test(n)) notFound();
  const page = Number(n);
  if (page < 2) notFound();
  return page;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, country, city, category, n } = await params;
  return categoryMetadata(service, city, category, parsePage(n));
}

export default async function CategoryPaged({ params }: Params) {
  const { service, country, city, category, n } = await params;
  // The country segment is redundant with the city — slugs are globally unique — which is
  // exactly why it is checked. Unchecked, every wrong country renders a real page under a URL
  // that lies about it, and each one is a duplicate for anything that crawls it.
  if (!cityForParams(country, city)) notFound();
  return <CategoryLeadsView serviceSlug={service} citySlug={city} category={category} page={parsePage(n)} />;
}
