import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { COMPANY } from "@/lib/company";
import { CREDIT_COST, CREDIT_PACKS, FREE_SIGNUP_CREDITS, PLAN_PERIOD_DAYS, TOPUP_MIN_RUPEES, TOPUP_PAISE_PER_CREDIT, formatINR } from "@/lib/credits/pricing";
import { EyebrowPill, OrigamiFloor } from "@/components/marketing/MarketingPieces";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Shared furniture for the tool and "alternative to X" pages (/google-maps-scraper, /lead-finder,
 * /clay-alternative ...).
 *
 * Built from the same parts as /pricing and /partner (EyebrowPill, OrigamiFloor, the green
 * MarketingCta band, the cream/white section rhythm) so a visitor arriving from search lands on
 * something that is visibly the same product as the homepage. What differs between the seven pages
 * is the argument and the comparison, which is what should differ.
 *
 * Server components on purpose: the FAQ answers and comparison tables are the content these pages
 * rank on, so they must be in the HTML rather than mounted on click.
 */

export const TOOL_PAGES = [
  { href: "/google-maps-scraper", label: "Google Maps scraper" },
  { href: "/lead-generation-tool", label: "Lead generation tool" },
  { href: "/lead-finder", label: "Lead finder" },
  { href: "/ai-cold-calling", label: "AI cold calling" },
  { href: "/clay-alternative", label: "Clay alternative" },
  { href: "/zoominfo-alternative", label: "ZoomInfo alternative" },
  { href: "/apollo-alternative", label: "Apollo alternative" },
] as const;

export type ToolPath = (typeof TOOL_PAGES)[number]["href"];

const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "14px 26px",
  borderRadius: "var(--radius-sm)",
  background: "var(--g-green-darker)",
  color: "#fff",
  fontSize: 14.5,
  fontWeight: 700,
  textDecoration: "none",
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--g-white)",
  border: "1px solid var(--g-border)",
  color: "var(--g-ink)",
};

/* ------------------------------------------------------------------ hero */

export function ToolHero({
  eyebrow,
  title,
  accent,
  lede,
  image,
  primary = { label: `Start free with ${FREE_SIGNUP_CREDITS} credits`, href: "/login" },
  secondary,
  note,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  lede: ReactNode;
  image: { src: string; width: number; height: number; alt: string };
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  note?: ReactNode;
}) {
  return (
    <section style={{ position: "relative", padding: "56px 24px 96px", overflow: "hidden" }}>
      <OrigamiFloor opacity={0.5} height={300} />
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))",
          gap: 44,
          alignItems: "center",
        }}
      >
        <div>
          <EyebrowPill>{eyebrow}</EyebrowPill>
          <h1
            className="marketing-h1"
            style={{
              fontSize: "clamp(32px, 4.6vw, 50px)",
              fontWeight: 800,
              color: "var(--g-ink)",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              margin: "20px 0 16px",
              textWrap: "balance",
            }}
          >
            {title} {accent && <span style={{ color: "var(--g-green-dark)" }}>{accent}</span>}
          </h1>
          <p style={{ fontSize: 17, color: "var(--g-ink-soft)", lineHeight: 1.65, margin: "0 0 26px", maxWidth: 560 }}>{lede}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href={primary.href} style={btnPrimary}>
              {primary.label} ↗
            </Link>
            {secondary && (
              <Link href={secondary.href} style={btnSecondary}>
                {secondary.label} →
              </Link>
            )}
          </div>
          {note && <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "14px 0 0" }}>{note}</p>}
        </div>
        <Shot {...image} priority />
      </div>
    </section>
  );
}

/** A product screenshot or article illustration in a white frame. */
export function Shot({
  src,
  width,
  height,
  alt,
  caption,
  priority,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <div
        style={{
          background: "var(--g-white)",
          border: "1px solid var(--g-border)",
          borderRadius: "var(--radius-lg)",
          padding: 8,
          boxShadow: "0 18px 40px -24px rgba(16,18,20,0.25)",
        }}
      >
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          priority={priority}
          sizes="(max-width: 900px) 100vw, 560px"
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
        />
      </div>
      {caption && <figcaption style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 10, lineHeight: 1.5 }}>{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------ stats */

export function ToolStats({ stats, caption }: { stats: Array<{ value: string; label: string }>; caption?: string }) {
  return (
    <section style={{ padding: "0 24px", marginTop: -48, position: "relative", zIndex: 2 }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "18px 20px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--g-ink)", letterSpacing: -0.6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--g-gray-500)", marginTop: 3, lineHeight: 1.45 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {caption && <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "10px 2px 0" }}>{caption}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sections */

/** One full-width band. Alternating tones is the rhythm /pricing and /partner use. */
export function Band({
  id,
  title,
  accent,
  sub,
  tone = "cream",
  children,
}: {
  id?: string;
  title: string;
  accent?: string;
  sub?: string;
  tone?: "cream" | "white";
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ background: tone === "white" ? "var(--g-white)" : "transparent", padding: "72px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ marginBottom: 30, maxWidth: 760 }}>
          <h2
            style={{
              fontSize: "clamp(25px, 3.4vw, 36px)",
              fontWeight: 800,
              color: "var(--g-ink)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: "0 0 10px",
              textWrap: "balance",
            }}
          >
            {title} {accent && <span style={{ color: "var(--g-green-dark)" }}>{accent}</span>}
          </h2>
          {sub && <p style={{ fontSize: 16, color: "var(--g-gray-500)", margin: 0, lineHeight: 1.6 }}>{sub}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Long-form copy. Uses the site's .marketing-prose rules so headings, links and bold match /company. */
export function Copy({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-prose" style={{ maxWidth: 740 }}>
      {children}
    </div>
  );
}

/** Copy beside an image; stacks on narrow screens without a media query. */
export function Split({ children, aside, reverse = false }: { children: ReactNode; aside: ReactNode; reverse?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: 40, alignItems: "center" }}>
      <div style={{ order: reverse ? 2 : 1, minWidth: 0 }} className="marketing-prose">
        {children}
      </div>
      <div style={{ order: reverse ? 1 : 2, minWidth: 0 }}>{aside}</div>
    </div>
  );
}

export function Steps({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 16 }}>
      {steps.map((s, i) => (
        <li key={s.title} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 22 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--g-green-mint)",
              color: "var(--g-green-text)",
              fontWeight: 800,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            {i + 1}
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 6px" }}>{s.title}</h3>
          <p style={{ fontSize: 14, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function Cards({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16 }}>
      {items.map((c) => (
        <div key={c.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: 22, background: "var(--g-cream)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckIcon size={16} color="var(--g-green-text)" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 5px" }}>{c.title}</h3>
            <p style={{ fontSize: 14, color: "var(--g-gray-500)", lineHeight: 1.6, margin: 0 }}>{c.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A text comparison. Unlike GapTable (numbers, right-aligned, nowrap) every cell here is a short
 * sentence, so cells wrap and align left; the table scrolls inside its own box on a phone rather
 * than making the page scroll sideways. Column 2 is always Mantis and carries the green tint.
 */
export function CompareTable({ head, rows, note }: { head: string[]; rows: string[][]; note?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ overflowX: "auto", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", background: "var(--g-white)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, minWidth: 640 }}>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "14px 18px",
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: i === 1 ? "var(--g-green-text)" : "var(--g-gray-500)",
                    borderBottom: "1px solid var(--g-border)",
                    background: i === 1 ? "var(--g-green-mint)" : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: "left",
                      verticalAlign: "top",
                      padding: "13px 18px",
                      lineHeight: 1.5,
                      color: i === 0 ? "var(--g-ink)" : "var(--g-ink-soft)",
                      fontWeight: i === 0 ? 700 : 400,
                      borderBottom: "1px solid var(--g-border)",
                      background: i === 1 ? "rgba(244,248,233,0.5)" : undefined,
                    }}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p style={{ fontSize: 13, color: "var(--g-gray-500)", margin: "10px 2px 0", lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

/** "Where it falls short" — the honest list every one of these pages carries. */
export function Limits({ items }: { items: Array<{ title: string; body: string }> }) {
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 860 }}>
      {items.map((l) => (
        <div
          key={l.title}
          style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderLeft: "3px solid var(--g-amber)", borderRadius: "var(--radius-sm)", padding: "16px 20px" }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)", marginBottom: 4 }}>{l.title}</div>
          <p style={{ fontSize: 14.5, color: "var(--g-ink-soft)", lineHeight: 1.62, margin: 0 }}>{l.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ pricing */

/** The real rate card, read from lib/credits/pricing.ts so it can never drift from billing. */
export function PricingSummary({ focus = "leads" }: { focus?: "leads" | "voice" }) {
  const rows: Array<[string, string]> =
    focus === "voice"
      ? [
          ["AI voice call", `${CREDIT_COST.voice_minute} credits per connected minute`],
          ["Unanswered, busy or failed call", "Free"],
          ["New lead added to your list", `${CREDIT_COST.lead_unlock} credits`],
          ["Live map lookup, past the free daily allowance", `${CREDIT_COST.billed_places_call} credits`],
        ]
      : [
          ["New lead added to your list", `${CREDIT_COST.lead_unlock} credits`],
          ["Live map lookup, past the free daily allowance", `${CREDIT_COST.billed_places_call} credits`],
          ["Searching an area already scanned", "Free"],
          ["AI voice call", `${CREDIT_COST.voice_minute} credits per connected minute`],
        ];
  const card: CSSProperties = { background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 24, minWidth: 0 };
  const kicker: CSSProperties = { fontSize: 13, fontWeight: 800, color: "var(--g-green-text)", textTransform: "uppercase", letterSpacing: 0.4 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18, alignItems: "start" }}>
      <div style={card}>
        <div style={kicker}>Free to start</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: "var(--g-ink)", letterSpacing: -0.8, margin: "6px 0 4px" }}>{FREE_SIGNUP_CREDITS} credits</div>
        <p style={{ fontSize: 14, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Once, at signup, with no card. Credits never expire. Finding leads and building or testing a campaign work on free credits; a
          paid plan is needed to launch campaigns.
        </p>
        <div style={{ borderTop: "1px solid var(--g-border)" }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--g-border)", fontSize: 14 }}>
              <span style={{ color: "var(--g-ink-soft)" }}>{k}</span>
              <span style={{ color: "var(--g-ink)", fontWeight: 700, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={kicker}>Monthly plans</div>
        <div style={{ marginTop: 8 }}>
          {CREDIT_PACKS.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "4px 14px", padding: "12px 0", borderBottom: "1px solid var(--g-border)" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--g-ink)" }}>
                {p.label}
                {p.badge && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--g-green-text)", marginLeft: 8 }}>{p.badge}</span>}
              </span>
              <span style={{ fontSize: 14, color: "var(--g-ink-soft)" }}>
                <strong style={{ color: "var(--g-ink)" }}>{formatINR(p.pricePaise)}</strong> · {p.credits.toLocaleString("en-IN")} credits
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5, color: "var(--g-gray-500)", lineHeight: 1.6, margin: "14px 0 16px" }}>
          A plan runs {PLAN_PERIOD_DAYS} days, never auto-renews, and unlocks bulk email campaigns, bulk AI voice calls and the campaign
          planner. Running short mid-month? Add funds from ₹{TOPUP_MIN_RUPEES} at ₹{(TOPUP_PAISE_PER_CREDIT / 100).toFixed(2)} a credit. No
          seats, no annual contract.
        </p>
        <Link href="/pricing" style={{ fontSize: 14, fontWeight: 700, color: "var(--g-green-text)" }}>
          Full pricing and what each credit buys →
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ faq */

/**
 * Server-rendered FAQ in the same white-card look as FaqAccordion. FaqAccordion only mounts an
 * answer once it is opened, which suits /pricing but not pages whose answers are what a searcher
 * came for — <details> keeps every answer in the HTML. The FAQPage JSON-LD comes from the same
 * array, so the markup can never describe questions the page doesn't show.
 */
export function ToolFaq({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  return (
    <>
      <div style={{ maxWidth: 860 }}>
        {faqs.map((f) => (
          <details key={f.q} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-sm)", marginBottom: 10, padding: "0 20px" }}>
            <summary style={{ cursor: "pointer", padding: "17px 0", fontSize: 15, fontWeight: 700, color: "var(--g-ink)" }}>{f.q}</summary>
            <p style={{ fontSize: 14.5, color: "var(--g-ink-soft)", lineHeight: 1.68, margin: 0, padding: "0 0 18px" }}>{f.a}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ linking */

export function RelatedReading({ posts }: { posts: Array<{ slug: string; title: string; blurb: string }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 16 }}>
      {posts.map((p) => (
        <Link
          key={p.slug}
          href={`/resources/${p.slug}`}
          style={{ display: "block", textDecoration: "none", background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}
        >
          <Image
            src={`/resources/thumbs/${p.slug}.webp`}
            width={1600}
            height={900}
            alt={`Illustration for the guide: ${p.title}`}
            sizes="(max-width: 600px) 100vw, 280px"
            style={{ width: "100%", height: "auto", display: "block", borderBottom: "1px solid var(--g-border)" }}
          />
          <div style={{ padding: "14px 16px 16px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--g-ink)", lineHeight: 1.35, marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: "var(--g-gray-500)", lineHeight: 1.5 }}>{p.blurb}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** The sibling row: every tool/alternative page links to the other six, plus /leads and /pricing. */
export function ToolLinks({ current }: { current: ToolPath }) {
  const links = [...TOOL_PAGES.filter((t) => t.href !== current), { href: "/leads", label: "Local lead market" }, { href: "/pricing", label: "Pricing" }];
  return (
    <nav aria-label="Compare and tools" style={{ marginTop: 34 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--g-ink)", marginBottom: 12 }}>Compare and tools</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13.5,
              color: "var(--g-ink)",
              textDecoration: "none",
              border: "1px solid var(--g-border)",
              background: "var(--g-white)",
              borderRadius: 999,
              padding: "8px 14px",
            }}
          >
            {l.label}
            <ChevronRightIcon size={12} color="var(--g-green-text)" />
          </Link>
        ))}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ structured data */

export function ToolJsonLd({ path, name, description }: { path: ToolPath; name: string; description: string }) {
  const url = `${COMPANY.site}${path}`;
  const prices = CREDIT_PACKS.map((p) => p.pricePaise / 100);
  const graph = [
    {
      "@type": "SoftwareApplication",
      name: COMPANY.brandLong,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
      description,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "0",
        highPrice: String(Math.max(...prices)),
        offerCount: String(CREDIT_PACKS.length + 1),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: COMPANY.site },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }} />;
}
