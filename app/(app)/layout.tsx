import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { AppSidebar } from "@/components/AppSidebar";
import { GeoBeacon } from "@/components/GeoBeacon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const [profile] = await sql`SELECT onboarding_completed, name FROM user_profiles WHERE email = ${session.user.email}`;
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--g-cream)" }}>
      <AppSidebar name={profile?.name ?? session.user.name ?? null} email={session.user.email} />
      <main style={{ flex: 1, position: "relative", minWidth: 0 }}>{children}</main>
      <GeoBeacon />
    </div>
  );
}
