"use client";

import { useId, useState } from "react";
import {
  CREDIT_COST, CREDIT_PACKS, TOPUP_MAX_RUPEES, TOPUP_MIN_RUPEES, TOPUP_PAISE_PER_CREDIT, TOPUP_QUICK_RUPEES,
  rupees, topupCredits,
} from "@/lib/credits/pricing";

/**
 * "Add funds" — a wallet-style top-up: any whole-rupee amount from ₹50, credited at the flat
 * top-up rate. The credits shown here are only a preview; the server recomputes them from the
 * amount (see /api/payments/order) and never reads a count from the browser.
 *
 * Laid out as a slim ledger strip: amount on the left, what it turns into on the right. Deliberately
 * quieter than the plan cards above it, because a plan is the better deal and the page should say so.
 */
export function AddFunds({
  onTopup,
  busy,
  disabled,
  compact = false,
}: {
  onTopup: (rupees: number) => void;
  busy: boolean;
  disabled: boolean;
  /** Tighter variant for the plans modal. */
  compact?: boolean;
}) {
  const inputId = useId();
  const [raw, setRaw] = useState<string>(String(TOPUP_QUICK_RUPEES[1]));
  const amount = raw === "" ? NaN : Number(raw);
  const credits = topupCredits(amount);
  const tooLow = Number.isFinite(amount) && amount < TOPUP_MIN_RUPEES;
  const tooHigh = Number.isFinite(amount) && amount > TOPUP_MAX_RUPEES;
  const ratePerCredit = TOPUP_PAISE_PER_CREDIT / 100;
  const bestPlanRate = Math.min(...CREDIT_PACKS.map((p) => rupees(p.pricePaise) / p.credits));

  return (
    <section
      aria-label="Add funds"
      style={{
        border: "1px solid var(--g-border)",
        borderRadius: "var(--radius-md)",
        // 1px gap over a rule-coloured background = a hairline between the halves that is right
        // whether they sit side by side or stack on a phone.
        background: "var(--g-border)",
        display: "grid",
        gap: 1,
        gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
        overflow: "hidden",
      }}
    >
      {/* amount */}
      <div style={{ padding: compact ? 16 : "20px 24px", background: "var(--g-white)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <label htmlFor={inputId} style={{ fontSize: 14, fontWeight: 600, color: "var(--g-ink)" }}>Amount</label>
          <span style={{ fontSize: 12, color: "var(--g-gray-500)" }} title="Top-ups add credits only. They don't start or extend a plan.">
            ₹{ratePerCredit.toFixed(2)}/credit · no plan change
          </span>
        </div>

        <div
          style={{
            display: "flex", alignItems: "center", marginTop: 12, height: 44, padding: "0 12px",
            border: `1px solid ${tooLow || tooHigh ? "var(--g-red)" : "var(--g-gray-300)"}`, borderRadius: "var(--radius-sm)",
            background: "var(--g-white)",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 500, color: "var(--g-gray-500)", marginRight: 6 }}>₹</span>
          <input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            onKeyDown={(e) => { if (e.key === "Enter" && credits !== null && !disabled) onTopup(amount); }}
            placeholder={String(TOPUP_MIN_RUPEES)}
            aria-invalid={tooLow || tooHigh}
            aria-describedby={`${inputId}-hint`}
            style={{
              flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit",
              fontSize: 17, fontWeight: 600, color: "var(--g-ink)", fontVariantNumeric: "tabular-nums", padding: 0,
            }}
          />
        </div>

        <div role="group" aria-label="Quick amounts" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {TOPUP_QUICK_RUPEES.map((r) => {
            const on = amount === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRaw(String(r))}
                aria-pressed={on}
                style={{
                  height: 28, padding: "0 12px", borderRadius: "var(--radius-pill)", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums",
                  border: `1px solid ${on ? "var(--g-ink)" : "var(--g-border)"}`,
                  background: on ? "var(--g-ink)" : "var(--g-white)",
                  color: on ? "var(--g-white)" : "var(--g-ink)",
                }}
              >
                ₹{r.toLocaleString("en-IN")}
              </button>
            );
          })}
        </div>

        <p id={`${inputId}-hint`} style={{ fontSize: 12, margin: "12px 0 0", color: tooLow || tooHigh ? "var(--g-red-text)" : "var(--g-gray-500)" }}>
          {tooLow
            ? `Minimum ₹${TOPUP_MIN_RUPEES}`
            : tooHigh
              ? `Maximum ₹${TOPUP_MAX_RUPEES.toLocaleString("en-IN")}`
              : `Any amount from ₹${TOPUP_MIN_RUPEES} · whole rupees`}
        </p>
      </div>

      {/* what it turns into */}
      <div
        style={{
          padding: compact ? 16 : "20px 24px",
          background: "var(--g-gray-100)",
          display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--g-gray-500)" }}>You get</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 30, lineHeight: "36px", fontWeight: 600, color: credits ? "var(--g-ink)" : "var(--g-gray-300)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {(credits ?? 0).toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize: 13, color: "var(--g-gray-500)" }}>credits</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 4 }}>
            {credits ? `≈ ${Math.floor(credits / CREDIT_COST.lead_unlock).toLocaleString("en-IN")} leads · never expire` : "Never expire"}
          </div>
        </div>

        <div>
          <button
            type="button"
            disabled={disabled || credits === null}
            onClick={() => credits !== null && onTopup(amount)}
            style={{
              width: "100%", height: 36, borderRadius: "var(--radius-sm)", border: "none", fontFamily: "inherit",
              background: "var(--g-ink)", color: "var(--g-white)", fontSize: 14, fontWeight: 500,
              cursor: disabled || credits === null ? "not-allowed" : "pointer", opacity: disabled || credits === null ? 0.5 : 1,
            }}
          >
            {busy ? "Opening…" : credits !== null ? `Add ₹${amount.toLocaleString("en-IN")}` : "Add funds"}
          </button>
          <div style={{ fontSize: 12, color: "var(--g-gray-500)", marginTop: 8, textAlign: "center" }} title="Plans include campaign launching and cost less per credit.">
            Plans from ₹{bestPlanRate.toFixed(2)}/credit
          </div>
        </div>
      </div>
    </section>
  );
}
