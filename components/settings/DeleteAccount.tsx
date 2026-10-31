"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, X } from "lucide-react";
import { SettingsRow } from "@/components/settings/SettingsShell";

/**
 * "Delete account" row for the Account card, directly under Sign out.
 *
 * It files a request rather than deleting: the Mantis team reviews it (/admin/deletions), and the
 * account keeps working until then. Once filed, the row turns into a status line with Cancel.
 */

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function DeleteAccountRow({ email, pendingAt }: { email: string; pendingAt: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<string | null>(pendingAt);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === email.toLowerCase() && email.length > 0;

  function open() {
    setConfirm(""); setReason(""); setError(null);
    dialogRef.current?.showModal();
  }
  function close() { dialogRef.current?.close(); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: confirm, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the request. Try again.");
      setPending(data.pending?.requestedAt ?? new Date().toISOString());
      close();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/account/delete-request", { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Couldn't cancel. Try again.");
      setPending(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <SettingsRow
        label="Delete account"
        desc={error ?? "Your account works as normal until our team reviews it."}
      >
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)]" data-testid="deletion-pending">
          <Clock size={13} strokeWidth={1.75} />
          Deletion requested · {fmtDate(pending)}
        </span>
        <button type="button" className="set-btn" onClick={cancel} disabled={busy}>
          {busy ? "Cancelling…" : "Cancel request"}
        </button>
      </SettingsRow>
    );
  }

  return (
    <>
      <SettingsRow label="Delete account" desc="Reviewed by the Mantis team">
        <button type="button" className="set-btn danger" onClick={open}>Delete account</button>
      </SettingsRow>

      <dialog
        ref={dialogRef}
        aria-labelledby="del-title"
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] p-0 text-[var(--ink)] shadow-xl backdrop:bg-black/40"
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="del-title" className="m-0 text-[15px] font-semibold">Delete your account?</h2>
            <button type="button" onClick={close} aria-label="Close" className="-m-1 rounded-[var(--radius-sm)] p-1 text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)]">
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <p className="m-0 text-[13px] leading-[1.55] text-[var(--ink-muted)]">
            This sends a request to the Mantis team. Your account keeps working until we review it, and you can cancel any time before then.
          </p>

          <div className="rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-2.5 text-[13px] leading-[1.55]">
            <div className="mb-1 font-medium">Once approved, permanently deleted:</div>
            <div className="text-[var(--ink-muted)]">Account and sign-in · leads · chats · campaigns · credits (forfeited, not refunded)</div>
          </div>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="font-medium">Reason <span className="font-normal text-[var(--ink-faint)]">(optional)</span></span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What could we have done better?"
              className="resize-none rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface)] px-2.5 py-2 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--rule-strong)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="font-medium">Type <span className="font-mono text-[12.5px]">{email}</span> to confirm</span>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={email}
              className="set-input"
              style={{ width: "100%" }}
            />
          </label>

          {error && (
            <p className="m-0 inline-flex items-center gap-1.5 text-[13px] text-[var(--ink)]" role="alert">
              <AlertTriangle size={13} strokeWidth={1.75} /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="set-btn" onClick={close}>Keep account</button>
            <button type="submit" className="set-btn danger" disabled={!matches || busy} style={{ opacity: !matches || busy ? 0.45 : 1 }}>
              {busy ? "Sending…" : "Request deletion"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
