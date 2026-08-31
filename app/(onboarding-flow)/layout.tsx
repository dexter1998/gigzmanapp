import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata = { title: "Get Started" };

// Deliberately does NOT check onboarding_completed (unlike (app)/layout.tsx) — checking that
// here would redirect an in-progress user straight back into onboarding, an infinite loop.
export default async function OnboardingFlowLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return <>{children}</>;
}
