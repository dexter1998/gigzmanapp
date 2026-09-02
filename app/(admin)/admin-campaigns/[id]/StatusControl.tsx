"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = ["draft", "active", "paused", "done"];

export function StatusControl({ campaignId, current }: { campaignId: string; current: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function change(status: string) {
    if (status === current) return;
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setMsg({ ok: true, text: `status: ${status}` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="camp-form" style={{ maxWidth: 260 }}>
      <label htmlFor="camp-status">Status</label>
      <select id="camp-status" value={current} disabled={pending} onChange={(e) => change(e.target.value)}>
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </div>
  );
}
