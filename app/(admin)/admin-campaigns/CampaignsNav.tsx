"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconRocket, IconPlus, IconArrowLeft, IconRoute } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar for the mutating campaigns console.
 *
 * Structurally identical to the read-only console's nav (Tabler's `navbar navbar-vertical`, React
 * state for the mobile drawer rather than Bootstrap's data-bs-toggle — see
 * docs/MANTIS_ADMIN_TABLER_SYSTEM.md) but deliberately wearing a red brand badge instead of the
 * blue "Admin" one. These two surfaces look alike and behave very differently: one of them sends
 * real email to real people. The colour is the only thing standing between "I'm reading the
 * dashboard" and "I just started a batch", so it is not decoration.
 */
export function CampaignsNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  const isList = pathname === "/admin-campaigns";
  const isNew = pathname.startsWith("/admin-campaigns/new");
  const isDetail = !isList && !isNew && pathname.startsWith("/admin-campaigns/");

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
      <div className="container-fluid">
        <button className="navbar-toggler" type="button" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>

        <h1 className="navbar-brand navbar-brand-autodark">
          <Link href="/admin-campaigns" className="d-flex align-items-center gap-2 text-white text-decoration-none">
            <span className="fw-bold">Mantis</span>
            <span className="badge bg-red-lt">Campaigns</span>
          </Link>
        </h1>

        <button
          type="button"
          className="btn-close btn-close-white d-lg-none ms-auto"
          onClick={close}
          aria-label="Close"
          style={mobileOpen ? undefined : { display: "none" }}
        />

        <div className={cn("navbar-collapse adm-navbar-collapse", mobileOpen && "is-open")}>
          <ul className="navbar-nav pt-lg-3">
            <li className="nav-item">
              <div className="navbar-nav-label px-3 pt-3 pb-1 text-uppercase text-secondary" style={{ fontSize: 10.5, letterSpacing: "0.07em", fontWeight: 700 }}>
                Outreach
              </div>
              <Link href="/admin-campaigns" className={cn("nav-link", isList && "active")} onClick={close}>
                <span className="nav-link-icon d-md-none d-lg-inline-block"><IconRocket size={18} stroke={1.75} /></span>
                <span className="nav-link-title">All campaigns</span>
              </Link>
              <Link href="/admin-campaigns/new" className={cn("nav-link", isNew && "active")} onClick={close}>
                <span className="nav-link-icon d-md-none d-lg-inline-block"><IconPlus size={18} stroke={1.75} /></span>
                <span className="nav-link-title">New campaign</span>
              </Link>
              {/* Only shown while inside a campaign: a journey link with no campaign to point at
                  would have to guess one, and guessing wrong on a console that sends mail is
                  worse than the link not being there. */}
              {isDetail && (
                <span className={cn("nav-link", "active")}>
                  <span className="nav-link-icon d-md-none d-lg-inline-block"><IconRoute size={18} stroke={1.75} /></span>
                  <span className="nav-link-title">Current campaign</span>
                </span>
              )}
            </li>

            <li className="nav-item mt-3">
              <div className="navbar-nav-label px-3 pt-3 pb-1 text-uppercase text-secondary" style={{ fontSize: 10.5, letterSpacing: "0.07em", fontWeight: 700 }}>
                Elsewhere
              </div>
              <Link href="/admin" className="nav-link" onClick={close}>
                <span className="nav-link-icon d-md-none d-lg-inline-block"><IconArrowLeft size={18} stroke={1.75} /></span>
                <span className="nav-link-title">Read-only admin</span>
              </Link>
            </li>
          </ul>

          <div className="mt-auto px-3 py-3 text-secondary" style={{ fontSize: 11 }}>
            <div className="text-truncate">{email}</div>
            <div className="text-red mt-1">mutating console — sends real email</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
