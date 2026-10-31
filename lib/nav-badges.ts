/**
 * Sidebar notification counts — "something is new in Inbox / Leads / Campaigns / a chat".
 *
 * The server is the source of truth. nav_seen holds, per (user, section), when the user last looked;
 * each section has ONE counter here: a small indexed COUNT of what happened after that time, capped
 * at CAP rows so a busy account never turns the poll into a scan (the UI shows "99+").
 *
 * Adding a section = one entry in COUNTERS + one in SECTION_FOR_PATH. Nothing else changes: the API
 * route, the client hook and the sidebar all iterate over these.
 *
 * What counts as "new" per section (chosen from what the data actually records):
 *  - inbox     — real replies (kind 'reply', not a reply to the user's own test send) STORED after
 *                seen_at and still unread. created_at, not received_at: received_at is the message's
 *                own date, so a late sync would otherwise slip under seen_at.
 *  - leads     — ranked rows of runs that finished (done/stopped) after seen_at: exactly the rows the
 *                Leads page lists (lib/v2/lms.ts only shows finished runs), so the count is "new
 *                leads in your lists".
 *  - campaigns — campaigns that reached 'done' after seen_at, plus AI test calls that settled after
 *                seen_at. These are the only campaign-side changes the system makes on its own;
 *                pause/resume/approve are the user's own clicks, and replies already count in inbox.
 *                (A user's own "stop" also lands on 'done' — the client re-marks a section seen while
 *                you are on it, so a stop clicked on /campaigns never badges.)
 *  - chat      — chats with a run that FINISHED after both the chat baseline and that chat's own
 *                seen time ('chat:<id>'). The client marks the open chat seen, so a run you watched
 *                finish never counts.
 */
import { sql } from "@/lib/db";
import { NAV_SECTIONS, isSeenKey, type NavSection, type NavBadges } from "./nav-sections";

export { NAV_SECTIONS, isSeenKey, sectionForPath, type NavSection, type NavBadges } from "./nav-sections";

export const CAP = 100;

type Counted = { count: number; ids?: string[] };
type Counter = (email: string, since: Date) => Promise<Counted>;

const one = (rows: readonly { n: number }[]) => ({ count: Number(rows[0]?.n ?? 0) });

const COUNTERS: Record<NavSection, Counter> = {
  inbox: async (email, since) => one(await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      SELECT 1 FROM v2_inbox
      WHERE user_email = ${email} AND created_at > ${since}
        AND kind = 'reply' AND NOT is_test AND read_at IS NULL
      LIMIT ${CAP}
    ) x`),

  leads: async (email, since) => one(await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      SELECT 1 FROM v2_runs u JOIN v2_results r ON r.run_id = u.id AND r.rank IS NOT NULL
      WHERE u.user_email = ${email} AND u.finished_at > ${since} AND u.status IN ('done', 'stopped')
      LIMIT ${CAP}
    ) x`),

  campaigns: async (email, since) => one(await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      (SELECT 1 FROM v2_campaigns WHERE user_email = ${email} AND status = 'done' AND updated_at > ${since} LIMIT ${CAP})
      UNION ALL
      (SELECT 1 FROM v2_voice_tests WHERE user_email = ${email} AND finished_at > ${since} LIMIT ${CAP})
      LIMIT ${CAP}
    ) x`),

  chat: async (email, since) => {
    const rows = await sql<{ chat_id: string }[]>`
      SELECT u.chat_id::text AS chat_id
      FROM v2_runs u
      LEFT JOIN nav_seen s ON s.user_email = u.user_email AND s.section = 'chat:' || u.chat_id::text
      WHERE u.user_email = ${email} AND u.finished_at > ${since} AND u.chat_id IS NOT NULL
      GROUP BY u.chat_id
      HAVING max(u.finished_at) > coalesce(max(s.seen_at), ${since})
      ORDER BY max(u.finished_at) DESC
      LIMIT ${CAP}`;
    return { count: rows.length, ids: rows.map((r) => r.chat_id) };
  },
};

/** Every count for one user, in parallel. Missing baselines are created at now() (counts 0). */
export async function getNavBadges(email: string): Promise<NavBadges> {
  const rows = await sql<{ section: string; seen_at: Date }[]>`
    SELECT section, seen_at FROM nav_seen WHERE user_email = ${email} AND section = ANY(${NAV_SECTIONS as unknown as string[]})`;
  const seen = new Map(rows.map((r) => [r.section, r.seen_at]));
  const missing = NAV_SECTIONS.filter((s) => !seen.has(s));
  if (missing.length) {
    const made = await sql<{ section: string; seen_at: Date }[]>`
      INSERT INTO nav_seen (user_email, section, seen_at)
      SELECT ${email}, s, now() FROM unnest(${missing as string[]}::text[]) AS s
      ON CONFLICT (user_email, section) DO UPDATE SET seen_at = nav_seen.seen_at
      RETURNING section, seen_at`;
    for (const r of made) seen.set(r.section, r.seen_at);
  }
  const results = await Promise.all(NAV_SECTIONS.map((s) => COUNTERS[s](email, seen.get(s)!).catch(() => ({ count: 0 }) as Counted)));
  const out = { chatIds: [] as string[] } as NavBadges;
  NAV_SECTIONS.forEach((s, i) => { out[s] = results[i].count; });
  out.chatIds = results[NAV_SECTIONS.indexOf("chat")].ids ?? [];
  return out;
}

/** The user looked at a section now. Monotonic: a late request never moves seen_at backwards. */
export async function markNavSeen(email: string, key: string): Promise<void> {
  if (!isSeenKey(key)) return;
  await sql`
    INSERT INTO nav_seen (user_email, section, seen_at) VALUES (${email}, ${key}, now())
    ON CONFLICT (user_email, section) DO UPDATE SET seen_at = GREATEST(nav_seen.seen_at, EXCLUDED.seen_at)`;
}
