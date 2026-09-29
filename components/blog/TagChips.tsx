import Link from "next/link";
import { BLOG_CATEGORIES } from "@/lib/blog/blocks";

/**
 * Tag chips that point at pages which already exist.
 *
 * The obvious version of this feature — chips linking to /resources/tag/[tag] — generates one thin,
 * near-duplicate listing page per tag. That is precisely the pattern that put 8,471 lead pages into
 * the index for 51 impressions a quarter, and repeating it in the blog would dilute the section we
 * are currently trying to get crawled at all. There are no tag archive pages here and there should
 * not be.
 *
 * What is worth having is the internal linking, so a tag links only when it maps to something real:
 * an existing category filter on the index, or one of the no-website landing pages. Everything else
 * stays a plain badge — visual grouping for a reader, and no claim to Google either way.
 *
 * Tag chips are not themselves a ranking factor. The links below are, in the ordinary way that any
 * internal link is: they add a path into pages we want crawled.
 */

/** Tags whose obvious destination is a real, substantial page rather than a generated archive. */
const TAG_DESTINATIONS: Record<string, string> = {
  "No-Website Leads": "/find-businesses-without-websites",
  "Google Maps": "/resources/find-businesses-without-websites-google-maps",
  Prospecting: "/businesses-near-me-without-websites",
  "Client Acquisition": "/web-design-leads",
  "Agency Growth": "/web-design-leads",
  Pricing: "/pricing",
};

const CATEGORY_SET = new Set<string>(BLOG_CATEGORIES);

function hrefFor(tag: string): string | null {
  if (TAG_DESTINATIONS[tag]) return TAG_DESTINATIONS[tag];
  // The index already renders a pill per category and handles ?category= — an existing page with
  // real content, not one this component brings into being.
  if (CATEGORY_SET.has(tag)) return `/resources?category=${encodeURIComponent(tag)}`;
  return null;
}

export function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="rc-tags">
      {tags.map((t) => {
        const href = hrefFor(t);
        return href ? (
          <Link key={t} href={href} className="rc-tag rc-tag-link">
            {t}
          </Link>
        ) : (
          <span key={t} className="rc-tag">
            {t}
          </span>
        );
      })}
    </div>
  );
}
