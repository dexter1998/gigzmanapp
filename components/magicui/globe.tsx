"use client";

// Magic UI Globe (https://magicui.design/docs/components/globe), adapted: renders only while
// on screen (IntersectionObserver), caps devicePixelRatio at 2, and holds still under
// prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import createGlobe, { type COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

const MOVEMENT_DAMPING = 1400;

export const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
  speed = 0.005,
}: {
  className?: string;
  config?: COBEOptions;
  speed?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(config.phi ?? 0);
  const widthRef = useRef(0);
  const pointerInteracting = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  const r = useMotionValue(0);
  const rs = useSpring(r, { mass: 1, damping: 30, stiffness: 100 });

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  // Only mount the WebGL context while the globe is actually on screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const onResize = () => {
      widthRef.current = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvas, {
      ...config,
      devicePixelRatio: dpr,
      width: widthRef.current * dpr,
      height: widthRef.current * dpr,
      onRender: (state) => {
        if (!reduced && pointerInteracting.current === null) phiRef.current += speed;
        state.phi = phiRef.current + rs.get();
        state.width = widthRef.current * dpr;
        state.height = widthRef.current * dpr;
      },
    });

    const t = setTimeout(() => {
      canvas.style.opacity = "1";
    }, 0);
    return () => {
      clearTimeout(t);
      globe.destroy();
      canvas.style.opacity = "0";
      window.removeEventListener("resize", onResize);
    };
  }, [visible, rs, config, speed]);

  return (
    <div ref={wrapRef} className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-150", className)}>
      <canvas
        className="size-full opacity-0 transition-opacity duration-500 contain-[layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) => updatePointerInteraction(e.clientX)}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  );
}
