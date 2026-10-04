"use client";

/** Account chrome, plus the one thing this console must never let you forget. */
export function CampaignsHeader({ email }: { email: string }) {
  return (
    <header className="rule-b flex h-12 shrink-0 items-center justify-end gap-3 px-5">
      <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--warn)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--warn)" }} aria-hidden="true" />
        Sends email
      </span>
      <span className="hidden text-[12px] text-[var(--ink-faint)] sm:inline">{email}</span>
    </header>
  );
}
