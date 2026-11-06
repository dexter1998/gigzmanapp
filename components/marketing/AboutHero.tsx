"use client";

import { useEffect, useRef, useState } from "react";
import "./marketing-extras.css";

/**
 * /company hero: the headline, one line on what Mantis does, and a padlock that opens as the page
 * scrolls — "unlock your revenue" made literal. The section is taller than the screen and its card
 * is sticky, so the first ~340px of scrolling turns the lock instead of moving the page.
 *
 * Progress is read on scroll inside requestAnimationFrame and written to one CSS variable; the SVG
 * does the rest in CSS. With reduced motion the lock simply shows closed and nothing is tracked.
 */
export function AboutHero({ eyebrow }: { eyebrow: string }) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      setP(Math.min(1, Math.max(0, -r.top / travel)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const open = p > 0.55;
  return (
    <section ref={ref} className="ab-hero" style={{ ["--unlock" as string]: p }}>
      <div className="ab-hero-card">
        <div className="ab-hero-grid" aria-hidden="true" />
        <div className="ab-hero-glow" aria-hidden="true" />

        <div className="ab-hero-copy">
          <span className="ab-hero-pill"><span className="ab-hero-dot" />{eyebrow}</span>
          <h1 className="ab-hero-h1">
            Unlock your <span className="ab-hero-grad">revenue</span>
            <br />
            get your <span className="ab-hero-grad">first users</span>
          </h1>
          <p className="ab-hero-sub">
            Mantis finds clients near you for your business. You work on the product — Mantis takes care of prospecting and outreach.
          </p>
        </div>

        <div className={`ab-lock${open ? " is-open" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 160 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="ab-lock-svg">
            <defs>
              <linearGradient id="abBody" x1="80" y1="55" x2="80" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#dcdfd4" />
              </linearGradient>
              <linearGradient id="abTop" x1="80" y1="55" x2="80" y2="78" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <filter id="abBodyF" x="-18%" y="-8%" width="136%" height="136%">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(63,100,32,0.20)" />
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(63,100,32,0.12)" />
              </filter>
              <filter id="abShackleF" x="-60%" y="-50%" width="220%" height="250%">
                <feDropShadow dx="3" dy="8" stdDeviation="9" floodColor="rgba(16,18,20,0.26)" />
              </filter>
            </defs>
            <g className="ab-shackle">
              <path d="M116,78 L116,40 Q116,6 80,6 Q44,6 44,40 L44,78" stroke="#648b1c" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" filter="url(#abShackleF)" />
              <path d="M116,78 L116,40 Q116,6 80,6 Q44,6 44,40 L44,78" stroke="rgba(30,50,10,0.42)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M108,74 L108,42 Q108,14 80,14 Q52,14 52,42 L52,74" stroke="rgba(10,16,4,0.22)" strokeWidth="6" strokeLinecap="round" />
              <path d="M116,78 L116,40 Q116,6 80,6 Q44,6 44,40 L44,78" stroke="rgba(255,255,255,0.28)" strokeWidth="7" strokeLinecap="round" />
            </g>
            <g filter="url(#abBodyF)">
              <rect x="8" y="62" width="144" height="84" rx="22" fill="url(#abBody)" />
              <rect x="8" y="62" width="144" height="28" rx="22" fill="url(#abTop)" />
              <line x1="30" y1="140" x2="130" y2="140" stroke="rgba(140,140,130,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <ellipse cx="44" cy="74" rx="13" ry="12" fill="#bcbfb4" />
            <ellipse cx="44" cy="74" rx="9" ry="8.5" fill="#a4a79c" />
            <ellipse cx="116" cy="74" rx="13" ry="12" fill="#bcbfb4" />
            <ellipse cx="116" cy="74" rx="9" ry="8.5" fill="#a8ab9f" />
            <path className="ab-bolt" d="M89,76 L66,110 L80,110 L71,136 L100,100 L85,100 Z" fill="#648b1c" />
          </svg>
        </div>

        <div className="ab-hero-scroll" aria-hidden="true">
          <span>{open ? "Unlocked" : "Scroll to unlock"}</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="5.5" y="0.5" width="5" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="8" cy="4" r="1.5" fill="#648b1c"><animate attributeName="cy" values="4;7;4" dur="1.6s" repeatCount="indefinite" /></circle>
            <path d="M4 16l4 5 4-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
