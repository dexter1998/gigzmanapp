import Link from "next/link";
import { fmtCount, fmtPct } from "@/lib/landing/no-website";

/**
 * Shared furniture for the no-website landing pages.
 *
 * Five pages target one cluster of closely related queries, so they share a skeleton on purpose:
 * the alternative is five hand-built layouts that drift apart, and near-duplicate pages that differ
 * only in decoration are the thing Google is already discounting on this domain. What differs
 * between them is the data and the argument, which is what should differ.
 */

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 96px" }}>{children}</div>;
}

export function Hero({
  h1,
  lede,
  eyebrow,
}: {
  h1: string;
  lede: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header style={{ marginTop: 22 }}>
      {eyebrow && (
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--g-green-text)" }}>
          {eyebrow}
        </div>
      )}
      <h1
        className="marketing-h1"
        style={{ fontSize: 42, lineHeight: 1.1, letterSpacing: -1.4, fontWeight: 800, color: "var(--g-ink)", margin: "10px 0 0" }}
      >
        {h1}
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "16px 0 0", maxWidth: 700 }}>{lede}</p>
    </header>
  );
}

/** The numbers, stated once, high up. Every page leads with real counts because the data is the
 *  only thing we have that the incumbent tool pages don't. */
export function StatStrip({ stats }: { stats: Array<{ value: string; label: string }> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
        gap: 12,
        marginTop: 26,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "var(--g-white)",
            border: "1px solid var(--g-border)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--g-ink)", letterSpacing: -0.6 }}>{s.value}</div>
          <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 3 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Section({ h2, children, id }: { h2: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 12px", letterSpacing: -0.5 }}>{h2}</h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 16, lineHeight: 1.7, color: "var(--g-ink-soft)", maxWidth: 720 }}>{children}</div>
  );
}

/** Wide tables must scroll inside their own box rather than making the page scroll sideways. */
export function GapTable({
  caption,
  head,
  rows,
}: {
  caption?: string;
  head: string[];
  rows: Array<{ key: string; cells: React.ReactNode[]; href?: string }>;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", background: "var(--g-white)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 460 }}>
        {caption && <caption style={{ captionSide: "top", textAlign: "left", padding: "14px 18px 0", fontSize: 13, color: "var(--g-gray-500)" }}>{caption}</caption>}
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: i === 0 ? "left" : "right",
                  padding: "13px 18px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--g-gray-500)",
                  borderBottom: "1px solid var(--g-border)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {r.cells.map((c, i) => (
                <td
                  key={i}
                  style={{
                    textAlign: i === 0 ? "left" : "right",
                    padding: "12px 18px",
                    color: i === 0 ? "var(--g-ink)" : "var(--g-ink-soft)",
                    fontWeight: i === 0 ? 600 : 400,
                    borderBottom: "1px solid var(--g-border)",
                    whiteSpace: i === 0 ? "normal" : "nowrap",
                  }}
                >
                  {i === 0 && r.href ? (
                    <Link href={r.href} style={{ color: "var(--g-green-text)", textDecoration: "none" }}>
                      {c}
                    </Link>
                  ) : (
                    c
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Cta({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <div
      style={{
        marginTop: 44,
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--g-ink)" }}>{title}</div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--g-ink-soft)", margin: "8px 0 16px", maxWidth: 620 }}>{body}</p>
      <Link
        href={href}
        style={{
          display: "inline-block",
          background: "var(--g-green, #16794a)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "none",
          padding: "12px 22px",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {label}
      </Link>
    </div>
  );
}

/** FAQ block plus the JSON-LD that matches it. The two are generated from one array so the markup
 *  can never describe questions the page doesn't show — which is the version Google penalises. */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <>
      <Section h2="Common questions">
        <div style={{ borderTop: "1px solid var(--g-border)" }}>
          {items.map((f) => (
            <details key={f.q} style={{ borderBottom: "1px solid var(--g-border)", padding: "14px 0" }}>
              <summary style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)", cursor: "pointer" }}>{f.q}</summary>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--g-ink-soft)", margin: "10px 0 0", maxWidth: 700 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}

/** Links down into the existing lead pages. Per the decision not to optimise those for ranking,
 *  they appear here as proof and as onward paths, not as targets. */
export function CityStrip({
  cities,
  heading = "Or jump straight to a city",
}: {
  cities: Array<{ slug: string; name: string; href: string; qualifying: number }>;
  heading?: string;
}) {
  if (cities.length === 0) return null;
  return (
    <Section h2={heading}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cities.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            style={{
              fontSize: 13.5,
              color: "var(--g-ink)",
              textDecoration: "none",
              border: "1px solid var(--g-border)",
              background: "var(--g-white)",
              borderRadius: 999,
              padding: "8px 14px",
            }}
          >
            {c.name}{" "}
            <span style={{ color: "var(--g-gray-500)" }}>{fmtCount(c.qualifying)}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export { fmtCount, fmtPct };
