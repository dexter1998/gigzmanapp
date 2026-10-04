import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Table, Pill, HealthItem, fmtAgo, fmtDT, fmtN } from "../ui";

/** pSEO — registry ki sehat: kitne pages live, kitne gate par waiting, kal ke cron ne kya kiya.
 * GSC impressions/keywords tab aayenge jab one-time OAuth ho jaye (scripts/gsc-authorize.ts). */

function nextPseoRun(): Date {
  const next = new Date();
  next.setUTCHours(5, 0, 0, 0); // scraper EC2 crontab: 05:00 UTC = 10:30 IST
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export default async function PseoPage() {
  const [[kpi], byType, waiting, candidates, topPages, [lastRun]] = await Promise.all([
    sql`SELECT count(*)::int AS total,
               count(*) FILTER (WHERE status = 'published')::int AS published,
               count(*) FILTER (WHERE status = 'noindex')::int AS noindex,
               count(*) FILTER (WHERE status = 'withheld')::int AS withheld,
               count(*) FILTER (WHERE status = 'withheld' AND gate_pass_streak = 1)::int AS one_pass,
               count(*) FILTER (WHERE first_published_at > now() - interval '30 days')::int AS promoted30
        FROM pseo_pages`,
    sql`SELECT page_type, count(*)::int AS total, count(*) FILTER (WHERE status = 'published')::int AS pub
        FROM pseo_pages GROUP BY 1 ORDER BY total DESC`,
    sql`SELECT page_key, qualifying_leads, total_leads, gate_pass_streak, stats_computed_at
        FROM pseo_pages WHERE status = 'withheld' AND gate_pass_streak > 0
        ORDER BY qualifying_leads DESC LIMIT 15`,
    sql`SELECT token, suggested_name, qualifying_count, lead_count FROM pseo_location_candidates
        WHERE decision IS NULL ORDER BY qualifying_count DESC LIMIT 10`,
    sql`SELECT page_key, page_type, qualifying_leads, total_leads, first_published_at, last_material_change_at
        FROM pseo_pages WHERE status = 'published' ORDER BY qualifying_leads DESC LIMIT 20`,
    sql`SELECT started_at, ok, summary, error FROM cron_runs WHERE job = 'pseo' ORDER BY started_at DESC LIMIT 1`,
  ]);

  const summary = (lastRun?.summary ?? null) as { evaluated?: number; revalidated?: number; promoted?: number } | null;

  return (
    <div className="">
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader pretitle="Systems" title="Programmatic SEO" sub={`as of ${fmtDT(new Date())} IST`} />

        <CardRow>
          <StatCard label="Pages total" value={fmtN(kpi.total)} />
          <StatCard label="Published" value={fmtN(kpi.published)} detail={`+${kpi.promoted30} promoted in 30d`} tone={kpi.promoted30 > 0 ? "up" : undefined} />
          <StatCard label="Noindex" value={fmtN(kpi.noindex)} />
          <StatCard label="Withheld (gate fail)" value={fmtN(kpi.withheld)} />
          <StatCard label="1 pass — promotion ke kareeb" value={fmtN(kpi.one_pass)} detail="agla pass = publish" />
        </CardRow>

        <CardRow>
          <HealthItem col="col-lg-4" tone={lastRun ? (lastRun.ok ? "ok" : "bad") : "mut"} title="Last refresh cron"
            sub={lastRun
              ? (lastRun.ok
                ? `${fmtAgo(lastRun.started_at)} · evaluated ${summary?.evaluated ?? "?"} · revalidated ${summary?.revalidated ?? "?"} · promoted ${summary?.promoted ?? "?"}`
                : `FAIL ${fmtAgo(lastRun.started_at)} — ${lastRun.error?.slice(0, 60)}`)
              : "abhi koi recorded run nahi (collector naya hai)"} />
          <HealthItem col="col-lg-4" tone="ok" title="Next refresh" sub={`${fmtDT(nextPseoRun())} IST (daily 10:30 IST)`} />
          <HealthItem col="col-lg-4" tone="mut" title="GSC impressions / keywords" sub="one-time OAuth pending — scripts/gsc-authorize.ts chalani hai" />
        </CardRow>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-lg-6" title="By page type"
            head={["Type", { label: "Total", num: true }, { label: "Published", num: true }]}
            rows={byType.map((t) => [t.page_type, fmtN(t.total), fmtN(t.pub)])}
            empty="registry khali hai" />
          <Table col="col-lg-6" title="Location candidates (approval waiting)" note="Auto-detected; slug approve karna human decision hai."
            head={["Token", "Suggested", { label: "Qualifying", num: true }, { label: "Leads", num: true }]}
            rows={candidates.map((c) => [c.token, c.suggested_name, fmtN(c.qualifying_count), fmtN(c.lead_count)])}
            empty="koi pending candidate nahi" />
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <Table col="col-12" title="Gate par waiting (streak 1+)" note="Do consecutive pass chahiye promotion ke liye — ye pages ek pass kar chuke hain."
            head={["Page", { label: "Qualifying", num: true }, { label: "Total leads", num: true }, { label: "Streak", num: true }, "Stats computed"]}
            rows={waiting.map((w) => [w.page_key, fmtN(w.qualifying_leads), fmtN(w.total_leads),
              <Pill key="s" tone="warn">{w.gate_pass_streak}/2</Pill>, fmtAgo(w.stats_computed_at)])}
            empty="koi page gate par nahi" />
        </div>

        <div className="flex flex-wrap gap-3">
          <Table col="col-12" title="Top published pages (by qualifying leads)" note="Cannibalization check: same city ke multiple published pages yahan saath dikhte hain — overlap ho to lowest wale ko dekho."
            head={["Page", "Type", { label: "Qualifying", num: true }, { label: "Total", num: true }, "First published", "Last material change"]}
            rows={topPages.map((p) => [p.page_key, p.page_type, fmtN(p.qualifying_leads), fmtN(p.total_leads),
              fmtDT(p.first_published_at), fmtAgo(p.last_material_change_at)])}
            empty="abhi koi published page nahi" />
        </div>
      </div>
    </div>
  );
}
