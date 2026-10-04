import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasJobsAccess } from "@/lib/jobs/access";

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

  // hasJobsAccess rather than a bare mode check: the two happen to agree today, but this page is
  // the one that decides where an account opens, and it should ask the same question every other
  // jobs entry point asks rather than keeping its own copy of the rule.
  redirect((await hasJobsAccess(session.user.email)) ? "/jobs/map" : "/home");
}
