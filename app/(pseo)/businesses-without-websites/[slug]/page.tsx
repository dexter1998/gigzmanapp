import type { Metadata } from "next";
import { NOSITE_BY_SLUG } from "@/lib/lists/defs";
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


/** Rendered on request and cached by the (pseo) layout's revalidate — the build never needs the DB. */
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return listMetadata(NOSITE_BY_SLUG.get((await params).slug));
}

export default async function Page({ params }: Props) {
  return <ListPage def={NOSITE_BY_SLUG.get((await params).slug)} />;
}
