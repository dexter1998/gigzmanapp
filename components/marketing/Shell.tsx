import type { ReactNode } from "react";

/** Page title block for the standalone marketing/legal pages, matching the landing page's type
 *  scale so these don't read as a different site once someone leaves the home page. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "72px 24px 0" }}>
      {eyebrow && (
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "var(--g-green-text)",
            background: "var(--g-green-mint)",
            border: "1px solid var(--g-border)",
            borderRadius: 999,
            padding: "6px 14px",
            marginBottom: 18,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          fontSize: 46,
          lineHeight: 1.08,
          letterSpacing: -1.6,
          fontWeight: 800,
          color: "var(--g-ink)",
          margin: 0,
        }}
        className="marketing-h1"
      >
        {title}
      </h1>
      {intro && (
        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--g-ink-soft)", marginTop: 18, maxWidth: 680 }}>
          {intro}
        </p>
      )}
    </div>
  );
}

/** Readable column for long-form text. Styling lives here rather than on every heading and
 *  paragraph in each legal page, so the pages stay mostly content. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-prose" style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 96px" }}>
      {children}
    </div>
  );
}

export function Card({ children, pad = 24 }: { children: ReactNode; pad?: number }) {
  return (
    <div
      style={{
        background: "var(--g-white)",
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-lg, 18px)",
        padding: pad,
      }}
    >
      {children}
    </div>
  );
}
