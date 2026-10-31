import type { Metadata } from "next";
import { LIST_BY_SLUG } from "@/lib/lists/defs";
import { listMetadata, ListPage } from "@/lib/lists/route";

/**
 * Statically generated on demand, then cached for a day (see the /leads city page for why): without
 * generateStaticParams Next treats the route as fully dynamic and `revalidate` never applies, so every
 * visit would re-run the queries. Returning nothing keeps `next build` free of database access.
 */
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}


/** City version of a list — exists only where the city has 25+ real rows (else noindex). */
type Props = { params: Promise<{ slug: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city } = await params;
  return listMetadata(LIST_BY_SLUG.get(slug), city);
}

export default async function Page({ params }: Props) {
  const { slug, city } = await params;
  return <ListPage def={LIST_BY_SLUG.get(slug)} citySlug={city} />;
}
