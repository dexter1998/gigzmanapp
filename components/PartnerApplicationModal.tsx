"use client";

import { XIcon } from "./icons";
import { PartnerApplicationForm } from "./partner/PartnerApplicationForm";

/**
 * The in-dashboard "Partner with us" entry point. It is now only a shell — the questions, the
 * stepper and the submitted payload all come from the same PartnerApplicationForm the public
 * /partner page renders, so the two surfaces can't drift into asking different things and
 * producing rows that need different triage.
 */
export function PartnerApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close">
          <XIcon />
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>Partner with us</h2>
        <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 20px", maxWidth: 440 }}>
          Bring Mantis Ai to your clients. Approved agency partners get free portal access and partner lead credits.
        </p>

        <PartnerApplicationForm variant="modal" onDone={onClose} />
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,32,51,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "var(--g-white)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card)",
  padding: 28,
  position: "relative",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  border: "none",
  background: "none",
  cursor: "pointer",
  display: "flex",
};
