import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./nav";
import { Header } from "./Header";
import { ThemeSetter } from "./ThemeSetter";
import "@tabler/core/dist/css/tabler.min.css";
import "./admin.css";

/**
 * The admin console. Gated at the layout so every page under /admin inherits the check — a
 * non-admin (or anonymous) request 404s before any query runs. Read-only by design: no route
 * in this group mutates anything, so a leaked admin session can look but not touch.
 *
 * Tabler's dark mode requires `data-bs-theme="dark"` on `:root` (`<html>`), which this layout
 * doesn't own (the public site shares it) — see ThemeSetter.tsx and the inline script below for
 * how it's applied/cleaned up without hardcoding dark mode onto the whole app.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <>
      {/* Runs before hydration so there's no light-mode flash on a full page load/refresh —
          ThemeSetter's effect (below) only fires after mount, which would otherwise paint once
          in the wrong theme first. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-bs-theme','dark')" }} />
      <ThemeSetter />
      <div className="page">
        <AdminNav email={email} />
        <div className="page-wrapper">
          <Header email={email} />
          {children}
          <footer className="footer footer-transparent d-print-none">
            <div className="container-xl">
              <div className="row text-secondary" style={{ fontSize: 11.5 }}>
                <div className="col">Mantis Admin · read-only console</div>
                <div className="col-auto">Tabler Admin Template · MIT</div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
