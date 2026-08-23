import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--g-cream)" }}>
      <main style={{ flex: 1, position: "relative" }}>{children}</main>
      <BottomNav />
    </div>
  );
}
