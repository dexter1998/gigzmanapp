import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";

/**
 * Everything the public /live page reads, in one cached batch.
 *
 * This page is linked from a pitch deck that gets forwarded, so it has to survive being opened by
 * a few hundred strangers at once. Every figure here comes out of one cached call with a 10-minute
 * window: the DB sees at most six queries per ten minutes no matter how many people load the page.
 * The page prints the timestamp it was computed at, so "live" is never claimed to mean more than
 * it does. RDS has already been taken down once by memory pressure; an uncached public dashboard
 * on the same instance as the product is the obvious way to do it again.
 */

const WINDOW_SECONDS = 600;

export type Bucket = { day: string; n: number };
export type Slice = { label: string; n: number };
export type CohortRow = { cohort: string; size: number; cells: (number | null)[] };
export type PublicUser = {
  masked: string; country: string | null; type: string | null;
  plan: string; joined: string; unlocks: number;
};
export type Quote = { text: string; name: string; place: string | null };

export type LiveData = {
  computedAt: string;
  users: { total: number; new7: number; new1: number; active7: number; onboarded: number };
  usage: { unlocks: number; unlockUsers: number; unlocks7: number; leads: number };
  money: { revenuePaise: number; paidUsers: number; paidOrders: number };
  outreach: { emails: number; partners: number };
  signups: Bucket[];
  unlocksDaily: Bucket[];
  byType: Slice[];
  byCountry: Slice[];
  depth: Slice[];
  cohorts: CohortRow[];
  recent: PublicUser[];
  quotes: Quote[];
};

/**
 * `t****n@gmail.com`. These are real people who signed up for a product, not public figures, and
 * this page has no login in front of it. The list is here to show that the users are real and
 * varied; the addresses themselves add nothing to that and cost the account holder something.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(3, Math.min(6, local.length - 2)))}${tail}@${domain}`;
}

export const getLiveData = unstable_cache(
  async (): Promise<LiveData> => {
    const [
      users, usage, money, emails, partners,
      signups, unlocksDaily, byType, byCountry, depth, cohortRows, recent, quotes,
    ] = await Promise.all([
      sql`SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7,
                 count(*) FILTER (WHERE created_at > now() - interval '1 day')::int AS new1,
                 count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int AS active7,
                 count(*) FILTER (WHERE onboarding_completed)::int AS onboarded
            FROM user_profiles`,
      // n_live_tup for `leads`: it is a ~300k-row table and this is a headline tile, not an audit.
      sql`SELECT (SELECT count(*)::int FROM unlocks) AS unlocks,
                 (SELECT count(DISTINCT unlocked_by)::int FROM unlocks) AS unlock_users,
                 (SELECT count(*)::int FROM unlocks
                   WHERE unlocked_at > now() - interval '7 days') AS unlocks7,
                 (SELECT coalesce(n_live_tup, 0)::int FROM pg_stat_user_tables
                   WHERE relname = 'leads') AS leads`,
      sql`SELECT coalesce(sum(amount_paise) FILTER (WHERE status = 'paid'), 0)::bigint AS paise,
                 count(DISTINCT user_email) FILTER (WHERE status = 'paid')::int AS paid_users,
                 count(*) FILTER (WHERE status = 'paid')::int AS paid_orders
            FROM payments`,
      sql`SELECT coalesce(n_live_tup, 0)::int AS n FROM pg_stat_user_tables
           WHERE relname = 'email_sends'`,
      sql`SELECT count(*)::int AS n FROM partner_applications`,

      sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
            FROM user_profiles WHERE created_at > now() - interval '30 days'
           GROUP BY 1 ORDER BY 1`,
      sql`SELECT to_char(date_trunc('day', unlocked_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
            FROM unlocks WHERE unlocked_at > now() - interval '30 days'
           GROUP BY 1 ORDER BY 1`,
      sql`SELECT coalesce(business_type, 'Not set') AS label, count(*)::int AS n
            FROM user_profiles GROUP BY 1 ORDER BY n DESC`,
      sql`SELECT coalesce(country, 'Unknown') AS label, count(*)::int AS n
            FROM user_profiles GROUP BY 1 ORDER BY n DESC LIMIT 8`,
      // How deep usage goes, not just whether it happened. `role` used to sit here, but
      // onboarding never writes that column -- the card rendered "Not set: everyone".
      sql`WITH per AS (
            SELECT p.email, (SELECT count(*) FROM unlocks u WHERE u.unlocked_by = p.email) AS n
              FROM user_profiles p
          )
          SELECT CASE WHEN n = 0 THEN 'No unlocks yet'
                      WHEN n BETWEEN 1 AND 5 THEN '1-5 leads'
                      WHEN n BETWEEN 6 AND 20 THEN '6-20 leads'
                      WHEN n BETWEEN 21 AND 50 THEN '21-50 leads'
                      ELSE '50+ leads' END AS label,
                 count(*)::int AS n
            FROM per GROUP BY 1
           ORDER BY min(CASE WHEN n = 0 THEN 0 WHEN n <= 5 THEN 1 WHEN n <= 20 THEN 2
                             WHEN n <= 50 THEN 3 ELSE 4 END)`,

      // Weekly signup cohorts, retained = unlocked at least one lead in that later week.
      // `unlocks` is the only activity table with a user key on it; chat lives behind `chats`,
      // and last_seen_at keeps just the latest timestamp, so neither can produce a cohort grid.
      sql`WITH c AS (
            SELECT email, date_trunc('week', created_at) AS cohort
              FROM user_profiles
             WHERE created_at > now() - interval '8 weeks'
          ), a AS (
            SELECT DISTINCT c.cohort, c.email,
                   (extract(epoch FROM date_trunc('week', u.unlocked_at) - c.cohort) / 604800)::int AS wk
              FROM c JOIN unlocks u ON u.unlocked_by = c.email
             WHERE u.unlocked_at >= c.cohort
          )
          SELECT to_char(c.cohort, 'YYYY-MM-DD') AS cohort,
                 count(DISTINCT c.email)::int AS size,
                 a.wk, count(DISTINCT a.email)::int AS n
            FROM c LEFT JOIN a ON a.cohort = c.cohort
           GROUP BY c.cohort, a.wk ORDER BY c.cohort`,

      sql`SELECT p.email, p.country, p.business_type, p.plan,
                 to_char(p.created_at, 'DD Mon') AS joined,
                 (SELECT count(*)::int FROM unlocks u WHERE u.unlocked_by = p.email) AS unlocks
            FROM user_profiles p ORDER BY p.created_at DESC LIMIT 40`,

      sql`SELECT partnership_reason AS text, full_name, city, country
            FROM partner_applications
           WHERE partnership_reason IS NOT NULL
             AND length(btrim(partnership_reason)) BETWEEN 40 AND 400
           ORDER BY submitted_at DESC LIMIT 12`,
    ]);

    // The cohort query returns one row per (cohort, week) plus a null-week row for cohorts with no
    // activity at all; fold it into a grid here rather than in SQL, where the empty case is fiddly.
    const grid = new Map<string, CohortRow>();
    for (const r of cohortRows as unknown as { cohort: string; size: number; wk: number | null; n: number }[]) {
      const row = grid.get(r.cohort) ?? { cohort: r.cohort, size: r.size, cells: [] };
      if (r.wk !== null && r.wk >= 0 && r.wk < 8) row.cells[r.wk] = r.n;
      grid.set(r.cohort, row);
    }
    const cohorts = [...grid.values()]
      .sort((a, b) => a.cohort.localeCompare(b.cohort))
      .map(r => ({ ...r, cells: Array.from({ length: 8 }, (_, i) => r.cells[i] ?? null) }));

    const u = users[0], g = usage[0], m = money[0];
    return {
      computedAt: new Date().toISOString(),
      users: { total: u.total, new7: u.new7, new1: u.new1, active7: u.active7, onboarded: u.onboarded },
      usage: { unlocks: g.unlocks, unlockUsers: g.unlock_users, unlocks7: g.unlocks7, leads: g.leads },
      money: { revenuePaise: Number(m.paise), paidUsers: m.paid_users, paidOrders: m.paid_orders },
      outreach: { emails: emails[0]?.n ?? 0, partners: partners[0]?.n ?? 0 },
      signups: signups as unknown as Bucket[],
      unlocksDaily: unlocksDaily as unknown as Bucket[],
      byType: byType as unknown as Slice[],
      byCountry: byCountry as unknown as Slice[],
      depth: depth as unknown as Slice[],
      cohorts,
      recent: (recent as unknown as { email: string; country: string | null; business_type: string | null;
                          plan: string; joined: string; unlocks: number }[])
        .map(r => ({ masked: maskEmail(r.email), country: r.country, type: r.business_type,
                     plan: r.plan, joined: r.joined, unlocks: r.unlocks })),
      // First name and city only. These are partnership applications from real agencies, not
      // testimonials anyone offered for publication -- the words show the demand, the company
      // identity is not ours to publish on a page that gets forwarded.
      quotes: (quotes as unknown as { text: string; full_name: string; city: string | null; country: string | null }[])
        .map(q => ({
          text: q.text.trim(),
          name: (q.full_name || "").trim().split(/\s+/)[0] || "An agency",
          place: q.city || q.country || null,
        })),
    };
  },
  ["live-public-metrics"],
  { revalidate: WINDOW_SECONDS, tags: ["live-public-metrics"] },
);
