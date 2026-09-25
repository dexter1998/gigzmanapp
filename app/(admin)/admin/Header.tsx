"use client";

import { usePathname } from "next/navigation";
import { resolveBreadcrumb } from "./nav-data";

/** Persistent top bar above every admin page's own content — a real breadcrumb (derived from the
 * same NAV data the sidebar highlights against, see nav-data.ts) plus the signed-in admin and the
 * console's read-only status, so both are visible without repeating them per page. Page-specific
 * titles/actions/"as of" timestamps stay where they are, inside each page's own .adm-head — this
 * bar is section-level chrome, not a replacement for it. */
export function Header({ email }: { email: string }) {
  const pathname = usePathname();
  const crumb = resolveBreadcrumb(pathname);

  return (
    <header className="adm-topbar">
      <div className="adm-topbar-crumb">
        {crumb ? (
          <>
            <span className="eyebrow">{crumb.group}</span>
            <span className="sep">/</span>
            <span className="page">{crumb.label}</span>
          </>
        ) : (
          <span className="page">Admin</span>
        )}
      </div>
      <div className="adm-topbar-right">
        <span className="adm-topbar-status">
          <span className="adm-topbar-dot" />
          Read-only
        </span>
        <span className="adm-topbar-email">{email}</span>
      </div>
    </header>
  );
}
