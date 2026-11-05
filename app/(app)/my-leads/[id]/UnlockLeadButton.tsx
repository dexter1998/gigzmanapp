"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isDailyUnlockLimit, showDailyUnlockLimit } from "@/components/toast/unlock-limit";

/** Spends credits on one lead via /api/leads/[id]/unlock, then re-renders the page unlocked. */
export function UnlockLeadButton({ leadId, cost, credits }: { leadId: string; cost: number; credits: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const short = credits < cost;

  async function unlock() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/leads/${leadId}/unlock`, { method: "POST" });
    if (res.ok) router.refresh();
    else if (isDailyUnlockLimit(res)) { showDailyUnlockLimit(); setError("Today's free unlocks are used up — a credit pack unlocks more."); }
    else setError(res.status === 402 ? "Not enough credits." : "Couldn't unlock this lead. Try again.");
    setBusy(false);
  }

  if (short) {
    return (
      <div>
        <p style={{ fontSize: 14, color: "var(--g-gray-500)", margin: "0 0 12px" }}>
          Unlocking costs {cost} credits and you have {credits}.
        </p>
        <Link href="/settings/billing?src=lead_page" style={btn}>See credit packs</Link>
      </div>
    );
  }
  return (
    <div>
      <button type="button" onClick={unlock} disabled={busy} style={btn}>
        {busy ? "Unlocking…" : `Unlock for ${cost} credits`}
      </button>
      <span style={{ marginLeft: 12, fontSize: 13, color: "var(--g-gray-500)" }}>You have {credits} credits</span>
      {error && <p style={{ fontSize: 13, color: "var(--g-red-text)", margin: "10px 0 0" }}>{error}</p>}
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: "var(--radius-pill)",
  border: "none",
  background: "var(--g-ink)",
  color: "var(--g-white)",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};
