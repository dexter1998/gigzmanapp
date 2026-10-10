"use client";

import { useEffect, useRef, useState } from "react";
import type { Quote } from "./queries";

/**
 * The one interactive piece on the page, so the only client component.
 *
 * Scroll-snap does the paging rather than transforms: it gives native touch inertia on a phone,
 * keeps the whole list in the DOM for anyone reading with a screen reader, and degrades to a
 * plain horizontal scroller if the JS never runs. The dots just reflect scroll position.
 */
export function Quotes({ items }: { items: Quote[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const card = el.firstElementChild as HTMLElement | null;
        if (!card) return;
        const w = card.offsetWidth + 16;
        setActive(Math.round(el.scrollLeft / w));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollTo({ left: i * (card.offsetWidth + 16), behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="lv-quotes">
      <ul className="lv-quote-track" ref={track}>
        {items.map((q, i) => (
          <li key={i} className="lv-quote">
            <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden className="lv-quote-mark">
              <path d="M0 18V9.6C0 4.3 3 .9 8.3 0l.9 2.9C6.4 3.7 5 5.3 5 7.6h3.4V18H0Zm12.8 0V9.6c0-5.3 3-8.7 8.3-9.6l.9 2.9c-2.8.8-4.2 2.4-4.2 4.7H21V18h-8.2Z" fill="currentColor" />
            </svg>
            <p>{q.text}</p>
            <footer>
              <span className="lv-quote-name">{q.name}</span>
              {q.place && <span className="lv-quote-place">{q.place}</span>}
            </footer>
          </li>
        ))}
      </ul>
      <div className="lv-dots" role="tablist" aria-label="Partnership messages">
        {items.map((_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === active}
            aria-label={`Message ${i + 1} of ${items.length}`}
            className={i === active ? "is-on" : ""} onClick={() => go(i)} />
        ))}
      </div>
    </div>
  );
}
