import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";
import { publishedPages } from "@/lib/pseo/registry";

/**
 * Static marketing pages plus every published lead page.
 *
 * Driven by the registry rather than a hardcoded list, so a page enters the sitemap the moment the
 * daily gate publishes it — on a city being approved, or on a sector's data finally crossing the
 * threshold — with no separate registration step and no deploy.
 *
 * Only `published` rows appear. Pages held at `noindex` are deliberately absent: they stay linked
 * from their parent so they can be found and promoted later, but submitting a page we are asking
 * Google not to index would be contradictory.
 *
 * `lastModified` is the date the figures actually changed, never the date this ran. Restamping
 * every URL on every build is how a sitemap's lastmod earns being ignored.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["", 1.0, "weekly"],
    ["/leads", 0.9, "daily"],
    ["/leads/methodology", 0.5, "monthly"],
    ["/pricing", 0.9, "weekly"],
    ["/partner", 0.8, "monthly"],
    ["/company", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
  ];

  const entries: MetadataRoute.Sitemap = staticPages.map(([path, priority, changeFrequency]) => ({
    url: `${COMPANY.site}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // A failure here must not take the whole sitemap down with it — the marketing pages should still
  // be submitted even if the lead registry is unreachable.
  try {
    for (const page of await publishedPages()) {
      const path =
        page.page_type === "city"
          ? `/leads/${page.service_slug}/${page.city_slug}`
          : page.page_type === "area"
            ? `/leads/${page.service_slug}/${page.city_slug}/areas/${page.area_slug}`
            : page.page_type === "category"
              ? `/leads/${page.service_slug}/${page.city_slug}/categories/${page.category_slug}`
              : null;
      if (!path) continue;
      entries.push({
        url: `${COMPANY.site}${path}`,
        lastModified: page.last_material_change_at ?? now,
        changeFrequency: "weekly",
        priority: page.page_type === "city" ? 0.8 : 0.6,
      });
    }
  } catch (err) {
    console.error("sitemap: could not read published lead pages", err);
  }

  return entries;
}
