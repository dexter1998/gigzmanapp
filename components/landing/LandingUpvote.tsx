import { liveBadges, type Badge } from "@/lib/badges";

type ImageBadge = Extract<Badge, { kind: "image" }>;

/**
 * "Upvote us on ..." — a card-style logo carousel for platforms Mantis Ai is genuinely live on,
 * placed right above the FAQ. Distinct from `LandingDirectories` (a quieter text strip further up
 * the page): this one is a deliberate conversion ask, so it only ever shows an actual review-
 * platform embed (`liveBadges()`, the same source `FooterBadges` uses) — never a placeholder logo
 * for a platform we're not really listed on yet. It grows on its own as more listings go live.
 *
 * Loops only once there's enough content to loop convincingly (4+, duplicated for a seamless
 * scroll, same technique as the directory strip); fewer than that renders as a static centered
 * row rather than an unconvincing 2-card marquee.
 */
export async function LandingUpvote() {
  const badges = (await liveBadges()).filter((b): b is ImageBadge => b.kind === "image");
  if (!badges.length) return null;

  const loop = badges.length >= 4;
  const strip = loop ? [...badges, ...badges] : badges;

  return (
    <section aria-label="Upvote us" style={{ padding: "64px 0", textAlign: "center", overflow: "hidden" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--g-gray-500)", margin: "0 0 28px", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--g-red)" aria-hidden="true">
            <path d="M12 3 L22 20 L2 20 Z" />
          </svg>
          Upvote us on
        </h2>

        <div
          className={loop ? "mantis-dir-marquee" : undefined}
          style={loop ? {
            position: "relative",
            maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          } : { display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 20 }}
        >
          <ul
            className={loop ? "mantis-dir-track" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 20, listStyle: "none",
              margin: 0, padding: "4px 0", width: loop ? "max-content" : undefined,
            }}
          >
            {strip.map((b, i) => (
              <li key={`${b.platform}-${i}`} aria-hidden={loop && i >= badges.length}>
                <a
                  href={b.href} target="_blank" rel="noopener" aria-label={b.alt}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minHeight: 60, minWidth: 140, padding: "6px 8px",
                    background: "#fff", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt={b.alt} width={b.width} height={b.height} style={{ height: 48, width: "auto" }} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
