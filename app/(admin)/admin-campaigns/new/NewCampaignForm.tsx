"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewCampaignForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [sender, setSender] = useState("Mantis Ai <hello@blogyapp.com>");
  const [stream, setStream] = useState("prospect_cold");
  const [variablesText, setVariablesText] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const variables = variablesText.split(",").map((v) => v.trim()).filter(Boolean);
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, sender, stream, variables }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "failed to create campaign");
      router.push(`/admin-campaigns/${data.id}`);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "failed to create campaign" });
      setPending(false);
    }
  }

  return (
    <form className="camp-form" onSubmit={submit} style={{ maxWidth: 480 }}>
      <label htmlFor="c-id">Campaign id (lowercase, underscore — this is also email_sends.campaign_id)</label>
      <input id="c-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="cold_webdev_outreach" required />

      <label htmlFor="c-name">Display name</label>
      <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cold outreach" required />

      <label htmlFor="c-sender">Sender</label>
      <input id="c-sender" value={sender} onChange={(e) => setSender(e.target.value)} required />

      <label htmlFor="c-stream">Stream (unsubscribe/suppression bucket)</label>
      <input id="c-stream" value={stream} onChange={(e) => setStream(e.target.value)} required />

      <label htmlFor="c-vars">Variables (comma-separated — e.g. business, region, count)</label>
      <input id="c-vars" value={variablesText} onChange={(e) => setVariablesText(e.target.value)} placeholder="business, rating, region, count" />

      <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create campaign"}</button>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}
