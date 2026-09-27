import Script from "next/script";
import { footerBadges } from "@/lib/badges";

/**
 * The review-platform badges, under the brand block in the footer.
 *
 * Deliberately narrower than the full carousel (`LandingUpvote`): only `footer: true` badges show
 * here (Product Hunt, TheresAnAIForThat) — Startup Fast's "powered by" badge, for instance, lives
 * in the carousel only, per operator instruction 2026-09-21. Product Hunt gives an image, G2 and
 * Capterra give a script that fills a container of their own — both shapes are supported, and
 * neither is faked with a look-alike graphic while the real listing is still pending.
 */
export async function FooterBadges() {
  const badges = await footerBadges();
  if (!badges.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 20 }}>
      {badges.map((b) =>
        b.kind === "image" ? (
          <a key={b.platform} href={b.href} target="_blank" rel="noopener" aria-label={b.alt}>
            {/* Their asset, their dimensions — served from their CDN exactly as they hand it over. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.img} alt={b.alt} width={b.width} height={b.height} style={{ height: 38, width: "auto" }} />
          </a>
        ) : (
          <div key={b.platform}>
            <div id={b.containerId} aria-label={b.alt} />
            {/* afterInteractive: a badge must never sit in front of the page painting. */}
            <Script src={b.src} strategy="afterInteractive" />
          </div>
        ),
      )}
    </div>
  );
}
