import type { Metadata } from "next";
import { publishedPages } from "@/lib/pseo/registry";
import { CategoryLeadsView, categoryMetadata } from "@/components/pseo/views";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ service: string; city: string; category: string }> };

export async function generateStaticParams() {
  return (await publishedPages())
    .filter((p) => p.page_type === "category" && p.city_slug && p.category_slug)
    .slice(0, 150)
    .map((p) => ({ service: p.service_slug, city: p.city_slug!, category: p.category_slug! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { service, city, category } = await params;
  return categoryMetadata(service, city, category);
}

export default async function CategoryPage({ params }: Params) {
  const { service, city, category } = await params;
  return <CategoryLeadsView serviceSlug={service} citySlug={city} category={category} />;
}
