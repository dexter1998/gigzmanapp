/**
 * The pure half of lib/nav-badges.ts — section names, the path → section map and key validation —
 * so the client hook can share them without pulling the database into the bundle.
 */
export const NAV_SECTIONS = ["inbox", "leads", "campaigns", "chat"] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];
/** Counts per section, plus which chats have a finished run you have not opened (newest first). */
export type NavBadges = Record<NavSection, number> & { chatIds: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The seen-key a path belongs to, so landing there marks it seen. */
export function sectionForPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const chat = pathname.match(/^\/chat\/([0-9a-f-]{36})(?:\/|$)/i);
  if (chat) return `chat:${chat[1].toLowerCase()}`;
  if (pathname === "/inbox" || pathname.startsWith("/inbox/")) return "inbox";
  if (pathname === "/my-leads" || pathname.startsWith("/my-leads/")) return "leads";
  if (pathname === "/campaigns") return "campaigns"; // the list, not one campaign's builder
  return null;
}

/** 'inbox' | 'leads' | 'campaigns' | 'chat' | 'chat:<uuid>' — anything else is rejected. */
export function isSeenKey(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if ((NAV_SECTIONS as readonly string[]).includes(s)) return true;
  return s.startsWith("chat:") && UUID.test(s.slice(5));
}

/** "99+" past the server's cap. */
export const badgeText = (n: number) => (n > 99 ? "99+" : String(n));
