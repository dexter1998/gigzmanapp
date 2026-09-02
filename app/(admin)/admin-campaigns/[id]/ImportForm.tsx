"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ImportForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [batch, setBatch] = useState("A");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setPending(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("batch", batch);
      const res = await fetch(`/api/admin/campaigns/${campaignId}/recipients`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "import failed");
      setMsg({ ok: true, text: `imported ${data.imported}, skipped ${data.skipped}` });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "import failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="camp-form" onSubmit={submit}>
      <label htmlFor="csv-batch">Default batch (a &quot;batch&quot; column in the CSV overrides this per row)</label>
      <input id="csv-batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="A" />
      <label htmlFor="csv-file">Recipients CSV (needs an &quot;email&quot; column; other columns become {"{{placeholder}}"} values)</label>
      <input id="csv-file" ref={fileRef} type="file" accept=".csv,text/csv" required />
      <button type="submit" disabled={pending}>{pending ? "Importing…" : "Import recipients"}</button>
      {msg && <div className={`camp-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </form>
  );
}
