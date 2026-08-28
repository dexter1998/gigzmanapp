"use client";

import { XIcon } from "@/components/icons";

/** Dismissible "we're having a temporary issue" popup — shown when a response signals an
 * external API (Places/Geocoding/Bedrock/...) failed, as opposed to a normal empty/ambiguous
 * result. Unlike this page's other auto-dismissing status pills, this one has a real close
 * button since it's reporting a real outage, not routine throttling. */
export function MaintenanceBanner({
  message = "We're having a temporary issue with one of our services — please check back in a few minutes.",
  onClose,
}: {
  message?: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 440,
        background: "var(--g-ink)",
        color: "#fff",
        padding: "12px 14px 12px 16px",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-toolbar)",
      }}
    >
      <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "rgba(255,255,255,0.12)",
          borderRadius: "50%",
          cursor: "pointer",
        }}
      >
        <XIcon size={11} color="#fff" />
      </button>
    </div>
  );
}
