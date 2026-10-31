"use client";

import { usePathname } from "next/navigation";
import { CreditsIndicator } from "./CreditsIndicator";
import { isSettingsRoute } from "./settings/SettingsShell";

/**
 * The credits pill, top-right on every app screen. Settings hides it (billing shows the balance in
 * full there), the map home keeps its own copy inside its toolbar, and the campaign editor hides it
 * because it sat on top of Send test / Approve.
 */
export function TopCredits() {
  const path = usePathname() ?? "";
  if (isSettingsRoute(path) || path === "/home" || path.startsWith("/home/") || path.startsWith("/jobs") || path.startsWith("/campaigns/")) return null;
  // On phones the Inbox thread header sits where the pill would; the pill moves out of its way there.
  return (
    <div className={path.startsWith("/inbox") ? "top-credits top-credits--inbox" : "top-credits"}>
      <CreditsIndicator />
    </div>
  );
}
