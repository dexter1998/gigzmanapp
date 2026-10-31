"use client";

/**
 * Device mockups for previews: a laptop (16:10 screen, 1280×800 virtual viewport) and an Android
 * phone (Pixel proportions, 412×915 dp). Content is laid out at the device's real size and
 * scaled to the space available, so wrapping and sizes match what a lead actually sees.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Measures its own width; children get the scale that fits a `w`-wide design into it. */
function useFit(w: number, max = 1) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(max, e.contentRect.width / w)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, max]);
  return { ref, scale };
}

export function LaptopFrame({ children, maxWidth = 760 }: { children: ReactNode; maxWidth?: number }) {
  const VW = 1280, VH = 800, BEZEL = 18;
  const { ref, scale } = useFit(VW + BEZEL * 2);
  return (
    <div className="dv-laptop-wrap" ref={ref} style={{ maxWidth }}>
      <div className="dv-laptop" style={{ width: (VW + BEZEL * 2) * scale, height: (VH + BEZEL * 2 + 6) * scale }}>
        <div className="dv-laptop-lid" style={{ padding: BEZEL * scale, borderRadius: 22 * scale }}>
          <i className="dv-laptop-cam" style={{ width: 6 * scale, height: 6 * scale, top: 7 * scale }} />
          <div className="dv-laptop-screen" style={{ width: VW * scale, height: VH * scale, borderRadius: 6 * scale }}>
            <div style={{ width: VW, height: VH, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
          </div>
        </div>
      </div>
      <div className="dv-laptop-base" style={{ width: (VW + BEZEL * 2) * scale * 1.04, height: Math.max(10, 22 * scale) }}><i /></div>
    </div>
  );
}

export function PhoneFrame({ children, width = 300, status = "light" }: { children: ReactNode; width?: number; status?: "light" | "tinted" }) {
  const VW = 412, VH = 915;
  const s = width / VW;
  return (
    <div className="dv-phone" style={{ width: width + 22, height: VH * s + 22, borderRadius: 42 * s + 11 }}>
      <i className="dv-phone-btn power" /><i className="dv-phone-btn vol" />
      <div className="dv-phone-screen" style={{ width, height: VH * s, borderRadius: 38 * s }}>
        <div className={`dv-phone-inner ${status}`} style={{ width: VW, height: VH, transform: `scale(${s})` }}>
          <div className="dv-status"><span>9:41</span><i className="dv-punch" /><span className="dv-status-r">
            <svg width="17" height="12" viewBox="0 0 17 12"><path d="M1 11h2V8H1zm4 0h2V6H5zm4 0h2V3H9zm4 0h2V0h-2z" fill="currentColor" /></svg>
            <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 0 3.3a11.4 11.4 0 0 1 16 0z" fill="currentColor" /></svg>
            <span className="dv-batt"><i /></span></span></div>
          {children}
          <i className="dv-gesture" />
        </div>
      </div>
    </div>
  );
}
