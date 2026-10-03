"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORY_STYLES, type PopupContent, type PopupTemplate } from "@/lib/popups";
import { ArrowRightIcon, ShuffleIcon } from "@/components/icons";

/**
 * Templates: the only place popup LAYOUT lives.
 *
 * Every template receives the same `PopupContent` and decides where the fields go. That is what
 * lets a second layout (say, a compact no-media variant) ship without editing a single existing
 * popup's content — and what stops "we need a different arrangement" from becoming a fork of the
 * modal shell, the dismissal logic and the scroll lock along with it.
 */
export type TemplateProps = { popup: PopupContent; onClose: () => void };

/** Sizes come from the approved spec sheet rather than --radius-*: the tokens were deliberately
 *  halved for the dense dashboard surfaces, and a hero modal is the one place that reads too tight
 *  at 11px. Kept as named constants so a future template can reuse or override them explicitly. */
const CARD_RADIUS = 16;
const MEDIA_RADIUS = 12;
// 260, not the spec sheet's 220: inside a 480px card with 20px padding the asset gets 440px of
// width, and a 16:9 meme at that width is 247px tall — capping at 220 would have pillarboxed every
// standard-ratio GIF with white gutters. 260 lets 16:9 fill the width edge to edge and still stops
// a portrait asset from taking over the modal.
const MEDIA_MAX_HEIGHT = 260;

/**
 * meme-hero — badge, then the asset at full width, then the words.
 *
 * The GIF is rendered untouched: `object-fit: contain` inside a fixed-height box, so a wider or
 * taller asset than expected letterboxes instead of cropping. A meme with its punchline at the
 * edge of the frame survives; one that got centre-cropped would not, and nobody would notice until
 * the campaign was already out.
 */
function MemeHero({ popup, onClose }: TemplateProps) {
  const style = CATEGORY_STYLES[popup.category];
  const { Icon } = style;
  const pool = popup.media ?? [];
  // Which meme this opening drew. Random per mount, so a popup with a pool is a different joke each
  // time it appears rather than the same one growing stale.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * Math.max(pool.length, 1)));
  // A missing or moved asset is skipped rather than left as a broken-image icon where the joke was
  // meant to be — and if every asset in the pool is gone, the media box drops out entirely and the
  // rest of the popup still reads as written.
  const [failed, setFailed] = useState<number[]>([]);

  const usable = pool.map((_, i) => i).filter((i) => !failed.includes(i));
  const current = usable.includes(index) ? index : usable[0];
  const media = current === undefined ? undefined : pool[current];

  /** Draw a different one. Never the current pick, so the button always visibly does something. */
  const shuffle = () => {
    const others = usable.filter((i) => i !== current);
    if (others.length === 0) return;
    setIndex(others[Math.floor(Math.random() * others.length)]);
  };

  return (
    <>
      {/* Badge — centred, sized off the close button's row so the two read as one header line. */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 16px",
            borderRadius: "var(--radius-pill)", background: style.tint, color: style.ink,
            fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          <Icon color={style.ink} size={16} />
          {popup.badgeLabel ?? style.label}
        </span>
      </div>

      {media && (
        <div
          style={{
            position: "relative", display: "flex", justifyContent: "center", width: "100%",
            borderRadius: MEDIA_RADIUS, overflow: "hidden", marginBottom: 20,
          }}
        >
          {/* Deliberately a plain <img>, not next/image: these are animated GIFs, and the optimizer
              re-encodes them to a still first frame. The asset ships exactly as uploaded. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            // Keyed on the src so a shuffle swaps the element rather than reusing one that is
            // mid-animation — without it the browser can hold the old GIF's last painted frame.
            key={media.src}
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            onError={() => setFailed((f) => (current === undefined || f.includes(current) ? f : [...f, current]))}
            // Height follows the asset up to a ceiling, rather than the box imposing one: a 16:9
            // meme fills the width with no letterbox bars, and a taller one shrinks to fit instead
            // of being cropped. `contain` is the guarantee that nothing is ever cut off.
            style={{
              width: "100%", height: "auto", maxHeight: MEDIA_MAX_HEIGHT,
              objectFit: "contain", display: "block",
            }}
          />
          {usable.length > 1 && (
            <button
              type="button"
              onClick={shuffle}
              aria-label="Show a different meme"
              title="Show a different meme"
              style={{
                position: "absolute", right: 8, bottom: 8, width: 30, height: 30, padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", borderRadius: "var(--radius-pill)", cursor: "pointer",
                // Dark scrim rather than a solid chip: it has to sit legibly on whatever frame the
                // GIF happens to be showing underneath it, which is not a colour we control.
                background: "rgba(16, 18, 20, 0.55)",
              }}
            >
              <ShuffleIcon size={15} />
            </button>
          )}
        </div>
      )}

      <h2
        style={{
          margin: "0 0 10px", textAlign: "center", fontSize: "clamp(20px, 5.5vw, 24px)",
          lineHeight: "1.2", fontWeight: 600, color: "var(--g-ink)", letterSpacing: "-0.01em",
        }}
      >
        {popup.headerAccent && <span style={{ color: "var(--g-green-dark)" }}>{popup.headerAccent} </span>}
        {popup.header}
      </h2>

      <p
        style={{
          margin: "0 0 20px", textAlign: "center", fontSize: "clamp(13.5px, 3.6vw, 15px)",
          lineHeight: "21px", color: "var(--g-gray-500)",
        }}
      >
        {popup.subheader}
      </p>

      <PopupCtaButton popup={popup} onClose={onClose} />

      {popup.ps && (
        <p
          style={{
            margin: "10px 0 0", minHeight: 40, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
            background: style.tint, color: "var(--g-ink-soft)", fontSize: "clamp(12.5px, 3.3vw, 14px)",
            lineHeight: "18px", textAlign: "center",
          }}
        >
          {popup.ps}
        </p>
      )}
    </>
  );
}

/** Shared by every template: a CTA is a link when it goes somewhere and a button when it doesn't,
 *  rather than a div that listens for clicks — middle-click, keyboard and "open in new tab" all
 *  keep working, and a CTA with no href is honestly a dismiss. */
function PopupCtaButton({ popup, onClose }: TemplateProps) {
  const visual: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", height: 48, borderRadius: 12, border: "none", cursor: "pointer",
    background: "var(--g-green-dark)", color: "#fff", fontFamily: "inherit",
    fontSize: "clamp(14.5px, 3.8vw, 16px)", fontWeight: 600, textDecoration: "none",
  };

  if (!popup.cta.href) {
    return (
      <button type="button" onClick={onClose} style={visual}>
        {popup.cta.label} <ArrowRightIcon />
      </button>
    );
  }
  if (popup.cta.external) {
    return (
      <a href={popup.cta.href} target="_blank" rel="noreferrer" onClick={onClose} style={visual}>
        {popup.cta.label} <ArrowRightIcon />
      </a>
    );
  }
  return (
    <Link href={popup.cta.href} onClick={onClose} style={visual}>
      {popup.cta.label} <ArrowRightIcon />
    </Link>
  );
}

export const TEMPLATES: Record<PopupTemplate, (props: TemplateProps) => React.ReactNode> = {
  "meme-hero": MemeHero,
};

export const CARD_RADIUS_PX = CARD_RADIUS;
