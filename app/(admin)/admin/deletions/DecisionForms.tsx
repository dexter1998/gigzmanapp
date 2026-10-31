"use client";

/**
 * Approve / Reject controls. Client-side only for the confirm step: Approve deletes an account and
 * cannot be undone, so it asks once more with the email spelled out.
 */
export function DecisionForms({
  id, email, approve, reject,
}: {
  id: string;
  email: string;
  approve: (fd: FormData) => Promise<void>;
  reject: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <form
        action={approve}
        onSubmit={(e) => {
          if (!window.confirm(`Permanently delete ${email}?\n\nLeads, chats, campaigns and credits are removed. Payments and the credit ledger are kept, anonymised. This cannot be undone.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded-full border px-3 py-1 text-[11px] font-semibold"
          style={{ borderColor: "color-mix(in oklab, var(--critical) 45%, transparent)", color: "var(--critical)" }}
        >
          Approve &amp; delete
        </button>
      </form>
      <form action={reject} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={id} />
        <input
          name="note"
          placeholder="Reject note"
          maxLength={500}
          className="w-[140px] rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-2 py-1 text-[11px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <button type="submit" className="rounded-full border border-[var(--rule)] px-3 py-1 text-[11px] font-semibold text-[var(--ink-muted)]">
          Reject
        </button>
      </form>
    </div>
  );
}
