"use client";

import { DownloadIcon } from "@/components/icons";

/** Hands the invoice to the browser's print dialog, where "Save as PDF" produces a real,
 * selectable-text document. Client-only because window.print() has no server equivalent. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 18px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: "var(--g-ink)",
        color: "#fff",
        fontSize: 13.5,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <DownloadIcon color="#fff" size={15} /> Download PDF
    </button>
  );
}
