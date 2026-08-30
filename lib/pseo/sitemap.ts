import { publishedPages } from "@/lib/pseo/registry";

/**
 * The lead section's contribution to the sitemap index.
 *
 * Split by page type rather than by size. The section is 100 URLs and the 50,000-per-file limit is
 * nowhere in sight, so this buys nothing in crawling — what it buys is that Search Console reports
 * coverage per submitted sitemap. "27 of 27 area pages indexed, 12 of 70 category pages indexed" is
 * a finding you can act on; the same numbers summed into one file are not.
 */

export type SitemapEntry = {
  path: string;
  lastModified?: Date;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

export const PSEO_SEGMENTS = ["leads-cities", "leads-areas", "leads-categories"] as const;
export type PseoSegment = (typeof PSEO_SEGMENTS)[number];

export function isPseoSegment(id: string): id is PseoSegment {
  return (PSEO_SEGMENTS as readonly string[]).includes(id);
}

/** Every published URL in one segment. Cities carry their two index pages with them: those aren't
 *  registry rows — they exist whenever their city does — but they are the browseable hierarchy the
 *  whole structure rests on, so they belong beside the city rather than in a file of their own. */
export async function pseoSitemapUrls(segment: PseoSegment): Promise<SitemapEntry[]> {
  const pages = await publishedPages();
  const entries: SitemapEntry[] = [];

  for (const page of pages) {
    const base = `/leads/${page.service_slug}/${page.city_slug}`;
    const lastModified = page.last_material_change_at ?? undefined;

    if (segment === "leads-cities" && page.page_type === "city") {
      entries.push({ path: base, lastModified, changeFrequency: "weekly", priority: 0.8 });
      for (const sub of ["areas", "categories"]) {
        entries.push({ path: `${base}/${sub}`, lastModified, changeFrequency: "weekly", priority: 0.7 });
      }
    }
    if (segment === "leads-areas" && page.page_type === "area") {
      entries.push({ path: `${base}/areas/${page.area_slug}`, lastModified, changeFrequency: "weekly", priority: 0.6 });
    }
    if (segment === "leads-categories" && page.page_type === "category") {
      entries.push({ path: `${base}/categories/${page.category_slug}`, lastModified, changeFrequency: "weekly", priority: 0.6 });
    }
  }

  return entries;
}

/** What the index should list. A segment with nothing in it is omitted rather than published empty —
 *  an empty sitemap is an error in Search Console, not a placeholder. */
export async function pseoSitemapSegments(): Promise<Array<{ id: PseoSegment; lastModified?: Date }>> {
  const out: Array<{ id: PseoSegment; lastModified?: Date }> = [];
  for (const id of PSEO_SEGMENTS) {
    const urls = await pseoSitemapUrls(id);
    if (urls.length === 0) continue;
    const stamps = urls.map((u) => u.lastModified).filter((d): d is Date => d instanceof Date);
    out.push({ id, lastModified: stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : undefined });
  }
  return out;
}
