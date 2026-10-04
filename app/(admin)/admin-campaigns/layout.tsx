import { requireAdmin } from "@/lib/admin";
import { CampaignsNav } from "./CampaignsNav";
import { CampaignsHeader } from "./CampaignsHeader";
import { ThemeSetter } from "../admin/ThemeSetter";
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
 *
 * Tabler's stylesheet is imported HERE as well as in the read-only console's layout, not only
 * there. These are sibling route segments, so this one inherits nothing from it — and because the
 * pages under both render the same Tabler component classes out of admin/ui.tsx, missing that one
 * import does not degrade gracefully: every card, table and badge renders as unstyled HTML while
 * looking, in source, exactly like the console that works. That is precisely what happened when
 * the console was rebuilt on Tabler and this layout was left behind.
 */
export const dynamic = "force-dynamic";

export default async function AdminCampaignsLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-bs-theme','dark');document.documentElement.setAttribute('data-admin','')" }} />
      <ThemeSetter />
      <div className="mantis-admin flex min-h-screen">
        <CampaignsNav email={email} />
        <div className="flex min-w-0 flex-1 flex-col pt-12 lg:pt-0">
          <CampaignsHeader email={email} />
          <main className="min-w-0 flex-1 p-5">{children}</main>
          <footer className="rule-t px-5 py-3">
            <p className="m-0 text-[11px] text-[var(--ink-faint)]">Mantis Admin · campaigns console · sends email</p>
          </footer>
        </div>
      </div>
    </>
  );
}
