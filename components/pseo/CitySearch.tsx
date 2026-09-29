"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CityItem = {
  slug: string;
  name: string;
  href: string;
  qualifying: number;
  /** Region/state, so "Hyderabad" and a same-named town elsewhere are tellable apart, and so the
   *  filter matches how people actually type ("telangana", "haryana"). */
  region?: string | null;
};

/**
 * Filter-in-place over the city grid.
 *
 * Deliberately not a route or a query parameter. Every city here is already a link in the server
 * -rendered HTML, so the whole list is crawlable and the filter is a convenience laid over it — a
 * `/leads?q=` route would instead spawn an unbounded set of near-identical URLs, which is the exact
 * pattern this section is already being penalised for. Nothing is fetched: the array is small and
 * arrives with the page.
 */
export function CitySearch({ cities }: { cities: CityItem[] }) {
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!needle) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.slug.toLowerCase().includes(needle) ||
        (c.region ? c.region.toLowerCase().includes(needle) : false)
    );
  }, [cities, needle]);

  const total = cities.reduce((n, c) => n + c.qualifying, 0);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${cities.length} cities — try "Gurgaon" or "Haryana"`}
          aria-label="Search cities"
          style={{
            width: "100%",
            padding: "13px 16px",
            fontSize: 15,
            color: "var(--g-ink)",
            background: "var(--g-white)",
            border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg)",
            outline: "none",
appearance: "none",
          }}
        />
      </div>

      <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "0 0 14px" }} aria-live="polite">
        {needle
          ? `${shown.length} ${shown.length === 1 ? "city" : "cities"} matching “${q.trim()}”`
          : `${cities.length} cities · ${total.toLocaleString("en-IN")} businesses with no website`}
      </p>

      {shown.length === 0 ? (
        <p style={{ fontSize: 14.5, color: "var(--g-ink-soft)", margin: "18px 0 0" }}>
          No city matches “{q.trim()}”. We publish a city once it has enough verified businesses to
          be worth reading — <Link href="/leads/methodology" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>how that threshold works</Link>.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {shown.map((c) => (
            <Link
              key={c.slug}
              href={c.href}
              style={{
                display: "block",
                background: "var(--g-white)",
                border: "1px solid var(--g-border)",
                borderRadius: "var(--radius-lg)",
                padding: 18,
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)" }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 4 }}>
                {c.qualifying.toLocaleString("en-IN")} businesses with no website
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
