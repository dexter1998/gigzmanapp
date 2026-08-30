import Link from "next/link";

/**
 * Path-based pagination (`/page/2`), never a query string, so each page is a clean URL with its own
 * self-referential canonical. Pages beyond the first are noindex — see page-data — but stay
 * crawlable and linked, which keeps the set browseable without adding a run of near-identical URLs
 * to the index.
 */
export function Pagination({ basePath, page, pageCount }: { basePath: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;

  const href = (n: number) => (n === 1 ? basePath : `${basePath}/page/${n}`);
  const windowed: Array<number | "gap"> = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n <= 2 || n > pageCount - 1 || Math.abs(n - page) <= 1) windowed.push(n);
    else if (windowed.at(-1) !== "gap") windowed.push("gap");
  }

  return (
    <nav aria-label="Pagination" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 24 }}>
      {windowed.map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} style={{ color: "var(--g-gray-500)", padding: "0 4px" }}>…</span>
        ) : n === page ? (
          <span key={n} style={{ ...pill, background: "var(--g-green)", color: "#fff", border: "1px solid var(--g-green)" }} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} style={pill}>{n}</Link>
        )
      )}
      {page < pageCount && (
        <Link href={href(page + 1)} style={{ ...pill, fontWeight: 700 }}>Next ›</Link>
      )}
    </nav>
  );
}

const pill: React.CSSProperties = {
  minWidth: 38,
  textAlign: "center",
  padding: "9px 13px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--g-border)",
  background: "var(--g-white)",
  color: "var(--g-ink)",
  fontSize: 13.5,
  textDecoration: "none",
};
