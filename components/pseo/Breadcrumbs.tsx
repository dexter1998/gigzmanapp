import Link from "next/link";

export type Crumb = { label: string; href?: string };

/**
 * Visible breadcrumbs, and the source of truth for the BreadcrumbList markup.
 *
 * These matter more here than on an ordinary page. Google's doorway definition contrasts
 * "substantially similar pages" with "a clearly defined, browseable hierarchy" — the crumbs, the
 * sidebar links and the child index pages are that hierarchy made visible. The JSON-LD must mirror
 * this list item for item, so both are generated from the same array.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ padding: "18px 0 0" }}>
      <ol style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {c.href ? (
              <Link href={c.href} style={{ fontSize: 12.5, color: "var(--g-gray-500)", textDecoration: "none" }}>
                {c.label}
              </Link>
            ) : (
              <span style={{ fontSize: 12.5, color: "var(--g-ink)", fontWeight: 600 }}>{c.label}</span>
            )}
            {i < items.length - 1 && <span style={{ fontSize: 12.5, color: "var(--g-gray-300)" }}>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbJsonLd(items: Crumb[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${siteUrl}${c.href}` } : {}),
    })),
  };
}
