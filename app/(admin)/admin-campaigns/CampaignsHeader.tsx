"use client";

import { IconAlertTriangleFilled } from "@tabler/icons-react";

/**
 * Top bar for the campaigns console.
 *
 * Mirrors the read-only console's header exactly, with one deliberate inversion: that one carries
 * a green "Read-only" badge, this one carries a red warning. The two surfaces are otherwise
 * visually identical, and the whole reason campaigns lives in its own route group is that actions
 * here leave the building. The badge is the standing reminder of which one you are looking at.
 */
export function CampaignsHeader({ email }: { email: string }) {
  return (
    <header className="navbar navbar-expand-md d-print-none">
      <div className="container-xl">
        <div className="navbar-nav flex-row order-md-last ms-auto align-items-center gap-2">
          <span className="badge bg-red-lt d-flex align-items-center gap-1">
            <IconAlertTriangleFilled size={12} />
            Sends real email
          </span>
          <span className="text-secondary d-none d-sm-inline" style={{ fontSize: 12.5 }}>{email}</span>
        </div>
      </div>
    </header>
  );
}
