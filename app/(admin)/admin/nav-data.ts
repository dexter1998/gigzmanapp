/** Single source of truth for admin nav structure — consumed by both the sidebar (nav.tsx) and
 * the top header's breadcrumb (Header.tsx), so a renamed/added page can't drift between the two. */
export const NAV: { group: string; storageKey: string; items: { href: string; label: string; icon: string }[] }[] = [
  { group: "Analysis", storageKey: "adm-nav-analysis", items: [
    { href: "/admin", label: "Overview", icon: "overview" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/economics", label: "Economics", icon: "economics" },
    { href: "/admin/inbound", label: "Inbound", icon: "inbound" },
    { href: "/admin/widget", label: "Founder inbox", icon: "inbound" },
  ]},
  { group: "Jobs mode", storageKey: "adm-nav-jobs", items: [
    { href: "/admin/jobs", label: "Jobs ops", icon: "jobs" },
  ]},
  { group: "Billing", storageKey: "adm-nav-billing", items: [
    { href: "/admin/grants", label: "Plan grants", icon: "economics" },
  ]},
  { group: "Systems", storageKey: "adm-nav-systems", items: [
    { href: "/admin/mailing", label: "Mailing", icon: "mailing" },
    { href: "/admin/pseo", label: "pSEO", icon: "pseo" },
    { href: "/admin/health", label: "Health & Logs", icon: "health" },
  ]},
];

// Kept separate from NAV on purpose — see nav.tsx. Exported too so Header.tsx's pathname lookup
// covers it (visiting /admin-campaigns/* should still show a correct breadcrumb, not "—").
export const CAMPAIGNS_LINK = { href: "/admin-campaigns", label: "Campaigns (sends email)", icon: "campaigns", group: "Outreach" };

/** Longest-prefix match so nested routes (e.g. /admin/users/foo@bar.com) resolve to their parent
 * nav item's group + label, same rule nav.tsx's active-state check uses. */
export function resolveBreadcrumb(pathname: string): { group: string; label: string } | null {
  let best: { group: string; label: string; href: string } | null = null;
  const all = [...NAV.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group }))), CAMPAIGNS_LINK];
  for (const item of all) {
    const matches = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    if (matches && (!best || item.href.length > best.href.length)) best = item;
  }
  return best ? { group: best.group, label: best.label } : null;
}
