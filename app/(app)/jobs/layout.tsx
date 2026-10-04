import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasJobsAccess } from "@/lib/jobs/access";

/**
 * The gate on the whole jobs dashboard.
 *
 * All three jobs pages are client components, so there is nowhere inside them to do a server-side
 * check that a user cannot simply skip. This layout is that place: it runs on the server for every
 * /jobs/* request and sends anyone without access back to Leads.
 *
 * A redirect rather than a "coming soon" screen, deliberately. Someone landing here without access
 * either typed the URL or followed a stale link; they have a working dashboard, and the honest
 * thing is to put them in it. The "coming soon" message belongs on the marketing page, where it is
 * aimed at people deciding whether to sign up.
 *
 * force-dynamic because the answer depends on the session.
 */
export const dynamic = "force-dynamic";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (!(await hasJobsAccess(session.user.email))) redirect("/home");
  return <>{children}</>;
}
