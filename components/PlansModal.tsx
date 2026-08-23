"use client";

import { useState } from "react";
import { PLANS } from "./plans-config";
import { PartnerApplicationModal } from "./PartnerApplicationModal";

export function PlansModal({
  open,
  onClose,
  currentPlan,
  onPlanChange,
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
  onPlanChange: (plan: string) => void;
}) {
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  if (!open) return null;

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    try {
      await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      onPlanChange(planId);
    } finally {
      setUpgrading(null);
    }
  }

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--g-ink)", margin: "0 0 4px" }}>Plans</h2>
          <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: "0 0 20px" }}>
            Upgrade any time — no real payment gateway yet, so this just updates your account.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  style={{
                    border: isCurrent ? "2px solid var(--g-green)" : "1px solid var(--g-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--g-ink)" }}>{plan.name}</span>
                      {plan.badge && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "var(--g-amber-tint)", color: "#b45309", borderRadius: 999, padding: "2px 8px" }}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--g-gray-500)", marginTop: 2 }}>{plan.desc}</div>
                    <div style={{ fontSize: 11.5, color: "var(--g-ink-soft)", marginTop: 2, fontWeight: 600 }}>
                      {plan.price} · {plan.credits}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--g-green-text)" }}>Current</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading === plan.id}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-pill)",
                        border: "none",
                        background: "var(--g-green)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {upgrading === plan.id ? "…" : "Choose"}
                    </button>
                  )}
                </div>
              );
            })}

            <div
              style={{
                border: "1px solid var(--g-green)",
                background: "var(--g-green-mint)",
                borderRadius: "var(--radius-sm)",
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--g-ink)" }}>Partner with us</div>
                <div style={{ fontSize: 11.5, color: "var(--g-ink-soft)", marginTop: 2 }}>
                  Get free gigzman portal access. Bring gigzman to your clients as a qualified agency partner.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPartnerOpen(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--g-green)",
                  background: "var(--g-white)",
                  color: "var(--g-green-text)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Become a Partner
              </button>
            </div>
          </div>
        </div>
      </div>

      <PartnerApplicationModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,32,51,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "var(--g-white)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card)",
  padding: 28,
  position: "relative",
  maxHeight: "85vh",
  overflowY: "auto",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "var(--g-gray-500)",
  fontSize: 14,
};
