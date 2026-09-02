"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The typed-confirmation gate before a batch starts sending. Typing the campaign id (not just
 * clicking "yes") is what makes a leaked/CSRF'd admin session insufficient on its own — a
 * scripted request still has to carry this exact string, which a session cookie alone can't give
 * an attacker. The server re-checks it independently; this is defense in depth, not the real gate.
 */
export function StartBatchForm({ campaignId, batch, recipientCount }: { campaignId: string; batch: string; recipientCount: number }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canSubmit = confirmText === campaignId && !pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch, confirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed to start");
      setMsg({ ok: true, text: "batch started — cron will send the due steps from here" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "failed to start" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="camp-form" onSubmit={submit}>
      <div style={{ fontSize: 12.5 }}>
        Batch <strong>{batch}</strong> &middot; {recipientCount} recipients. Har step us din se
        chalega jab yeh batch start hua, admin ko roz confirm nahi karna padega.
      </div>
      <label htmlFor={`confirm-${batch}`}>Type the campaign id (<code>{campaignId}</code>) to start this batch</label>
      <input id={`confirm-${batch}`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
      <button type="submit" disabled={!canSubmit}>{pending ? "Starting…" : `Start batch ${batch}`}</button>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}
