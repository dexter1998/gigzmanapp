"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Initial = {
  stepKey: string;
  stepType: string;
  sendOffsetMinutes: number;
  subject: string;
  html: string;
  text: string;
};

/** Create/edit form for one campaign step (a touch). Shared between /steps/new and
 * /steps/[stepKey]/edit — `initial` present means edit (stepKey becomes read-only, PUT instead of
 * POST). The variable palette inserts {{name}} at the last-focused field's cursor position rather
 * than always appending, so building a subject line interleaved with variables doesn't mean
 * typing the tag by hand. */
export function StepForm({ campaignId, variables, initial }: { campaignId: string; variables: string[]; initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [stepKey, setStepKey] = useState(initial?.stepKey ?? "");
  const [stepType, setStepType] = useState(initial?.stepType ?? "single_lead");
  const [offset, setOffset] = useState(String(initial?.sendOffsetMinutes ?? 0));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [html, setHtml] = useState(initial?.html ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "html" | "text">("html");

  function insertVariable(name: string) {
    const tag = `{{${name}}}`;
    const setters = { subject: [subject, setSubject, subjectRef] as const, html: [html, setHtml, htmlRef] as const, text: [text, setText, textRef] as const };
    const [value, setValue, ref] = setters[lastFocused.current];
    const el = ref.current;
    if (!el) { setValue(value + tag); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + tag + value.slice(end));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + tag.length; });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const url = isEdit
        ? `/api/admin/campaigns/${campaignId}/steps/${initial.stepKey}`
        : `/api/admin/campaigns/${campaignId}/steps`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? {} : { stepKey }),
          stepType, sendOffsetMinutes: Number(offset), subject, html, text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "failed to save step");
      router.push(`/admin-campaigns/${campaignId}`);
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "failed to save step" });
      setPending(false);
    }
  }

  return (
    <form className="camp-form" onSubmit={submit} style={{ maxWidth: 640 }}>
      {variables.length > 0 && (
        <div>
          <label>Insert variable (into the last-focused field)</label>
          <div className="camp-var-palette">
            {variables.map((v) => (
              <button key={v} type="button" className="camp-var-chip" onClick={() => insertVariable(v)}>{"{{" + v + "}}"}</button>
            ))}
          </div>
        </div>
      )}

      {!isEdit && (
        <>
          <label htmlFor="s-key">Step key (matches email_sends.step_key, immutable once created)</label>
          <input id="s-key" value={stepKey} onChange={(e) => setStepKey(e.target.value)} placeholder="cold_t1_single" required />
        </>
      )}

      <label htmlFor="s-type">Step type</label>
      <select id="s-type" value={stepType} onChange={(e) => setStepType(e.target.value)}>
        <option value="single_lead">Single lead (one specific hook)</option>
        <option value="multi_lead">Multi lead (volume/region pitch)</option>
      </select>

      <label htmlFor="s-offset">Send offset, minutes after batch start</label>
      <input id="s-offset" type="number" min={0} value={offset} onChange={(e) => setOffset(e.target.value)} required />

      <label htmlFor="s-subject">Subject</label>
      <input
        id="s-subject" ref={subjectRef} value={subject} onFocus={() => (lastFocused.current = "subject")}
        onChange={(e) => setSubject(e.target.value)} required
      />

      <label htmlFor="s-html">HTML body</label>
      <textarea
        id="s-html" ref={htmlRef} value={html} onFocus={() => (lastFocused.current = "html")}
        onChange={(e) => setHtml(e.target.value)} rows={8} required
      />

      <label htmlFor="s-text">Plain text body</label>
      <textarea
        id="s-text" ref={textRef} value={text} onFocus={() => (lastFocused.current = "text")}
        onChange={(e) => setText(e.target.value)} rows={4} required
      />

      <button type="submit" disabled={pending}>{pending ? "Saving…" : isEdit ? "Save step" : "Create step"}</button>
      {msg && <div className="camp-msg err">{msg.text}</div>}
    </form>
  );
}
