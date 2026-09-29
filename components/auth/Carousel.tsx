"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Each slide is a full, self-contained marketing image (already has its own headline/copy/
// branding baked in) — all 4, matching portrait dimensions (1003x1568).
//
// WebP, not the original PNGs. The four PNGs were 6.08MB between them for a 1003x1568 image —
// roughly 1.2 bytes per pixel, carrying an alpha channel these full-bleed slides never used. Next's
// optimizer did produce a ~110KB WebP from each, but it had to read and transcode the full 1.8MB
// source to do it, and App Runner's image cache is per-instance and does not survive a deploy, so
// that transcode was paid again on every cold miss. That is what made the panel take seconds to
// appear, not the bytes on the wire. Re-encoded at source they total 0.34MB — a 94% reduction — and
// the optimizer's work becomes trivial.
const SLIDES = [
  "/auth/carousel-1.webp",
  "/auth/carousel-2.webp",
  "/auth/carousel-3.webp",
  "/auth/carousel-4.webp",
];

/** The panel is half the split layout on desktop and full width below it. Without this, `fill` makes
 *  Next assume 100vw and pick the widest srcset entry at every viewport. */
const SIZES = "(max-width: 900px) 100vw, 50vw";

const AUTOPLAY_MS = 7500; // 1.5x the original 5s

// Fills the whole left panel edge-to-edge with zero cropping and zero gap — aspect-ratio is
// locked to the slides' own real dimensions (1003x1568, identical across all 4), so the panel's
// computed height always exactly matches what the images need, at any card width. object-fit:
// cover is still set as a safety net (in case a future slide has a slightly different ratio),
// but with a matching aspect-ratio it never actually needs to crop anything.
export function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1003 / 1568" }}>
      {/* Only the current slide and the one after it are mounted. All four used to be in the DOM at
          once and, being absolutely positioned inside the viewport, all four fetched on first paint
          however they were flagged — so the page paid for every slide before showing one. Mounting
          the next one early is what keeps the crossfade instant. */}
      {SLIDES.map((src, i) => {
        if (i !== index && i !== (index + 1) % SLIDES.length) return null;
        return (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes={SIZES}
            style={{ objectFit: "cover", opacity: i === index ? 1 : 0, transition: "opacity 400ms ease" }}
            priority={i === 0}
          />
        );
      })}

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, display: "flex", gap: 6, justifyContent: "center" }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 20 : 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: i === index ? "var(--g-green-dark)" : "rgba(255,255,255,0.7)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              cursor: "pointer",
              transition: "width 200ms",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
