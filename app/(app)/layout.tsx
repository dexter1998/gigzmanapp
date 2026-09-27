import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { AppSidebar } from "@/components/AppSidebar";
import { GeoBeacon } from "@/components/GeoBeacon";
import { PopupHost } from "@/components/popup/PopupHost";
import {
  FREE_500_GRANT_REASON, FREE_500_GRANT_REF_PREFIX, NEW_ACCOUNT_WINDOW_HOURS,
  type AudienceTag,
} from "@/lib/popups";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // The popup audience tags are resolved here, in the same round trip as the profile, because both
  // are facts only the server holds: how old the account is, and whether the credit grant actually
  // landed in the ledger. Deciding either in the browser would mean a popup that thanks someone for
  // credits they never got, or one that greets a two-year-old account as brand new.
  const [profile] = await sql`
    SELECT p.onboarding_completed,
           p.name,
           p.created_at > now() - make_interval(hours => ${NEW_ACCOUNT_WINDOW_HOURS}) AS is_new_account,
           EXISTS (
             SELECT 1 FROM credit_ledger l
              WHERE l.user_email = p.email
                AND l.reason = ${FREE_500_GRANT_REASON}
                AND l.ref = ${FREE_500_GRANT_REF_PREFIX} || p.email
           ) AS granted_free_500
      FROM user_profiles p
     WHERE p.email = ${session.user.email}
  `;
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const audience: AudienceTag[] = [
    profile.is_new_account ? "new-account" : "returning-account",
    ...(profile.granted_free_500 ? (["granted-free-500"] as const) : []),
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--g-cream)" }}>
      <AppSidebar name={profile?.name ?? session.user.name ?? null} email={session.user.email} />
      <main style={{ flex: 1, position: "relative", minWidth: 0 }}>{children}</main>
      <GeoBeacon />
      <PopupHost audience={audience} />
    </div>
  );
}
