"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Interactive primitives for the admin console — sourced from shadcn/ui (Radix + Tailwind, MIT),
 * restyled onto this app's own tokens instead of shadcn's default theme so it stays one visual
 * system with the rest of admin.css. Kept separate from ui.tsx (server components, no handlers)
 * because these need "use client" — same split rationale as lib/credits/{index,server}.ts.
 *
 * Still read-only in effect: nothing here calls a mutating route. A dropdown narrows a GET query
 * via the URL, a dialog fetches detail that already exists — no admin action writes anything.
 */

/* ------------------------------------------------------------------ Dialog (modal) */

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="adm-modal-overlay" />
        <DialogPrimitive.Content className="adm-modal-content" onOpenAutoFocus={(e) => e.preventDefault()}>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function DialogHeader({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  return (
    <div className="adm-modal-head">
      <div>
        <DialogPrimitive.Title className="adm-modal-title">{title}</DialogPrimitive.Title>
        {sub != null && <DialogPrimitive.Description className="adm-modal-sub">{sub}</DialogPrimitive.Description>}
      </div>
      <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
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
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>
        <button type="button" className={cn("adm-filter-trigger", active !== options[0]?.value && "is-set")}>
          <span className="k">{label}</span>
          <span className="v">{activeLabel}</span>
          <ChevronDown size={13} className="chev" />
        </button>
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content className="adm-filter-menu" align="start" sideOffset={6}>
          {options.map((opt) => (
            <DropdownPrimitive.Item
              key={opt.value}
              className={cn("adm-filter-item", opt.value === active && "is-active")}
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

/* ------------------------------------------------------------------ Collapsible (nav groups) */

export function CollapsibleGroup({
  label, defaultOpen = true, storageKey, children,
}: {
  label: string;
  defaultOpen?: boolean;
  storageKey: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored == null ? defaultOpen : stored === "1";
    } catch {
      return defaultOpen; // private-browsing / storage blocked
    }
  });

  function toggle(next: boolean) {
    setOpen(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* ignore */ }
  }

  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={toggle}>
      <CollapsiblePrimitive.Trigger className="adm-nav-label as-trigger">
        {label}
        <ChevronDown size={12} className={cn("adm-nav-chev", open && "is-open")} />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="adm-nav-collapsible">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
