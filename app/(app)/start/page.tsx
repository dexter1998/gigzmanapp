import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";

/**
 * Post-login landing router.
 *
 * Sign-in used to hard-code `redirectTo: "/home"` in two places and the marketing root hard-coded
 * a third. With two dashboards there has to be exactly one place that answers "which app does
 * this account open into", and this is it — everything that used to point at /home now points
 * here instead.
 *
 * Renders nothing: it always redirects.
 */
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const [profile] = await sql`SELECT dashboard_mode FROM user_profiles WHERE email = ${session.user.email}`;
  redirect(profile?.dashboard_mode === "jobs" ? "/jobs/map" : "/home");
}
