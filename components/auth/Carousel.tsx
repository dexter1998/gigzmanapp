"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Each slide is a full, self-contained marketing image (already has its own headline/copy/
// branding baked in) — all 4, matching portrait dimensions (1003x1568).
const SLIDES = [
  "/auth/carousel-1.png",
  "/auth/carousel-2.png",
  "/auth/carousel-3.png",
  "/auth/carousel-4.png",
];

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
      {SLIDES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          style={{ objectFit: "cover", opacity: i === index ? 1 : 0, transition: "opacity 400ms ease" }}
          priority={i === 0}
        />
      ))}

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
