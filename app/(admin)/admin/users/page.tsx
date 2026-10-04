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

const PAGE_SIZE = 50;

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
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { kpi, countries } = await getUserKpis();

  // One page of users first, then decorate only those.
  //
  // The previous query did the reverse: it GROUP BY'd the whole of unlocks, area_scans,
  // job_applications and payments, joined all four results to user_profiles, and only then applied
  // LIMIT 200. Every refresh aggregated every row of four tables to label a couple of screens'
  // worth of people. Scoping each subquery to this page's emails is the entire fix.
  const pageUsers = await sql`
    SELECT email, plan, dashboard_mode, credits, country, business_type, created_at, last_seen_at
      FROM user_profiles
     ORDER BY created_at DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;
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

  const totalPages = Math.max(1, Math.ceil(kpi.total / PAGE_SIZE));

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
    <div className="page-body">
      <div className="container-xl">
        <PageHeader pretitle="Analysis" title="Users" sub={`page ${page} of ${fmtN(totalPages)} · ${fmtN(kpi.total)} users · as of ${fmtDT(new Date())} IST`} />

        <CardRow>
          <StatCard label="Registrations" value={fmtN(kpi.total)} detail={`+${kpi.new7} in 7d`} tone={kpi.new7 > 0 ? "up" : undefined} />
          <StatCard label="Active 7d" value={fmtN(kpi.active7)} />
          <StatCard label="Jobs mode" value={fmtN(kpi.jobs_mode)} detail={`${fmtN(kpi.total - kpi.jobs_mode)} on leads`} />
          <StatCard label="Inactive 30d+" value={fmtN(kpi.inactive30)} detail="re-activation email target" />
          <StatCard label="Professional @domain" value={fmtN(kpi.professional)} detail="non free-mail" />
          <StatCard label="Onboarding incomplete" value={fmtN(kpi.unonboarded)} tone={kpi.unonboarded > 0 ? "bad" : undefined} />
        </CardRow>

        <div className="row row-cards mb-3">
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

        <div className="row row-cards">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">All users</h3>
              </div>
              <div className="card-body">
                <div className="text-secondary mb-3" style={{ fontSize: 12 }}>
                  Mode aur plan se filter karo, ya kisi row pe click karke quick view kholo. Filters
                  is page ke {rows.length} users pe lagte hain — doosre page ke liye neeche se badlo.
                </div>
                <UsersTable users={rows} />
                <Pager page={page} totalPages={totalPages} />
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
function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? `/admin/users?page=${page - 1}` : null;
  const next = page < totalPages ? `/admin/users?page=${page + 1}` : null;
  return (
    <div className="d-flex align-items-center justify-content-between mt-3">
      <div className="text-secondary" style={{ fontSize: 12 }}>
        Page {page} of {fmtN(totalPages)}
      </div>
      <div className="btn-list">
        {prev ? <Link className="btn btn-sm" href={prev}>← Previous</Link>
              : <span className="btn btn-sm disabled">← Previous</span>}
        {next ? <Link className="btn btn-sm" href={next}>Next →</Link>
              : <span className="btn btn-sm disabled">Next →</span>}
      </div>
    </div>
  );
}
