import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

/**
 * Only the pages that should actually rank. Everything behind auth (/home, /leads, /chat), the
 * account flows (/login, /verify, /preferences) and the token URLs (/u/...) are deliberately absent
 * — they have nothing to offer a searcher and, in the token case, must never be crawled at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["", 1.0, "weekly"],
    ["/pricing", 0.9, "weekly"],
    ["/partner", 0.8, "monthly"],
    ["/company", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
  ];

  return pages.map(([path, priority, changeFrequency]) => ({
    url: `${COMPANY.site}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
