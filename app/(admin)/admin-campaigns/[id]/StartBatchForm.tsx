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
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [startAt, setStartAt] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canSubmit = confirmText === campaignId && !pending && (scheduleMode === "now" || startAt !== "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch,
          confirmText,
          ...(scheduleMode === "later" && startAt ? { startAt: new Date(startAt).toISOString() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "failed to start");
      setMsg({
        ok: true,
        text: scheduleMode === "later"
          ? `scheduled — cron will start sending at ${new Date(data.startedAt ?? startAt).toLocaleString()}`
          : "batch started — cron will send the due steps from here",
      });
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
        Batch <strong>{batch}</strong> &middot; {recipientCount} recipients. Har step apne
        offset ke hisaab se khud chalega jab yeh batch start ho jaye, admin ko dobara confirm
        nahi karna padega.
      </div>
      <label>
        <input type="radio" name={`when-${batch}`} checked={scheduleMode === "now"} onChange={() => setScheduleMode("now")} /> Start now
      </label>
      <label>
        <input type="radio" name={`when-${batch}`} checked={scheduleMode === "later"} onChange={() => setScheduleMode("later")} /> Schedule for later
      </label>
      {scheduleMode === "later" && (
        <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
      )}
      <label htmlFor={`confirm-${batch}`}>Type the campaign id (<code>{campaignId}</code>) to {scheduleMode === "later" ? "schedule" : "start"} this batch</label>
      <input id={`confirm-${batch}`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
      <button type="submit" disabled={!canSubmit}>
        {pending ? "Submitting…" : scheduleMode === "later" ? `Schedule batch ${batch}` : `Start batch ${batch}`}
      </button>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}
