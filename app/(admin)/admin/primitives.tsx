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
        <DialogPrimitive.Overlay className="modal-backdrop fade show" />
        <DialogPrimitive.Content
          className="modal d-block"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 640, width: "calc(100vw - 32px)" }} role="document">
            <div className="modal-content">{children}</div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogHeader({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-header">
      <div>
        <DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title>
        {sub != null && <DialogPrimitive.Description className="text-secondary mt-1" style={{ fontSize: 12 }}>{sub}</DialogPrimitive.Description>}
      </div>
      <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
    </div>
  );
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="modal-body">{children}</div>;
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
        <button type="button" className={cn("btn btn-sm dropdown-toggle", isSet ? "btn-primary" : "btn-outline-secondary")}>
          {label}: {activeLabel}
        </button>
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content className="dropdown-menu show" align="start" sideOffset={6}>
          {options.map((opt) => (
            <DropdownPrimitive.Item
              key={opt.value}
              className={cn("dropdown-item", opt.value === active && "active")}
              onSelect={() => onSelect(opt.value)}
              style={{ cursor: "pointer" }}
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
    <div className="input-icon" style={{ maxWidth: 320 }}>
      <span className="input-icon-addon"><IconSearch size={16} /></span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-control form-control-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="btn-close"
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10 }}
        />
      )}
    </div>
  );
}
