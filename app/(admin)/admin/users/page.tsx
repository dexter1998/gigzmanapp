import { unstable_cache } from "next/cache";
import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Table, Pill, fmtDT, fmtN } from "../ui";
import { UsersTable, type UserRow } from "./UsersTable";

/** Users — registrations, activity, aur "kaun serious hai" signals. Professional accounts =
 * non-free-mail domains (apni company ke email se aane wale log buyers hote hain). Covers both
 * dashboard_mode surfaces (leads + jobs) — a jobs-mode signup is still a user_profiles row, so it
 * was always counted here; it just used to render as a blank leads row. */

const FREE_MAIL = ["gmail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com", "proton.me", "rediffmail.com", "live.com", "aol.com"];

/**
 * Rows per page. The old version pulled 200 and filtered them in the browser; the cost was never
 * the 200 rows, it was the four whole-table aggregates built to decorate them.
 */
/**
 * The page re-renders on every request; only the expensive aggregates are cached (see below).
 *
 * The parent layout already sets this, but that does not stop Next from caching this segment's own
 * render per URL — which it did: /admin/users kept serving a render from when the table held four
 * rows, while /admin/users?page=2 came back correct because it had never been rendered before. An
 * admin page showing a number from an unknown point in the past is worse than a slow one.
 */
export const dynamic = "force-dynamic";

/**
 * Twenty, not fifty.
 *
 * The page is read, not scrolled — twenty rows is roughly what fits without one, and a table you
 * scroll is one you stop scanning. The server page still bounds the aggregate work; UsersTable's
 * own search runs over whatever is on screen.
 */
const PAGE_SIZE = 20;

/**
 * Whole-table counts, cached.
 *
 * These scan user_profiles every time and the numbers barely move minute to minute, but the page
 * recomputed them on every refresh — which on a burstable instance with no CPU credits left is
 * what turned "slow admin" into "admin times out". 60s is short enough that nothing here is
 * meaningfully stale and long enough that leaning on refresh costs one query set, not twenty.
 */
const getUserKpis = unstable_cache(
  async () => {
    const [[kpi], countries] = await Promise.all([
      sql`SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new7,
                 count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int AS active7,
                 count(*) FILTER (WHERE last_seen_at IS NULL OR last_seen_at < now() - interval '30 days')::int AS inactive30,
                 count(*) FILTER (WHERE split_part(email, '@', 2) != ALL(${FREE_MAIL}))::int AS professional,
                 count(*) FILTER (WHERE NOT onboarding_completed)::int AS unonboarded,
                 count(*) FILTER (WHERE dashboard_mode = 'jobs')::int AS jobs_mode
            FROM user_profiles`,
      sql`SELECT coalesce(country, 'Unknown') AS country, count(*)::int AS n
            FROM user_profiles GROUP BY 1 ORDER BY n DESC LIMIT 10`,
    ]);
    return { kpi, countries };
  },
  ["admin:users:kpis"],
  { revalidate: 60 },
);

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  // Server-side because it has to reach every account. The table's own dropdowns stay client-side —
  // they narrow what is already on screen, which is a different job from finding someone.
  const q = (sp.q ?? "").trim();
  const like = `%${q.toLowerCase()}%`;

  const { kpi, countries } = await getUserKpis();

  // One page of users first, then decorate only those.
  //
  // The previous query did the reverse: it GROUP BY'd the whole of unlocks, area_scans,
  // job_applications and payments, joined all four results to user_profiles, and only then applied
  // LIMIT 200. Every refresh aggregated every row of four tables to label a couple of screens'
  // worth of people. Scoping each subquery to this page's emails is the entire fix.
  const [pageUsers, [matchCount]] = await Promise.all([
    sql`
      SELECT email, plan, dashboard_mode, credits, country, business_type, created_at, last_seen_at
        FROM user_profiles
       ${q ? sql`WHERE lower(email) LIKE ${like} OR lower(coalesce(business_type, '')) LIKE ${like}` : sql``}
       ORDER BY created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
    q
      ? sql`SELECT count(*)::int AS n FROM user_profiles
             WHERE lower(email) LIKE ${like} OR lower(coalesce(business_type, '')) LIKE ${like}`
      : sql`SELECT 0::int AS n`,
  ]);
  const emails = pageUsers.map((r) => r.email as string);

  const users = emails.length
    ? await sql`
        SELECT up.email, up.plan, up.dashboard_mode, up.credits, up.country, up.business_type,
               up.created_at, up.last_seen_at,
               coalesce(un.n, 0)::int AS unlocks, coalesce(sc.n, 0)::int AS scans,
               coalesce(ap.n, 0)::int AS applications,
               coalesce(pay.paise, 0)::bigint AS paid_paise
          FROM user_profiles up
          LEFT JOIN (SELECT unlocked_by, count(*) AS n FROM unlocks
                      WHERE unlocked_by = ANY(${emails}) GROUP BY 1) un ON un.unlocked_by = up.email
          LEFT JOIN (SELECT requested_by, count(*) AS n FROM area_scans
                      WHERE requested_by = ANY(${emails}) GROUP BY 1) sc ON sc.requested_by = up.email
          LEFT JOIN (SELECT user_email, count(*) AS n FROM job_applications
                      WHERE user_email = ANY(${emails}) GROUP BY 1) ap ON ap.user_email = up.email
          LEFT JOIN (SELECT user_email, sum(amount_paise) AS paise FROM payments
                      WHERE status = 'paid' AND user_email = ANY(${emails}) GROUP BY 1) pay ON pay.user_email = up.email
         WHERE up.email = ANY(${emails})
         ORDER BY up.created_at DESC
      `
    : [];

  const resultCount = q ? matchCount.n : kpi.total;
  const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));

  const rows: UserRow[] = users.map((r) => ({
    email: r.email,
    plan: r.plan,
    dashboardMode: r.dashboard_mode,
    credits: r.credits,
    unlocks: r.unlocks,
    scans: r.scans,
    applications: r.applications,
    paidPaise: Number(r.paid_paise),
    country: r.country,
    businessType: r.business_type,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
    pro: !FREE_MAIL.includes(String(r.email).split("@")[1] ?? ""),
  }));

  return (
    <div className="">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader pretitle="Analysis" title="Users" sub={q ? `${fmtN(resultCount)} matching “${q}” · page ${page} of ${fmtN(totalPages)}` : `page ${page} of ${fmtN(totalPages)} · ${fmtN(kpi.total)} users · as of ${fmtDT(new Date())} IST`} />

        <CardRow>
          <StatCard label="Registrations" value={fmtN(kpi.total)} detail={`+${kpi.new7} in 7d`} tone={kpi.new7 > 0 ? "up" : undefined} />
          <StatCard label="Active 7d" value={fmtN(kpi.active7)} />
          <StatCard label="Jobs mode" value={fmtN(kpi.jobs_mode)} detail={`${fmtN(kpi.total - kpi.jobs_mode)} on leads`} />
          <StatCard label="Inactive 30d+" value={fmtN(kpi.inactive30)} detail="re-activation email target" />
          <StatCard label="Professional @domain" value={fmtN(kpi.professional)} detail="non free-mail" />
          <StatCard label="Onboarding incomplete" value={fmtN(kpi.unonboarded)} tone={kpi.unonboarded > 0 ? "bad" : undefined} />
        </CardRow>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-lg-6" title="Country split" note="Client IP se one-time capture — purane users 'Unknown' rahenge jab tak wo dobara login nahi karte."
            head={["Country", { label: "Users", num: true }]}
            rows={countries.map((c) => [c.country, fmtN(c.n)])}
            empty="koi data nahi" />
          <Table col="col-lg-6" title="Signal ⇒ kya dekhna" note="Analysis shortcuts"
            head={["Signal", "Matlab"]}
            rows={[
              [<Pill key="1" tone="ok">PAID</Pill>, "payments.status='paid' wala user — inki activity sabse dhyan se"],
              [<Pill key="2" tone="info">PRO @</Pill>, "company domain — outreach/partnership candidate"],
              [<Pill key="3" tone="mut">JOBS</Pill>, "dashboard_mode='jobs' — job-seeker side, alag stats matter (applications, not scans)"],
            ]}
            empty="" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-full">
            <div className="flex h-full min-w-0 flex-col rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)]">
              <div className="rule-b flex items-center justify-between gap-3 px-4 py-3">
                <h3 className="text-[13px] font-semibold text-[var(--ink)]">All users</h3>
              </div>
              <div className="p-4">
                <div className="text-[var(--ink-muted)] mb-3" style={{ fontSize: 12 }}>
                  Mode aur plan se filter karo, ya kisi row pe click karke quick view kholo. Filters
                  is page ke {rows.length} users pe lagte hain — doosre page ke liye neeche se badlo.
                </div>
                <form method="GET" className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search every account by email or business type…"
                    aria-label="Search users"
                    className="w-full max-w-[340px] rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-1.5 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
                  />
                  <button type="submit" className="rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)]">Search</button>
                  {q && <Link href="/admin/users" className="text-[11.5px] text-[var(--ink-faint)] no-underline">Clear</Link>}
                </form>
                <UsersTable users={rows} />
                <Pager page={page} totalPages={totalPages} q={q} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Prev/next only. Numbered pages would need a count per link and this list is browsed, not
 *  navigated to a specific offset. */
function Pager({ page, totalPages, q }: { page: number; totalPages: number; q: string }) {
  if (totalPages <= 1) return null;
  const qs = (n: number) => `/admin/users?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const prev = page > 1 ? qs(page - 1) : null;
  const next = page < totalPages ? qs(page + 1) : null;
  return (
    <div className="flex items-center justify-between mt-3">
      <div className="text-[var(--ink-muted)]" style={{ fontSize: 12 }}>
        Page {page} of {fmtN(totalPages)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {prev ? <Link className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline" href={prev}>← Previous</Link>
              : <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline disabled">← Previous</span>}
        {next ? <Link className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline" href={next}>Next →</Link>
              : <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline disabled">Next →</span>}
      </div>
    </div>
  );
}
