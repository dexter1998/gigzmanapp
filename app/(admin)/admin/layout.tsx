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
      {/* Tabler's stylesheet is still loaded (above) because the pages not yet rebuilt use its
          classes; its dark mode keys off `data-bs-theme` on <html>, which this layout does not own.
          The shell and the Overview are on the console's own tokens now, so the two coexist the way
          Tailwind and Bootstrap already do here — see docs/MANTIS_ADMIN_TABLER_SYSTEM.md. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.setAttribute('data-bs-theme','dark');document.documentElement.setAttribute('data-admin','')" }} />
      <ThemeSetter />
      <div className="mantis-admin flex min-h-screen">
        <AdminNav email={email} />
        <div className="flex min-w-0 flex-1 flex-col pt-12 lg:pt-0">
          <Header email={email} />
          <main className="min-w-0 flex-1">{children}</main>
          <footer className="rule-t px-5 py-3">
            <p className="m-0 text-[11px] text-[var(--ink-faint)]">Mantis Admin · read-only console</p>
          </footer>
        </div>
      </div>
    </>
  );
}
