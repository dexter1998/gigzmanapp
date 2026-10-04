"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Interactive primitives for the admin console — Radix (accessible, React-state-driven) wearing
 * Tabler's real CSS classes (modal/modal-dialog/modal-content, dropdown-menu/dropdown-item,
 * input-icon), not Bootstrap's own JS. See docs/MANTIS_ADMIN_TABLER_SYSTEM.md for why: Bootstrap's
 * data-bs-toggle components mutate the DOM imperatively, which can fight React's virtual DOM
 * inside a page these components live on; Radix gives the same visual result driven by props.
 *
 * Still read-only in effect: nothing here calls a mutating route. A dropdown narrows a GET query
 * via the URL, a dialog fetches detail that already exists — no admin action writes anything.
 */

/* ------------------------------------------------------------------ Dialog (modal) */

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1040] bg-black/60" />
        {/* The portal escapes `.mantis-admin`, so the scope is re-applied here — otherwise every
            token inside the modal resolves to nothing and it renders unstyled. */}
        <DialogPrimitive.Content
          className="mantis-admin fixed inset-0 z-[1050] flex items-center justify-center p-4"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div
            role="document"
            className="max-h-[85vh] w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]"
            style={{ maxWidth: 640, boxShadow: "var(--shadow-pop)" }}
          >
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogHeader({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  return (
    <div className="rule-b flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <DialogPrimitive.Title className="m-0 text-[14px] font-semibold text-[var(--ink)]">{title}</DialogPrimitive.Title>
        {sub != null && (
          <DialogPrimitive.Description className="m-0 mt-0.5 text-[12px] text-[var(--ink-muted)]">{sub}</DialogPrimitive.Description>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 rounded-[var(--radius-sm)] border-0 bg-transparent px-1 text-[16px] leading-none text-[var(--ink-faint)] hover:text-[var(--ink)]"
      >
        ×
      </button>
    </div>
  );
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="p-4">{children}</div>;
}

/* ------------------------------------------------------------------ Dropdown (filter menu) */

export function FilterDropdown({
  label, active, options, onSelect,
}: {
  label: string;
  active: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const activeLabel = options.find((o) => o.value === active)?.label ?? options[0]?.label;
  const isSet = active !== options[0]?.value;
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold",
            isSet
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
              : "border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]",
          )}
        >
          {label}: {activeLabel}
          <span aria-hidden="true" className="text-[9px] opacity-70">▾</span>
        </button>
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          className="mantis-admin z-[1060] min-w-[180px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] py-1"
          align="start"
          sideOffset={6}
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {options.map((opt) => (
            <DropdownPrimitive.Item
              key={opt.value}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-[12.5px] outline-none",
                opt.value === active ? "bg-[var(--surface-sunk)] text-[var(--ink)]" : "text-[var(--ink-muted)]",
                "data-[highlighted]:bg-[var(--surface-sunk)] data-[highlighted]:text-[var(--ink)]",
              )}
              onSelect={() => onSelect(opt.value)}
            >
              {opt.label}
            </DropdownPrimitive.Item>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ Search input (table filter) */

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative" style={{ maxWidth: 320 }}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
        <IconSearch size={15} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] py-1.5 pl-8 pr-7 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-[14px] leading-none text-[var(--ink-faint)] hover:text-[var(--ink)]"
        >
          ×
        </button>
      )}
    </div>
  );
}
