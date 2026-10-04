import { sql } from "@/lib/db";
import { PageHeader, CardRow, StatCard, Section, Table, Pill, fmtN } from "../../admin/ui";
import { IconFlame, IconSun, IconSnowflake, IconBan, IconInfoCircle } from "@tabler/icons-react";

/**
 * Prospect analytics: how many people are in each state, WHY they are there, and which scrape
 * they came from.
 *
 * The campaign page's funnel answers "where is everybody in this campaign". This answers the two
 * questions that decide what to do next: which prospects are worth a human's time right now, and
 * which lead source is worth scraping again. A single blended number answers neither — an audited
 * agency list and a registry dump behave nothing alike, and averaging them describes neither.
 *
 * Every state carries its reason inline rather than in a legend. A number whose meaning lives
 * somewhere else gets misread, and these numbers decide who gets mailed.
 */
export const dynamic = "force-dynamic";

/** Below this many reached people, a percentage is noise rather than a measurement. */
const MIN_RATE_SAMPLE = 100;

type Params = { searchParams: Promise<{ campaign?: string }> };

const WHY: Record<string, { label: string; why: string; tone: "ok" | "warn" | "bad" | "mut" | "info" }> = {
  hot: { label: "Hot", why: "Click kiya — asli intent signal. Apple MPP open fake kar sakta hai, click nahi.", tone: "ok" },
  warm: { label: "Warm", why: "Mail khola par click nahi. Address zinda hai aur subject ne repel nahi kiya — bas itna.", tone: "warn" },
  active: { label: "Cold", why: "Deliver hua, abhi tak khola nahi. Sequence chal rahi hai.", tone: "info" },
  new: { label: "New", why: "Abhi tak ek bhi mail nahi gaya. Auto Validation inhe pehle send par screen karega.", tone: "mut" },
  converted: { label: "Registered", why: "Mantis par signup ho gaya. Customer hai, lead nahi — har campaign se bahar.", tone: "ok" },
  stalled: { label: "Stalled", why: "5 touch poore ho gaye. 60 din cooldown ke baad naye angle se wapas aa sakte hain.", tone: "mut" },
  suppressed: { label: "Rejected", why: "Bounce, complaint ya unsubscribe. Dobara kabhi nahi bhejenge.", tone: "bad" },
};

const BOUNCE_WHY: Record<string, string> = {
  validation_suppressed: "SES Auto Validation ne bhejne se pehle roka — kisi mail server tak pahuncha hi nahi, isliye ye list ki kharabi NAHI hai",
  hard_mta: "Asli hard bounce — mail server ne mana kiya. Yahi bounce rate mein ginta hai",
  on_suppression_list: "Humari apni SES suppression list par pehle se tha",
  content_rejected: "Content reject hua — message ka masla hai, address ka nahi",
  mailbox_full: "Mailbox bhara hua — temporary",
  transient: "Temporary failure, 2 baar ke baad band",
};

export default async function ProspectAnalyticsPage({ searchParams }: Params) {
  const { campaign } = await searchParams;
  const all = !campaign || campaign === "all";

  const [campaigns, states, bounces, sources] = await Promise.all([
    sql`SELECT id, name FROM campaigns ORDER BY created_at DESC`,
    sql`
      SELECT state, count(*)::int AS n
      FROM campaign_recipients
      WHERE ${all ? sql`true` : sql`campaign_id = ${campaign}`}
      GROUP BY 1
    `,
    sql`
      SELECT coalesce(bounce_kind, do_not_send_reason, 'other') AS kind, count(*)::int AS n
      FROM campaign_recipients
      WHERE do_not_send = true AND state = 'suppressed'
        AND ${all ? sql`true` : sql`campaign_id = ${campaign}`}
      GROUP BY 1 ORDER BY 2 DESC
    `,
    // The source table is the one that changes what gets scraped next. Rates, not raw counts:
    // a source with 400 clicks out of 60,000 is worse than one with 50 out of 2,000.
    sql`
      SELECT coalesce(source, 'unknown') AS source,
             count(*)::int AS total,
             count(*) FILTER (WHERE state IN ('new','active','warm','hot'))::int AS actionable,
             -- "Reached" rather than "verified": a lead who opened a mail and then hard-bounced
             -- on a later touch is no longer verification_status='verified', but they were
             -- certainly reached. Dividing opens by the current-state count produced open rates
             -- above 100% on the master list, because the two columns counted different people.
             count(*) FILTER (WHERE verification_status = 'verified'
                               OR opened_distinct > 0 OR clicked_distinct > 0)::int AS reached,
             count(*) FILTER (WHERE opened_distinct > 0)::int AS opened,
             count(*) FILTER (WHERE clicked_distinct > 0)::int AS clicked,
             count(*) FILTER (WHERE state = 'converted')::int AS registered,
             count(*) FILTER (WHERE bounce_kind = 'hard_mta')::int AS hard_bounced,
             count(*) FILTER (WHERE bounce_kind = 'validation_suppressed')::int AS av_suppressed
      FROM campaign_recipients
      WHERE ${all ? sql`true` : sql`campaign_id = ${campaign}`}
      GROUP BY 1 ORDER BY 2 DESC
    `,
  ]);

  const byState = new Map(states.map((r) => [r.state as string, r.n as number]));
  const get = (s: string) => byState.get(s) ?? 0;
  const total = states.reduce((a, r) => a + (r.n as number), 0);
  const pct = (n: number, d: number) => (d === 0 ? "—" : `${((n / d) * 100).toFixed(n / d < 0.1 ? 1 : 0)}%`);

  return (
    <>
      <PageHeader
        pretitle="Outreach"
        title="Prospect analytics"
        sub={`${fmtN(total)} prospects${all ? " — sab campaigns" : ` — ${campaign}`}`}
        actions={
          <form method="get" className="flex gap-2">
            <select name="campaign" className="w-full rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--surface-sunk)] px-3 py-2 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]" defaultValue={campaign ?? "all"} style={{ minWidth: 220 }}>
              <option value="all">Sab campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] no-underline border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]">Filter</button>
          </form>
        }
      />
      <div className="">
        <div className="mx-auto w-full max-w-[1400px]">
          <CardRow>
            <StatCard label="Hot" value={fmtN(get("hot"))} detail="click kiya, register nahi" tone="up" icon={<IconFlame size={20} />} />
            <StatCard label="Warm" value={fmtN(get("warm"))} detail="khola, click nahi" icon={<IconSun size={20} />} />
            <StatCard label="Cold" value={fmtN(get("active") + get("new"))} detail={`${fmtN(get("new"))} abhi tak bheja nahi`} icon={<IconSnowflake size={20} />} />
            <StatCard label="Rejected" value={fmtN(get("suppressed"))} detail="bounce / complaint / unsub" tone="bad" icon={<IconBan size={20} />} />
          </CardRow>

          <div className="flex flex-wrap gap-3">
            <Table
              title="Har state — aur wo kyun"
              note="Reason inline hai, legend mein nahi: ye numbers decide karte hain kisko mail jayega."
              head={["State", { label: "Count", num: true }, { label: "Share", num: true }, "Kyun is state mein hain"]}
              rows={["hot", "warm", "active", "new", "stalled", "converted", "suppressed"].map((s) => [
                <Pill key="p" tone={WHY[s].tone}>{WHY[s].label}</Pill>,
                <span key="n" className="jf-num font-semibold">{fmtN(get(s))}</span>,
                pct(get(s), total),
                <span key="w" className="text-[var(--ink-muted)]" style={{ fontSize: 12 }}>{WHY[s].why}</span>,
              ])}
              empty="koi prospect nahi"
            />

            <Table
              title="Rejected kyun hue"
              note="AV-suppressed aur asli hard bounce alag ginay gaye hain — SES dono ko Bounce/Permanent bhejta hai."
              head={["Reason", { label: "Count", num: true }, "Matlab"]}
              rows={bounces.map((b) => [
                <code key="k">{b.kind}</code>,
                <span key="n" className="jf-num">{fmtN(b.n)}</span>,
                <span key="w" className="text-[var(--ink-muted)]" style={{ fontSize: 12 }}>{BOUNCE_WHY[b.kind as string] ?? "—"}</span>,
              ])}
              empty="abhi koi rejection nahi"
            />

            <Table
              title="Source kaisa perform kar raha hai"
              note={`Yahi table decide karta hai agli baar kya scrape karna hai. Rate dekho, raw count nahi. Click rate LIFETIME hai (sab campaigns milakar, reached ke against) — ek single send ka rate ~3.7% hota hai. ${MIN_RATE_SAMPLE} se kam reached par rate nahi dikhaya jaata.`}
              head={[
                "Source", { label: "Total", num: true }, { label: "Actionable", num: true },
                { label: "Reached", num: true }, { label: "Opened", num: true },
                { label: "Clicked", num: true }, { label: "Click rate (lifetime)", num: true },
                { label: "Registered", num: true }, { label: "Hard bounce", num: true },
                { label: "AV killed", num: true },
              ]}
              rows={sources.map((s) => [
                <span key="s" className="font-semibold">{s.source}</span>,
                fmtN(s.total), fmtN(s.actionable), fmtN(s.reached), fmtN(s.opened),
                <span key="c" className="text-primary font-semibold">{fmtN(s.clicked)}</span>,
                // A rate over a handful of sends is noise dressed as a number — freelancers show
                // 3 clicks from 37 reached, which would read as "8.1%" and get planned against.
                <span key="cr" className="jf-num">{s.reached < MIN_RATE_SAMPLE ? <span className="text-[var(--ink-muted)]">sample chhota</span> : pct(s.clicked, s.reached)}</span>,
                fmtN(s.registered),
                <span key="hb" className={s.hard_bounced > 0 ? "text-danger" : "text-secondary"}>{fmtN(s.hard_bounced)}</span>,
                <span key="av" className="text-[var(--ink-muted)]">{pct(s.av_suppressed, s.total)}</span>,
              ])}
              empty="koi source nahi"
            />

            <Section title="Padhne ka tareeka" col="col-12">
              <div className="flex gap-2 items-start text-[var(--ink-muted)]" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                <IconInfoCircle size={18} className="flex-shrink-0 mt-1" />
                <div>
                  <strong>Click rate</strong> <em>reached</em> ke against hai (verified + jinhone kabhi khola/click kiya),
                  total ke nahi — jisko mail pahuncha hi nahi wo click kar hi nahi sakta. Aur ye <strong>lifetime</strong>
                  hai: ek hi send ka rate iska chhota hissa hota hai (~3.7% measured).<br />
                  <strong>AV killed</strong> = SES ne bhejne se pehle roka. Zyada hona list purani hone ki nishani
                  hai, reputation ka khatra nahi — wo sends kabhi kisi mail server tak pahunche hi nahi.<br />
                  <strong>Stalled</strong> mare hue nahi hain: 60 din baad naye angle ke saath wapas eligible ho jaate hain.
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}
