import Link from "next/link";
import { CategoryIcon } from "@/components/pseo/CategoryIcon";
import { CheckIcon, ZapIcon, PlusIcon, PinIcon, ChevronRightIcon, RefreshIcon } from "@/components/icons";
import type { ScoredLead } from "@/lib/pseo/stats";

/**
 * The blocks that sit between the lead cards and around them.
 *
 * All server components. Nothing here fetches on mount — the shell passes down figures it already
 * has, so every number, link and label is in the initial HTML.
 */

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "Updated 29 Aug 2026" beside the heading. Shows the date the figures were last recalculated,
 *  which is a real timestamp — never today's date stamped on unchanged content. Falls back to a
 *  relative phrase only when the registry has no stamp yet. */
export function UpdatedPill({ at }: { at: Date | null }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
        background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-pill)",
        padding: "6px 13px", fontSize: 12.5, color: "var(--g-ink-soft)", fontWeight: 600,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--g-green)", flexShrink: 0 }} />
      {at ? `Updated ${longDate(at)}` : "Updated in the last 24 hours"}
<RefreshIcon size={12} />
    </span>
  );
}

/** The three headline signals as one sentence-like line rather than a row of big numbers. Each is a
 *  claim the page can defend further down, not a decorative stat. */
export function SignalStrip({
  qualifying, highIntent, addedThisWeek,
}: { qualifying: number; highIntent: number; addedThisWeek: number }) {
  const items = [
    { icon: <CheckIcon size={13} color="var(--g-green-text)" />, strong: qualifying.toLocaleString("en-IN"), text: "businesses have no website" },
    // Below five this is noise, and it also avoids "1 show high intent" — the same threshold the
    // high-intent panel further down uses, so the page never advertises a figure it then hides.
    ...(highIntent >= 5
      ? [{ icon: <ZapIcon size={13} color="var(--g-green-text)" />, strong: highIntent.toLocaleString("en-IN"), text: "show high intent" }]
      : []),
    // Suppressed when nearly everything is "new". On a slice first scanned days ago that figure is
    // true and completely uninformative — it describes when we arrived, not the market.
    ...(addedThisWeek > 0 && addedThisWeek < qualifying * 0.9
      ? [{ icon: <PlusIcon size={13} color="var(--g-green-text)" />, strong: addedThisWeek.toLocaleString("en-IN"), text: "added this week" }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 26px",
        background: "var(--g-green-mint)", border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-md)", padding: "12px 18px", margin: "18px 0 0",
      }}
    >
      {items.map((i) => (
        <span key={i.text} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--g-ink-soft)" }}>
          {i.icon}
          <span><strong style={{ color: "var(--g-ink)", fontWeight: 800 }}>{i.strong}</strong> {i.text}</span>
        </span>
      ))}
    </div>
  );
}

/** Top opportunity areas, as tiles. The mockup used photographs; we publish none, because we have
 *  no licensed image of any of these places and inventing one would be the only dishonest thing on
 *  the page. The tile carries the figure instead, which is what the reader is here for. */
export function AreaTiles({
  title, href, items,
}: { title: string; href?: string; items: Array<{ slug: string; name: string; count: number; href: string }> }) {
  if (items.length < 2) return null;
  return (
    <ModuleShell title={title} moreHref={href} moreLabel="All areas">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {items.map((a) => (
          <Link key={a.slug} href={a.href} style={{ textDecoration: "none", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--g-white)" }}>
            <div style={{ height: 74, background: "linear-gradient(135deg, var(--g-green-mint), #f4f8ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PinIcon size={22} color="var(--g-green-text)" />
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--g-ink)" }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 2 }}>{a.count.toLocaleString("en-IN")} leads</div>
            </div>
          </Link>
        ))}
      </div>
    </ModuleShell>
  );
}

/** The strongest few leads on this page, pulled up as a strip. These are the same businesses that
 *  appear in the list below — it is a shortcut, not extra inventory. */
export function HighIntentStrip({ leads }: { leads: Array<ScoredLead & { masked?: boolean }> }) {
  const picks = leads.filter((l) => l.intent === "high" && !l.masked).slice(0, 4);
  if (picks.length < 3) return null;

  return (
    <section style={{ background: "#fdfaef", border: "1px solid #f2e7c9", borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <ZapIcon size={14} color="#b45309" />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)" }}>Today&rsquo;s highest-intent leads</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {picks.map((l) => (
          <div key={l.id} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: "11px 13px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--g-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.business_name}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", margin: "3px 0 8px" }}>{l.categoryLabel}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--g-ink)" }}>{l.score}</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.3, background: "var(--g-green-mint)", color: "var(--g-green-text)", borderRadius: 999, padding: "3px 7px" }}>
                HIGH INTENT
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Category tiles. Same links as the sidebar, in the shape a reader scanning the list will actually
 *  notice — which is the whole reason the mockup put them here rather than only in the rail. */
export function CategoryTiles({
  title, href, items,
}: { title: string; href?: string; items: Array<{ slug: string; name: string; count: number; href: string }> }) {
  if (items.length < 3) return null;
  return (
    <ModuleShell title={title} moreHref={href} moreLabel="All categories">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {items.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 7, textAlign: "center",
              background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)",
              padding: "14px 10px", textDecoration: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 34, height: 34, borderRadius: 999, background: "var(--g-green-mint)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <CategoryIcon category={c.slug} size={16} color="var(--g-green-text)" />
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g-ink)", lineHeight: 1.25 }}>{c.name}</span>
            <span style={{ fontSize: 11, color: "var(--g-gray-500)" }}>{c.count.toLocaleString("en-IN")} leads</span>
          </Link>
        ))}
      </div>
    </ModuleShell>
  );
}

/** A plain GET form to the login page. It carries the address across as a prefill rather than
 *  posting anywhere, so there is no endpoint to build and nothing is stored by a page that told the
 *  reader it stores nothing. */
export function EmailCapture({ cityName }: { cityName: string }) {
  return (
    <section style={{ background: "var(--g-green-mint)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <div style={{ minWidth: 220 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--g-ink)" }}>
          Get 5 verified {cityName} leads free
        </div>
        <div style={{ fontSize: 12.5, color: "var(--g-gray-500)", marginTop: 2 }}>
          No card required. Contact details included.
        </div>
      </div>
      <form action="/login" method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "1 1 300px", justifyContent: "flex-end" }}>
        <input
          type="email"
          name="email"
          required
          placeholder="Enter your business email"
          aria-label="Email address"
          style={{ flex: "1 1 190px", minWidth: 0, background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 13.5, color: "var(--g-ink)" }}
        />
        <button
          type="submit"
          style={{ background: "var(--g-ink)", color: "#fff", border: 0, borderRadius: "var(--radius-md)", padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Get free leads
        </button>
      </form>
    </section>
  );
}

function ModuleShell({ title, children, moreHref, moreLabel }: {
  title: string; children: React.ReactNode; moreHref?: string; moreLabel?: string;
}) {
  return (
    <section style={{ background: "var(--g-cream)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: "15px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--g-ink)" }}>{title}</span>
        {moreHref && (
          <Link href={moreHref} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: "var(--g-green-text)", textDecoration: "none", whiteSpace: "nowrap" }}>
            {moreLabel} <ChevronRightIcon size={12} color="var(--g-green-text)" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
