"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Each slide is a full, self-contained marketing image (already has its own headline/copy/
// branding baked in). Only 3 of the intended 4 are in place — the 4th ("Reach the right
// person" / Brewz Cafe) only existed as a landscape hero crop (1536x1024), which would look
// letterboxed next to these portrait ones, so it's left out until a matching portrait crop is
// available. Add "/auth/carousel-4.png" back here once it exists.
const SLIDES = [
  "/auth/carousel-1.png",
  "/auth/carousel-2.png",
  "/auth/carousel-3.png",
];

const AUTOPLAY_MS = 5000;

export function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--g-white)" }}>
        {SLIDES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            style={{ objectFit: "contain", opacity: i === index ? 1 : 0, transition: "opacity 400ms ease" }}
            priority={i === 0}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, alignSelf: "center", paddingTop: 12 }}>
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
              background: i === index ? "var(--g-green-dark)" : "var(--g-border)",
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
