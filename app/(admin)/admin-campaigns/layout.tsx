import { requireAdmin } from "@/lib/admin";
import { CampaignsNav } from "./CampaignsNav";
import { CampaignsHeader } from "./CampaignsHeader";
import { ThemeSetter } from "../admin/ThemeSetter";
import "@tabler/core/dist/css/tabler.min.css";
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
      {/* Set before hydration so a full page load never flashes light mode first — ThemeSetter's
          effect only runs after mount. Its cleanup is what stops the dark theme leaking onto the
          public site after a client-side navigation away. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-bs-theme','dark')" }} />
      <ThemeSetter />
      <div className="page">
        <CampaignsNav email={email} />
        <div className="page-wrapper">
          <CampaignsHeader email={email} />
          {children}
          <footer className="footer footer-transparent d-print-none">
            <div className="container-xl">
              <div className="row text-secondary" style={{ fontSize: 11.5 }}>
                <div className="col">Mantis Admin · campaigns console</div>
                <div className="col-auto">Tabler Admin Template · MIT</div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
