import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { sql } from "@/lib/db";
import { AppSidebar } from "@/components/AppSidebar";
import { TopCredits } from "@/components/TopCredits";
import { GeoBeacon } from "@/components/GeoBeacon";
import { ActivityBeacon } from "@/components/ActivityBeacon";
import { PopupHost } from "@/components/popup/PopupHost";
import { SticklyScript } from "@/components/SticklyScript";
import {
  FREE_500_GRANT_REASON, FREE_500_GRANT_REF_PREFIX, NEW_ACCOUNT_WINDOW_HOURS, isGreeting,
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
           ) AS granted_free_500,
           -- Read off the row the grant wrote, never inferred: the popup congratulates someone on a
           -- comped plan only if an admin actually comped it.
           p.plan_source = 'granted' AS plan_granted,
           p.plan
      FROM user_profiles p
     WHERE p.email = ${session.user.email}
  `;
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const audience: AudienceTag[] = [
    profile.is_new_account ? "new-account" : "returning-account",
    ...(profile.granted_free_500 ? (["granted-free-500"] as const) : []),
    ...(profile.plan_granted ? (["granted-plan"] as const) : []),
  ];

  // Which popups this ACCOUNT has already seen. localStorage used to be the only record, so a new
  // browser profile saw one-time popups again and a second user on a shared browser never saw them
  // at all. `seen_today` also answers "has anything else interrupted them today", which is what
  // keeps a credit grant and "Welcome back!" from arriving back to back.
  const seenRows = await sql`
    SELECT popup_id, seen_at >= date_trunc('day', now()) AS seen_today
      FROM popup_seen WHERE user_email = ${session.user.email}
  `;
  const seenIds = seenRows.map((r) => r.popup_id as string);
  const seenTodayIds = seenRows.filter((r) => r.seen_today).map((r) => r.popup_id as string);
  const otherSeenToday = seenTodayIds.some((id) => !isGreeting(id));

  // Copy refers to the plan by name, so the popup reads "Starter, on the house" rather than a
  // generic line — one POPUPS entry covering every plan instead of one entry per plan.
  const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business", free: "Free" };
  const planName = PLAN_LABEL[String(profile.plan ?? "")] ?? "Your plan";

  // One class carries the whole V2 look. Re-pointing tokens under `.v2` moves the V2 surface
  // without touching the inline styles scattered across the dashboard — the same lever
  // `.mantis-app` already pulls for the dashboard as a whole.
  const v2 = isV2Email(session.user.email);

  return (
    // `mantis-app` is what scopes the dashboard token layer in app/globals.css. The marketing
    // pages sit outside it and keep the original palette.
    <div className={v2 ? "mantis-app v2" : "mantis-app"} style={{ minHeight: "100vh", display: "flex", background: "var(--g-cream)" }}>
      <AppSidebar name={profile?.name ?? session.user.name ?? null} email={session.user.email} v2={isV2Email(session.user.email)} />
      <main style={{ flex: 1, position: "relative", minWidth: 0 }}><TopCredits />{children}</main>
      <GeoBeacon />
      <ActivityBeacon />
      <PopupHost
        audience={audience}
        vars={{ plan: planName }}
        seenIds={seenIds}
        seenTodayIds={seenTodayIds}
        otherSeenToday={otherSeenToday}
      />
      <SticklyScript />
    </div>
  );
}
