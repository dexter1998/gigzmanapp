"use client";

import { useEffect, useState } from "react";
import { PlansModal } from "./PlansModal";
import { PLANS } from "./plans-config";

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
  }, []);

  if (!profile) return null;

  const planMeta = PLANS.find((p) => p.id === profile.plan);
  const isFree = profile.plan === "free";

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
          {profile.credits} / {profile.credits_limit} Credits
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: isFree ? "var(--g-green)" : "var(--g-green-mint)",
            color: isFree ? "#fff" : "var(--g-green-text)",
          }}
        >
          {isFree ? "Upgrade" : `${planMeta?.name ?? profile.plan} Plan`}
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
