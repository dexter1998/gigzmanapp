"use client";

import Link from "next/link";
import { useRef, type ReactNode, type RefObject } from "react";
import type { COBEOptions } from "cobe";

import { Globe, GLOBE_CONFIG } from "@/components/magicui/globe";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { AnimatedList } from "@/components/magicui/animated-list";
import { BrandLogo } from "@/components/outreach/BrandLogo";
import "./feature-cards.css";

/* ── 1. Find leads: globe centred on India ───────────────────────────────────────────────────── */

// cobe's phi for a longitude: PI - (lon - 90deg). 78E puts India in front; starting 0.5 rad early
// lets the slow spin carry it across the middle of the card.
const INDIA_PHI = Math.PI - ((78 * Math.PI) / 180 - Math.PI / 2) - 0.5;

const INDIA_GLOBE: COBEOptions = {
  ...GLOBE_CONFIG,
  phi: INDIA_PHI,
  theta: 0.32,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 2.4,
  baseColor: [1, 1, 1],
  markerColor: [0.6, 0.8, 0.12],
  glowColor: [1, 1, 1],
  markers: [
    { location: [28.4595, 77.0266], size: 0.09 }, // Gurugram / Delhi
    { location: [19.076, 72.8777], size: 0.1 }, // Mumbai
    { location: [12.9716, 77.5946], size: 0.1 }, // Bengaluru
    { location: [26.9124, 75.7873], size: 0.07 }, // Jaipur
    { location: [18.5204, 73.8567], size: 0.07 }, // Pune
  ],
};

function GlobeArt() {
  return (
    <div className="absolute inset-x-0 top-3 mx-auto h-[280px] w-[280px]">
      <Globe config={INDIA_GLOBE} speed={0.0015} className="max-w-none" />
    </div>
  );
}

/* ── shared bits ─────────────────────────────────────────────────────────────────────────────── */

function MantisMark({ size }: { size: number }) {
  // The wordmark's leading mantis glyph, cropped by background-size (no separate mark asset exists).
  return <span className="fc-mark block" style={{ width: Math.round(size * 0.74), height: size }} aria-hidden />;
}

function Node({ size = 34, children, nodeRef }: { size?: number; children: ReactNode; nodeRef?: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={nodeRef} className="fc-node" style={{ width: size, height: size }}>
      {children}
    </div>
  );
}

/* ── 2. Connect mail: orbiting inbox / channel logos ─────────────────────────────────────────── */

function OrbitArt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Node size={50}>
        <MantisMark size={26} />
      </Node>
      <OrbitingCircles radius={42} iconSize={30} duration={16} path>
        <Node size={30}><BrandLogo brand="gmail" size={15} /></Node>
        <Node size={30}><BrandLogo brand="microsoft" size={14} /></Node>
        <Node size={30}><BrandLogo brand="whatsapp" size={15} /></Node>
      </OrbitingCircles>
      <OrbitingCircles radius={72} iconSize={30} duration={26} reverse path>
        <Node size={30}><BrandLogo brand="google-color" size={15} /></Node>
        <Node size={30}><BrandLogo brand="imap" size={15} /></Node>
        <Node size={30}><BrandLogo brand="hubspot" size={15} /></Node>
        <Node size={30}><BrandLogo brand="zoho" size={15} /></Node>
      </OrbitingCircles>
    </div>
  );
}

/* ── 3. Outreach: leads → Mantis → channels ──────────────────────────────────────────────────── */

const LEADS = [
  { initials: "SD", bg: "#eef2ff", fg: "#3b4a8f" },
  { initials: "AR", bg: "#fdf2e9", fg: "#9a4a12" },
  { initials: "KB", bg: "#eef7f2", fg: "#2f6b4a" },
];

function LeadNode({ lead, nodeRef }: { lead: (typeof LEADS)[number]; nodeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <Node size={32} nodeRef={nodeRef}>
      <span className="flex size-full items-center justify-center rounded-full text-[10px] font-bold" style={{ background: lead.bg, color: lead.fg }}>
        {lead.initials}
      </span>
    </Node>
  );
}

function BeamArt() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const l0 = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLDivElement>(null);
  const l2 = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLDivElement>(null);
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const beam = { duration: 2, repeatDelay: 0, ease: "easeInOut" as const, pathColor: "#8a8f86", pathOpacity: 0.16, pathWidth: 2, gradientStartColor: "#a8d51e", gradientStopColor: "#3f6420" };

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-between px-6">
      <div className="flex flex-col gap-4">
        <LeadNode lead={LEADS[0]} nodeRef={l0} />
        <LeadNode lead={LEADS[1]} nodeRef={l1} />
        <LeadNode lead={LEADS[2]} nodeRef={l2} />
      </div>
      <Node size={52} nodeRef={centerRef}>
        <MantisMark size={28} />
      </Node>
      <div className="flex flex-col gap-4">
        <Node size={32} nodeRef={r0}><BrandLogo brand="gmail" size={15} /></Node>
        <Node size={32} nodeRef={r1}><BrandLogo brand="whatsapp" size={15} /></Node>
        <Node size={32} nodeRef={r2}><BrandLogo brand="voice" size={15} /></Node>
      </div>

      {/* Written out rather than mapped: the React Compiler lint rejects refs read from an array during render. */}
      <AnimatedBeam containerRef={containerRef} fromRef={l0} toRef={centerRef} curvature={18} delay={0} {...beam} />
      <AnimatedBeam containerRef={containerRef} fromRef={l1} toRef={centerRef} delay={0.45} {...beam} />
      <AnimatedBeam containerRef={containerRef} fromRef={l2} toRef={centerRef} curvature={-18} delay={0.9} {...beam} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={r0} curvature={-18} delay={0.9} {...beam} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={r1} delay={1.35} {...beam} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={r2} curvature={18} delay={1.8} {...beam} />
    </div>
  );
}

/* ── 4. Book meetings: notifications streaming in ────────────────────────────────────────────── */

const ICONS = {
  meeting: { bg: "var(--g-green-mint)", stroke: "#3f6420", d: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 14l2 2 4-4" },
  reply: { bg: "#eef2ff", stroke: "#3b4a8f", d: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5" },
  call: { bg: "#fdf2e9", stroke: "#9a4a12", d: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" },
} as const;

type Note = { kind: keyof typeof ICONS; title: string; sub: string; time: string };

const NOTES: Note[] = [
  { kind: "meeting", title: "Meeting booked", sub: "Dr. Sharma Dental · Tue 11:00", time: "now" },
  { kind: "reply", title: "Interested reply", sub: "ABC Realty · “Please share pricing”", time: "2m" },
  { kind: "call", title: "Call answered", sub: "Gupta Sweets · 2 min", time: "4m" },
  { kind: "reply", title: "WhatsApp reply", sub: "Kapoor Interiors · “Call kar lijiye”", time: "6m" },
  { kind: "meeting", title: "Meeting booked", sub: "Verma Physio Clinic · Thu 16:30", time: "9m" },
  { kind: "call", title: "Call answered", sub: "Sai Caterers · 3 min", time: "12m" },
];

function NoteRow({ n }: { n: Note }) {
  const icon = ICONS[n.kind];
  return (
    <div className="fc-note">
      <span className="fc-note-icon" style={{ background: icon.bg }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={icon.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={icon.d} />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="fc-note-title block">{n.title}</span>
        <span className="fc-note-sub block">{n.sub}</span>
      </span>
      <span className="fc-note-time">{n.time}</span>
    </div>
  );
}

function ListArt() {
  return (
    <div
      className="absolute inset-0 overflow-hidden px-4 pt-3"
      style={{ maskImage: "linear-gradient(180deg, #000 70%, transparent)", WebkitMaskImage: "linear-gradient(180deg, #000 70%, transparent)" }}
    >
      <AnimatedList delay={1600} visible={4} className="gap-2">
        {NOTES.map((n) => (
          <NoteRow key={`${n.title}-${n.sub}`} n={n} />
        ))}
      </AnimatedList>
    </div>
  );
}

/* ── cards ───────────────────────────────────────────────────────────────────────────────────── */

const CARDS: { kicker: string; title: string; desc: string; art: () => ReactNode; cta: string; href: string; primary?: boolean }[] = [
  { kicker: "Discover", title: "Find leads", desc: "Local businesses that match your ideal customer.", art: GlobeArt, cta: "Find leads", href: "/chat?start=find", primary: true },
  { kicker: "Connect", title: "Connect mail", desc: "Send from your own Gmail or Outlook · WhatsApp soon.", art: OrbitArt, cta: "Connect", href: "/integrations" },
  { kicker: "Outreach", title: "Outreach via Mantis", desc: "Email and AI calls, one campaign · WhatsApp soon.", art: BeamArt, cta: "Start outreach", href: "/campaigns" },
  { kicker: "Meetings", title: "Book meetings", desc: "Replies and booked calls land in one inbox.", art: ListArt, cta: "View inbox", href: "/inbox" },
];

export function FeatureCards() {
  return (
    <section className="fc-wrap" aria-label="What Mantis can do">
      <div className="fc-row">
        {CARDS.map(({ kicker, title, desc, art: Art, cta, href, primary }) => (
          <article key={title} className="fc-card">
            <p className="fc-kicker">{kicker}</p>
            <h2 className="fc-title">{title}</h2>
            <p className="fc-desc">{desc}</p>
            <div className="fc-art" aria-hidden>
              <Art />
            </div>
            <Link href={href} className={primary ? "fc-btn fc-btn--primary" : "fc-btn"}>
              {cta}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
