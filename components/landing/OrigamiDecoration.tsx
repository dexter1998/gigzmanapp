/** Low-opacity faceted paper-fold shapes used as background texture across the landing page's
 * sections — matches the reference design's recurring origami motif (tying back to the mantis
 * mark itself). Purely decorative: aria-hidden, pointer-events none, never carries content.
 *
 * The provided origami-corner.png reference asset has a checkerboard baked into its pixels
 * instead of a real alpha channel (no transparency), so it can't be dropped in as-is without
 * showing that checkerboard on the live page — this SVG stays in place until a properly
 * exported (real-alpha) version is provided. */
export function OrigamiDecoration({
  variant = "corner-left",
  opacity = 0.5,
}: {
  variant?: "corner-left" | "corner-right" | "scattered";
  opacity?: number;
}) {
  if (variant === "scattered") {
    return (
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity, zIndex: 0 }}
        preserveAspectRatio="none"
      >
        <circle cx="6%" cy="18%" r="3" fill="var(--g-green)" opacity="0.35" />
        <circle cx="94%" cy="14%" r="3" fill="var(--g-green)" opacity="0.3" />
        <circle cx="12%" cy="70%" r="2.5" fill="var(--g-green)" opacity="0.3" />
        <circle cx="90%" cy="62%" r="2.5" fill="var(--g-green)" opacity="0.3" />
      </svg>
    );
  }

  const flip = variant === "corner-right";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      style={{
        position: "absolute",
        bottom: 0,
        [flip ? "right" : "left"]: 0,
        width: 340,
        height: 260,
        pointerEvents: "none",
        opacity,
        zIndex: 0,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      preserveAspectRatio="xMinYMax meet"
    >
      <polygon points="0,300 120,140 200,300" fill="var(--g-ink)" opacity="0.04" />
      <polygon points="120,140 200,300 260,190" fill="var(--g-ink)" opacity="0.06" />
      <polygon points="0,300 120,140 0,90" fill="var(--g-ink)" opacity="0.03" />
      <polygon points="200,300 260,190 340,300" fill="var(--g-ink)" opacity="0.05" />
    </svg>
  );
}
