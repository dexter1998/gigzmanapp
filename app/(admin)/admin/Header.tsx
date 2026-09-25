"use client";

import { IconCircleFilled } from "@tabler/icons-react";

/** Tabler's real horizontal top navbar, used ABOVE the page-header — Tabler's own vertical-nav
 * demos combine both (sidebar for navigation, top bar for account/status), so this is not an
 * invented hybrid. Per-page breadcrumb/title lives in each page's own PageHeader (ui.tsx); this
 * bar only carries account-level chrome that never changes shape between pages. */
export function Header({ email }: { email: string }) {
  return (
    <header className="navbar navbar-expand-md d-print-none">
      <div className="container-xl">
        <div className="navbar-nav flex-row order-md-last ms-auto align-items-center gap-2">
          <span className="badge bg-green-lt d-flex align-items-center gap-1">
            <IconCircleFilled size={8} />
            Read-only
          </span>
          <span className="text-secondary d-none d-sm-inline" style={{ fontSize: 12.5 }}>{email}</span>
        </div>
      </div>
    </header>
  );
}
