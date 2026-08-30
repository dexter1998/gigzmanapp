import Link from "next/link";
import { categoryIcon } from "@/lib/pseo/category-icons";

/**
 * A horizontal rail of the categories that actually exist in this slice, dropped in between the
 * lead cards. Server-rendered links, so it is part of the browseable hierarchy rather than
 * decoration — it gives a reader who is scrolling a list of restaurants a way to jump sideways
 * into salons without going back up to the sidebar.
 */
export function CategoryStrip({
  title,
  items,
}: {
  title: string;
  items: Array<{ slug: string; name: string; count: number; href: string; category: string }>;
}) {
  if (items.length < 3) return null;

  return (
    <section style={{ margin: "8px 0", padding: "16px 18px", background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: "var(--g-gray-500)", marginBottom: 11 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "var(--g-white)",
              border: "1px solid var(--g-border)",
              borderRadius: "var(--radius-pill)",
              padding: "7px 13px",
              fontSize: 13,
              color: "var(--g-ink-soft)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 14 }}>{categoryIcon(c.category)}</span>
            {c.name}
            <span style={{ color: "var(--g-gray-500)", fontSize: 12 }}>{c.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
