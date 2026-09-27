"use client";

import { useEffect, useRef } from "react";
import { XIcon } from "@/components/icons";
import type { PopupContent } from "@/lib/popups";
import { TEMPLATES, CARD_RADIUS_PX } from "./PopupTemplates";
import { useMounted } from "./useMounted";

/**
 * The popup shell — everything that is true of every popup regardless of what it says or how it is
 * arranged: the backdrop, the card, the close affordance, focus, Escape, and the body scroll lock.
 *
 * Templates never reimplement any of this, which is why adding a layout stays cheap.
 */
export function PopupModal({ popup, onClose }: { popup: PopupContent; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Nothing is rendered server-side. PopupHost already gates on this, but a popup that is hoisted
  // into some other page later must not become a hydration mismatch because the meme it drew at
  // random differs between the two passes — so the guarantee lives on the modal itself.
  const mounted = useMounted();
  const Template = TEMPLATES[popup.template ?? "meme-hero"];

  useEffect(() => {
    // Until mounted this component renders nothing, so there is no card to focus and no scroll to
    // lock — the effect has to wait for the second pass rather than run against a null ref.
    if (!mounted) return;
    // Focus the card itself, not the CTA: the modal is uninvited, so the first key a person presses
    // should not spend their credits. Focusing the card (rather than the close button) also keeps a
    // browser focus ring off a control nobody asked to highlight, while still moving the tab order
    // and screen-reader cursor inside the dialog.
    cardRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !cardRef.current) return;
      // Minimal focus trap: Tab cycles inside the card instead of walking into the dashboard
      // behind it, which is still fully rendered and would otherwise be reachable but unusable.
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, mounted]);

  if (!mounted) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 120,
        // Darker than the app's other modals on purpose: this one sits over a live map, and a 50%
        // scrim leaves enough pin contrast showing through to compete with the card.
        background: "rgba(16, 18, 20, 0.62)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "clamp(12px, 4vw, 24px)", overflowY: "auto",
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={[popup.headerAccent, popup.header].filter(Boolean).join(" ")}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", margin: "auto",
          // min() rather than a media query: the card is 480px on a desktop and exactly the
          // viewport minus its padding on a phone, with nothing in between to get wrong.
          width: "min(480px, 100%)",
          background: "var(--g-white)", borderRadius: CARD_RADIUS_PX,
          boxShadow: "0 24px 60px rgba(16, 18, 20, 0.28)", outline: "none",
          padding: "clamp(16px, 4.5vw, 20px)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 14, width: 28, height: 28, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", borderRadius: "var(--radius-pill)", background: "transparent",
            cursor: "pointer",
          }}
        >
          <XIcon size={18} />
        </button>

        <Template popup={popup} onClose={onClose} />
      </div>
    </div>
  );
}
