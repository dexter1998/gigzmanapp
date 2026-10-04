"use client";

/**
 * Account-level chrome only — status and identity, nothing that changes shape between pages. The
 * per-page title lives in each page's own header, so this bar stays a thin constant.
 */
export function Header({ email }: { email: string }) {
  return (
    <header className="rule-b flex h-12 shrink-0 items-center justify-end gap-3 px-5">
      <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--ok)" }} aria-hidden="true" />
        Read-only
      </span>
      <span className="hidden text-[12px] text-[var(--ink-faint)] sm:inline">{email}</span>
    </header>
  );
}
