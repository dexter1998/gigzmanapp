"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VariablesEditor({ campaignId, initial }: { campaignId: string; initial: string[] }) {
  const router = useRouter();
  const [text, setText] = useState(initial.join(", "));
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const variables = text.split(",").map((v) => v.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/campaigns/${campaignId}/variables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "failed to save");
      setMsg({ ok: true, text: "saved" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "failed to save" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="camp-form" onSubmit={save} style={{ maxWidth: 480 }}>
      <label htmlFor="vars-edit">Comma-separated — feeds the step editor&apos;s insert-palette</label>
      <input id="vars-edit" value={text} onChange={(e) => setText(e.target.value)} placeholder="business, rating, region, count" />
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save variables"}</button>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}
