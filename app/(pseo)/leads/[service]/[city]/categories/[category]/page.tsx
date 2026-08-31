import type { Metadata } from "next";
import {} from "@/lib/pseo/registry";
import { CategoryLeadsView, categoryMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, category } = await params;
  return categoryMetadata(service, city, category);
}

export default async function CategoryPage({ params }: Params) {
  const { service, city, category } = await params;
  return <CategoryLeadsView serviceSlug={service} citySlug={city} category={category} />;
}
