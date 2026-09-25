import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./nav";
import { Header } from "./Header";
import "./admin.css";

/**
 * The admin console. Gated at the layout so every page under /admin inherits the check — a
 * non-admin (or anonymous) request 404s before any query runs. Read-only by design: no route
 * in this group mutates anything, so a leaked admin session can look but not touch.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="adm-shell">
      <AdminNav email={email} />
      <div className="adm-content">
        <Header email={email} />
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
