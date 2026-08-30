"use client";

import { useEffect, useState } from "react";
import { PlansModal } from "./PlansModal";

type Profile = { plan: string; credits: number; credits_limit: number };

export function CreditsIndicator() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/user/profile");
    const data = await res.json();
    setProfile(data.profile);
  }

  useEffect(() => {
    load();
    // Other parts of the app (e.g. "Add to leads" on the map card) spend a credit through their
    // own API call, not through this component — they signal a refresh via this event instead of
    // needing a shared store/context just for one number.
    const onCreditsChanged = () => load();
    const onOpenPlans = () => setOpen(true);
    window.addEventListener("gigzman:credits-changed", onCreditsChanged);
    window.addEventListener("gigzman:open-plans", onOpenPlans);
    return () => {
      window.removeEventListener("gigzman:credits-changed", onCreditsChanged);
      window.removeEventListener("gigzman:open-plans", onOpenPlans);
    };
  }, []);

  if (!profile) return null;

  // No plan tiers to name any more — everyone is on the free allowance and tops up with credit
  // packs, so the pill shows the balance and the action, not a tier label.
  const low = profile.credits < 50;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid var(--g-border)",
          background: "var(--g-white)",
          borderRadius: "var(--radius-pill)",
          padding: "6px 6px 6px 12px",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--g-ink)" }}>
          {profile.credits.toLocaleString("en-IN")} credits
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: low ? "var(--g-green)" : "var(--g-green-mint)",
            color: low ? "#fff" : "var(--g-green-text)",
          }}
        >
          Add credits
        </span>
      </button>

      <PlansModal
        open={open}
        onClose={() => setOpen(false)}
        currentPlan={profile.plan}
        onPlanChange={() => load()}
      />
    </>
  );
}
