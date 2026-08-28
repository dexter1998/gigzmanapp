"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Each slide is a full, self-contained marketing image (already has its own headline/copy/
// branding baked in) — save the 4 real files at these exact paths under public/auth/ and this
// renders them directly; nothing else needs to change once they're in place.
const SLIDES = [
  "/auth/carousel-1.png",
  "/auth/carousel-2.png",
  "/auth/carousel-3.png",
  "/auth/carousel-4.png",
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
