import Link from "next/link";
import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Table, Pill, fmtAgo, fmtDT, fmtN } from "../ui";

/** Jobs mode — the second product surface, previously invisible in admin. Same three-tier shape
 * as Overview: KPIs first (is the surface healthy + is anyone using it), then breakdowns (where
 * is it stuck), then the raw rows for a specific "which company / which applicant" question. */

function scrapeTone(status: string): "ok" | "warn" | "bad" | "mut" | "info" {
  if (status === "ok" || status === "done") return "ok";
  if (status === "pending") return "warn";
  if (status === "failed") return "bad";
  return "mut"; // no_careers_page
}

function appTone(status: string): "ok" | "warn" | "bad" | "mut" | "info" {
  if (status === "offer") return "ok";
  if (status === "interviewing" || status === "applied") return "info";
  if (status === "rejected") return "bad";
  return "mut"; // saved
}

export default async function JobsPage() {
  const [
    [modeSplit], [companyKpi], [listingKpi], [applicantKpi], [bandKpi],
    scrapeBreakdown, statusBreakdown, familyBreakdown, companies, applications,
  ] = await Promise.all([
    sql`SELECT count(*) FILTER (WHERE dashboard_mode = 'jobs')::int AS jobs_users,
               count(*) FILTER (WHERE dashboard_mode = 'jobs' AND created_at > now() - interval '7 days')::int AS jobs_new7,
               count(*)::int AS all_users
        FROM user_profiles`,
    sql`SELECT count(*)::int AS total,
               count(*) FILTER (WHERE scrape_status IN ('ok','done'))::int AS ok,
               count(*) FILTER (WHERE next_refresh_at IS NOT NULL AND next_refresh_at < now() AND scrape_status <> 'no_careers_page')::int AS overdue
        FROM job_companies`,
    sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_open)::int AS open,
               count(*) FILTER (WHERE first_seen_at > now() - interval '7 days')::int AS new7
        FROM job_listings`,
    sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_complete)::int AS complete FROM applicant_profiles`,
    sql`SELECT count(*)::int AS total, max(scraped_at) AS last_at FROM company_salary_bands`,
    sql`SELECT scrape_status, count(*)::int AS n FROM job_companies GROUP BY 1 ORDER BY n DESC`,
    sql`SELECT status, count(*)::int AS n FROM job_applications GROUP BY 1 ORDER BY n DESC`,
    sql`SELECT coalesce(job_family, 'unclassified') AS family, count(*)::int AS n FROM job_listings WHERE is_open GROUP BY 1 ORDER BY n DESC LIMIT 8`,
    sql`SELECT domain, company_name, scrape_status, ats_platform, scraped_at, next_refresh_at, scrape_error
        FROM job_companies ORDER BY scraped_at DESC NULLS LAST LIMIT 20`,
    sql`SELECT ja.status, ja.match_score, ja.applied_at, ja.created_at, ja.user_email, jl.title, jc.company_name
        FROM job_applications ja
        JOIN job_listings jl ON jl.id = ja.job_id
        JOIN job_companies jc ON jc.id = jl.company_id
        ORDER BY ja.created_at DESC LIMIT 20`,
  ]);

  const jobsAdoptionPct = modeSplit.all_users > 0 ? Math.round((modeSplit.jobs_users / modeSplit.all_users) * 100) : 0;
  const applicantCompletePct = applicantKpi.total > 0 ? Math.round((applicantKpi.complete / applicantKpi.total) * 100) : 0;
  const companyOkPct = companyKpi.total > 0 ? Math.round((companyKpi.ok / companyKpi.total) * 100) : 0;

  return (
    <div className="page-body">
      <div className="container-xl">
        <PageHeader pretitle="Jobs mode" title="Jobs mode" sub={`as of ${fmtDT(new Date())} IST`} />

        <CardRow>
          <StatCard label="Jobs-mode users" value={fmtN(modeSplit.jobs_users)} detail={`${jobsAdoptionPct}% of all users · +${modeSplit.jobs_new7} in 7d`} tone={modeSplit.jobs_new7 > 0 ? "up" : undefined} />
          <StatCard label="Companies scraped" value={fmtN(companyKpi.total)} detail={`${companyOkPct}% resolved ok`} tone={companyKpi.overdue > 0 ? "bad" : undefined} />
          <StatCard label="Refresh overdue" value={fmtN(companyKpi.overdue)} detail="next_refresh_at passed" tone={companyKpi.overdue > 0 ? "bad" : undefined} />
          <StatCard label="Open listings" value={fmtN(listingKpi.open)} detail={`${fmtN(listingKpi.total)} ever seen · +${listingKpi.new7} in 7d`} />
          <StatCard label="Applicant profiles" value={fmtN(applicantKpi.total)} detail={`${applicantCompletePct}% complete`} />
          <StatCard label="Salary bands" value={fmtN(bandKpi.total)} detail={bandKpi.last_at ? `last scraped ${fmtAgo(bandKpi.last_at)}` : "kabhi scrape nahi hua"} tone={!bandKpi.last_at ? "bad" : undefined} />
        </CardRow>

        <div className="row row-cards mb-3">
          <Table col="col-lg-6" title="Careers-page scrape health" note="Har company ek baar resolve hoti hai, phir next_refresh_at pe dobara — yahan dekho scraper kahin stuck toh nahi."
            head={["Status", { label: "Companies", num: true }]}
            rows={scrapeBreakdown.map((r) => [<Pill key="s" tone={scrapeTone(r.scrape_status)}>{r.scrape_status}</Pill>, fmtN(r.n)])}
            empty="koi company nahi" />
          <Table col="col-lg-6" title="Applications funnel" note="saved → applied → interviewing → offer/rejected."
            head={["Status", { label: "Applications", num: true }]}
            rows={statusBreakdown.map((r) => [<Pill key="s" tone={appTone(r.status)}>{r.status}</Pill>, fmtN(r.n)])}
            empty="koi application nahi" />
        </div>

        <div className="row row-cards mb-3">
          <Table col="col-12" title="Open listings by family" note="Top 8 — coverage kis role-type mein sabse zyada hai."
            head={["Job family", { label: "Open listings", num: true }]}
            rows={familyBreakdown.map((r) => [r.family, fmtN(r.n)])}
            empty="koi open listing nahi" />
        </div>

        <div className="row row-cards mb-3">
          <Table col="col-12" title="Recently scraped companies" note="Latest 20 — resolve fail ya no_careers_page yahan turant dikhega."
            head={["Domain", "Company", "Status", "ATS", "Scraped", "Next refresh"]}
            rows={companies.map((c) => [
              c.domain,
              c.company_name ?? "—",
              <span key="s"><Pill tone={scrapeTone(c.scrape_status)}>{c.scrape_status}</Pill>{c.scrape_error && <span className="wrap text-danger d-block" style={{ fontSize: 11, marginTop: 3 }}>{String(c.scrape_error).slice(0, 90)}</span>}</span>,
              c.ats_platform ?? "—",
              c.scraped_at ? fmtAgo(c.scraped_at) : "kabhi nahi",
              c.next_refresh_at ? fmtDT(c.next_refresh_at) : "—",
            ])}
            empty="koi company scrape nahi hui" />
        </div>

        <div className="row row-cards">
          <Table col="col-12" title="Recent applications" note="Latest 20 — user profile ek click door hai."
            head={["When", "Applicant", "Role", "Company", { label: "Match", num: true }, "Status"]}
            rows={applications.map((a) => [
              fmtDT(a.created_at),
              <Link key="u" href={`/admin/users/${encodeURIComponent(a.user_email)}`}>{a.user_email}</Link>,
              a.title,
              a.company_name ?? "—",
              a.match_score != null ? `${a.match_score}%` : "—",
              <Pill key="s" tone={appTone(a.status)}>{a.status}</Pill>,
            ])}
            empty="koi application nahi" />
        </div>
      </div>
    </div>
  );
}
