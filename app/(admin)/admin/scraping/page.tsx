import { sql } from "@/lib/db";
import { PageHeader, StatCard, CardRow, Section, Table, Pill, fmtDT, fmtAgo, fmtN } from "../ui";

/** Scraping — wahi sawaal jo har baar poochhe jaate the, ek page par.
 *
 * Kya chal raha hai · kitna scrape hua · batch-wise kya nikla · tier-wise kitne mail aur kitne
 * business. Har number ke neeche uska 24-ghante ka delta, taaki "badh raha hai ya ruk gaya" dekhne
 * ke liye do check compare na karne pade -- ruka hua scraper bhi kal ka data disk par chhod jata
 * hai, isliye total badhna kuch sabit nahi karta; delta karta hai.
 *
 * Data `scrape_*` tables se aata hai, jahan har scraper (gosom, directory harvester, enrichment,
 * Apollo slice, Instagram) likhta hai. Registry isliye bani: Stickly campaign ne 4,52,463 domain
 * crawl kiye aur Mantis ne 1,64,437, dono ko ek doosre ka pata nahi tha, aur 21,150 domain dono ne
 * crawl kar liye. */

const WINDOWS = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", all: "all time" } as const;
type Win = keyof typeof WINDOWS;
const SINCE: Record<Win, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", all: "100 years" };
const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";   // har load par taaza, kyunki yeh live operations page hai

export default async function ScrapingPage({
  searchParams,
}: { searchParams: Promise<{ win?: string; p?: string; tool?: string }> }) {
  const sp = await searchParams;
  const win: Win = (sp.win && sp.win in WINDOWS ? sp.win : "7d") as Win;
  const page = Math.max(1, Number(sp.p || 1) || 1);
  const since = SINCE[win];
  const offset = (page - 1) * PAGE_SIZE;

  const [[kpi], [em], live, bySource, byBucket, runs, [runCount], daily, [backfill]] = await Promise.all([
    sql`SELECT count(*)::int                                                              AS domains,
               count(*) FILTER (WHERE first_seen  > now() - interval '24 hours')::int     AS domains_24h,
               count(*) FILTER (WHERE enriched_at IS NOT NULL)::int                       AS read_total,
               count(*) FILTER (WHERE enriched_at > now() - interval '24 hours')::int     AS read_24h,
               count(*) FILTER (WHERE enriched_at IS NULL AND NOT do_not_crawl)::int      AS pending,
               count(*) FILTER (WHERE do_not_crawl)::int                                  AS skipped,
               count(*) FILTER (WHERE status = 'alive')::int                              AS alive,
               count(*) FILTER (WHERE status = 'unreachable')::int                        AS dead,
               count(*) FILTER (WHERE campaigns LIKE '%,%')::int                          AS shared
          FROM scrape_domains`,
    sql`SELECT count(*)::int                                                          AS emails,
               count(*) FILTER (WHERE first_seen > now() - interval '24 hours')::int  AS emails_24h,
               count(DISTINCT domain)::int                                            AS businesses,
               count(*) FILTER (WHERE suppressed)::int                                AS suppressed,
               count(*) FILTER (WHERE bucket IN ('founder_named','person_own_domain','management_role','partnership','founder_desk'))::int AS people
          FROM scrape_emails`,
    // Abhi kya chal raha hai -- jo run khuli hai woh chal rahi hai
    sql`SELECT id, tool, campaign, workers, started_at,
               round(extract(epoch FROM (now() - started_at))/60)::int AS mins
          FROM scrape_runs WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 6`,
    sql`SELECT coalesce(first_source,'unknown') AS source, count(*)::int AS n,
               count(*) FILTER (WHERE first_seen > now() - ${since}::interval)::int AS recent,
               count(*) FILTER (WHERE enriched_at IS NOT NULL)::int AS read,
               count(*) FILTER (WHERE do_not_crawl)::int AS dead
          FROM scrape_domains GROUP BY 1 ORDER BY n DESC LIMIT 14`,
    // Tier-wise: kitne mail AUR kitne alag business -- ek business ke kai mail ho sakte hain
    sql`SELECT coalesce(bucket,'ungraded') AS bucket, count(*)::int AS mails,
               count(DISTINCT domain)::int AS businesses,
               count(*) FILTER (WHERE first_seen > now() - interval '24 hours')::int AS mails_24h,
               count(*) FILTER (WHERE suppressed)::int AS suppressed
          FROM scrape_emails GROUP BY 1 ORDER BY mails DESC`,
    sql`SELECT id, tool, campaign, started_at, finished_at, input_rows, new_domains, new_emails,
               skipped, workers, note,
               CASE WHEN finished_at IS NULL THEN NULL
                    ELSE greatest(1, round(extract(epoch FROM (finished_at - started_at))))::int END AS secs
          FROM scrape_runs
         WHERE started_at > now() - ${since}::interval ${sp.tool ? sql`AND tool = ${sp.tool}` : sql``}
         ORDER BY started_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    sql`SELECT count(*)::int AS n FROM scrape_runs
         WHERE started_at > now() - ${since}::interval ${sp.tool ? sql`AND tool = ${sp.tool}` : sql``}`,
    sql`SELECT date_trunc('day', enriched_at) AS day,
               count(*)::int AS read,
               sum(email_count)::int AS mails
          FROM scrape_domains WHERE enriched_at > now() - ${since}::interval
         GROUP BY 1 ORDER BY 1 DESC LIMIT 14`,
    // first_seen ek hi din par dhera hai to woh discovery date nahi, backfill ka waqt hai
    sql`SELECT count(*)::int AS n FROM scrape_domains WHERE first_seen::date = (
           SELECT first_seen::date FROM scrape_domains GROUP BY 1 ORDER BY count(*) DESC LIMIT 1)`,
  ]);

  const totalPages = Math.max(1, Math.ceil((runCount?.n ?? 0) / PAGE_SIZE));
  const qs = (o: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ win, tool: sp.tool, ...o })) if (v) u.set(k, String(v));
    return `/admin/scraping?${u}`;
  };
  const d24 = (n: number) => (n > 0 ? `+${fmtN(n)} in last 24h` : "nothing new in 24h");
  const backfilled = (backfill?.n ?? 0) > (kpi?.domains ?? 0) * 0.5;

  return (
    <div>
      <div className="mx-auto w-full max-w-[1400px]">
        <PageHeader
          pretitle="Lead generation" title="Scraping"
          sub={`${WINDOWS[win]} · as of ${fmtDT(new Date())} IST`}
          actions={
            <div className="flex gap-1">
              {(Object.keys(WINDOWS) as Win[]).map((w) => (
                <a key={w} href={qs({ win: w, p: 1 })}
                   className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold no-underline ${
                     w === win ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--rule)] text-[var(--ink-faint)]"}`}>
                  {WINDOWS[w]}
                </a>
              ))}
            </div>
          }
        />

        {/* Abhi kya chal raha hai -- pehla sawaal jo har baar poochha jata tha */}
        <Section title="Abhi kya chal raha hai"
                 note={live.length ? `${live.length} scraper chal rahe hain` : "koi scraper nahi chal raha"}>
          {live.length ? (
            <div className="flex flex-wrap gap-2">
              {live.map((r: any) => (
                <span key={r.id} className="inline-flex items-center gap-2 rounded-md border border-[var(--rule)] px-3 py-1.5 text-[12px]">
                  <Pill tone="info">running</Pill>
                  <b>{r.tool}</b>
                  <span className="text-[var(--ink-faint)]">{r.campaign ?? "—"} · {r.workers ?? "?"} workers · {r.mins}m</span>
                </span>
              ))}
            </div>
          ) : <p className="m-0 text-[12px] text-[var(--ink-faint)]">Sab idle. Pending queue: {fmtN(kpi?.pending ?? 0)} companies.</p>}
        </Section>

        <CardRow>
          <StatCard label="Companies found"   value={fmtN(kpi?.domains ?? 0)}    detail={d24(kpi?.domains_24h ?? 0)} />
          <StatCard label="Websites read"     value={fmtN(kpi?.read_total ?? 0)} detail={d24(kpi?.read_24h ?? 0)} />
          <StatCard label="Contacts found"    value={fmtN(em?.emails ?? 0)}      detail={d24(em?.emails_24h ?? 0)} />
          <StatCard label="Still to read"     value={fmtN(kpi?.pending ?? 0)}    detail="queue — scrapers isi se uthate hain" />
        </CardRow>

        <CardRow>
          <StatCard label="Businesses with a contact" value={fmtN(em?.businesses ?? 0)}
                    detail={`${fmtN(em?.people ?? 0)} ke paas naam wala person ya role hai`} />
          <StatCard label="Being skipped" value={fmtN(kpi?.skipped ?? 0)}
                    detail={`dead ya no mailbox — ~${fmtN((kpi?.skipped ?? 0) * 8)} page visits bachte hain`} />
          <StatCard label="Found twice" value={fmtN(kpi?.shared ?? 0)} detail="same company 2+ campaigns mein" />
          <StatCard label="Never mail" value={fmtN(em?.suppressed ?? 0)} detail="pehle bounce ho chuke" tone="bad" />
        </CardRow>

        {backfilled && (
          <Section title="Dates ke baare mein ek baat" note="padhne se pehle jaan lein">
            <p className="m-0 text-[12px] text-[var(--ink-muted)]">
              {fmtN(backfill?.n ?? 0)} companies ka <code>first_seen</code> ek hi din par hai — woh unka
              asli discovery din nahi, balki purane campaigns ka data registry mein daalne ka waqt hai
              (purani CSV files mein discovery date thi hi nahi). Isliye <b>&ldquo;Companies found&rdquo; ka 24-ghante
              ka delta aur niche ka daily table us backfill ke liye bharosemand nahi</b> hai. <b>&ldquo;Websites read&rdquo;</b>
              sahi hai — woh har crawl par likha jata hai, aur aage ke saare runs ke liye dono sahi rahenge.
            </p>
          </Section>
        )}

        <Table
          title="Tier-wise contacts" col="col-12 col-lg-7"
          note="named person shared inbox se behtar hai; info@/contact@ tier 1/2/3 mein bate hain taaki acche pehle jayein"
          head={["Contact type", { label: "Mails", num: true }, { label: "Businesses", num: true },
                 { label: "New 24h", num: true }, { label: "Never mail", num: true }]}
          rows={(byBucket ?? []).map((r: any) => [
            <span key={r.bucket} className="flex items-center gap-2">
              {r.bucket}
              {r.bucket?.startsWith("generic_t") && <Pill tone="mut">shared inbox</Pill>}
              {["founder_named", "person_own_domain", "founder_desk", "management_role"].includes(r.bucket) && <Pill tone="ok">person</Pill>}
            </span>,
            fmtN(r.mails), fmtN(r.businesses), r.mails_24h ? fmtN(r.mails_24h) : "—", r.suppressed ? fmtN(r.suppressed) : "—",
          ])}
          empty="Abhi koi contact grade nahi hua."
        />

        <Table
          title="Source-wise" col="col-12 col-lg-5"
          note="company ek hi baar gini jaati hai, uske khilaf jisne pehle dhoonda"
          head={["Source", { label: "Companies", num: true }, { label: "Read", num: true }, { label: "Dead", num: true }]}
          rows={(bySource ?? []).map((r: any) => [r.source, fmtN(r.n), fmtN(r.read), r.dead ? fmtN(r.dead) : "—"])}
          empty="Abhi kuch scrape nahi hua."
        />

        <Table
          title="Roz ka kaam" col="col-12"
          note={`websites read per day — yeh asli scraping activity hai (${WINDOWS[win]})`}
          head={["Day", { label: "Websites read", num: true }, { label: "Contacts mile", num: true }]}
          rows={(daily ?? []).map((r: any) => [fmtDT(new Date(r.day)).split(",")[0], fmtN(r.read), fmtN(r.mails ?? 0)])}
          empty="Is window mein koi crawl nahi hua."
        />

        <Table
          title="Batch-wise runs"
          note={`page ${page} of ${totalPages} · ${fmtN(runCount?.n ?? 0)} runs in ${WINDOWS[win]}${sp.tool ? ` · filter: ${sp.tool}` : ""}`}
          head={["Scraper", "Campaign", "Started", "Ran for", { label: "Batch size", num: true },
                 { label: "Read", num: true }, { label: "Contacts", num: true },
                 { label: "Speed", num: true }, { label: "Workers", num: true }, "State"]}
          rows={(runs ?? []).map((r: any) => [
            <a key={r.id} href={qs({ tool: r.tool, p: 1 })} className="no-underline text-[var(--accent)]">{r.tool}</a>,
            r.campaign ?? "—",
            fmtAgo(new Date(r.started_at)),
            r.secs ? (r.secs >= 60 ? `${Math.round(r.secs / 60)} min` : `${r.secs}s`) : "—",
            fmtN(r.input_rows ?? 0), fmtN(r.new_domains ?? 0), fmtN(r.new_emails ?? 0),
            r.secs && r.new_domains ? `${(r.new_domains / r.secs).toFixed(1)}/s` : "—",
            r.workers ?? "—",
            r.finished_at
              ? (String(r.note ?? "").includes("FAILED") ? <Pill key="s" tone="bad">failed</Pill> : <Pill key="s" tone="ok">done</Pill>)
              : <Pill key="s" tone="info">running</Pill>,
          ])}
          empty="Is window mein koi run nahi."
          actions={
            <div className="flex items-center gap-1">
              {sp.tool && <a href={qs({ tool: undefined, p: 1 })} className="rounded-md border border-[var(--rule)] px-2 py-1 text-[11px] no-underline text-[var(--ink-faint)]">clear filter</a>}
              <a href={qs({ p: Math.max(1, page - 1) })} className={`rounded-md border border-[var(--rule)] px-2 py-1 text-[11px] no-underline ${page <= 1 ? "pointer-events-none opacity-40" : ""} text-[var(--ink-faint)]`}>prev</a>
              <a href={qs({ p: Math.min(totalPages, page + 1) })} className={`rounded-md border border-[var(--rule)] px-2 py-1 text-[11px] no-underline ${page >= totalPages ? "pointer-events-none opacity-40" : ""} text-[var(--ink-faint)]`}>next</a>
            </div>
          }
        />
      </div>
    </div>
  );
}
