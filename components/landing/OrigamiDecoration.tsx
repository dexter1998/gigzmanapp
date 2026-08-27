import Image from "next/image";

/** Low-opacity faceted paper-fold shapes used as background texture across the landing page's
 * sections — matches the reference design's recurring origami motif (tying back to the mantis
 * mark itself). Purely decorative: aria-hidden, pointer-events none, never carries content.
 *
 * Real, properly-exported (alpha-channel) assets — corner-left/corner-right are distinct photos,
 * not mirrored copies of one image; "wide" is a full-width band for hero/CTA floors. */
const SOURCES = {
  "corner-left": { src: "/landing/origami-corner-left.png", width: 1152, height: 768 },
  "corner-right": { src: "/landing/origami-corner-right.png", width: 1254, height: 706 },
  wide: { src: "/landing/origami-wide-fade.png", width: 2048, height: 768 },
} as const;

export function OrigamiDecoration({
  variant = "corner-left",
  opacity = 0.9,
  width = 560,
}: {
  variant?: "corner-left" | "corner-right" | "wide";
  opacity?: number;
  width?: number | string;
}) {
  const source = SOURCES[variant];

  if (variant === "wide") {
    return (
      <Image
        aria-hidden="true"
        alt=""
        src={source.src}
        width={source.width}
        height={source.height}
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", pointerEvents: "none", opacity, zIndex: 0 }}
      />
    );
  }

  const flip = variant === "corner-right";
  return (
    <Image
      aria-hidden="true"
      alt=""
      src={source.src}
      width={source.width}
      height={source.height}
      style={{
        position: "absolute",
        bottom: 0,
        [flip ? "right" : "left"]: 0,
        width,
        height: "auto",
        pointerEvents: "none",
        opacity,
        zIndex: 0,
      }}
    />
  );
}
