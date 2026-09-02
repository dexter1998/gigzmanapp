import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import "../admin/admin.css";
import "./admin-campaigns.css";

/**
 * Mutating admin surface — deliberately a separate route group from /admin, whose layout states
 * "no route in this group mutates anything, so a leaked admin session can look but not touch."
 * A send trigger is exactly what that invariant exists to prevent, so it doesn't live there.
 *
 * Same admin allowlist gate as /admin. The real mutations are gated further still: starting a
 * batch (the only manual send trigger) requires typing the campaign id, and a paused campaign
 * stops the cron picking up more sends on its very next tick.
 */
export const dynamic = "force-dynamic";

export default async function AdminCampaignsLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="adm-shell">
      <aside className="adm-rail camp-rail">
        <div className="adm-rail-brand">
          <span className="name">Mantis</span>
          <span className="tag camp-tag">Campaigns</span>
        </div>
        <nav className="adm-nav">
          <Link href="/admin-campaigns">All campaigns</Link>
          <Link href="/admin">&larr; Read-only admin</Link>
        </nav>
        <div className="adm-rail-foot">
          {email}
          <br />mutating console — sends real email
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
