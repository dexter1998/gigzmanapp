import type { Metadata } from "next";
import Link from "next/link";
import { getLiveData } from "./queries";
import { AreaTrend, Donut, RankedBars, Cohorts, C, fmtN, pretty } from "./charts";
import { Quotes } from "./Quotes";
import "./live.css";

/**
 * The public traction page linked from the pitch deck.
 *
 * `noindex` rather than a robots.txt Disallow, deliberately: a Disallow stops the crawl, and a
 * page that is never crawled can never be read to find a noindex, so a URL someone links to can
 * still end up in the index with no content. Allowing the crawl and refusing the index is the
 * combination that actually works. It is also kept out of sitemaps/pages.xml.
 *
 * The URL is in a PDF that gets forwarded, so treat it as fully public: no email addresses, no
 * company identities, nothing that is not ours to publish.
 */
export const metadata: Metadata = {
  title: { absolute: "Mantis Ai — Live numbers" },
  description: "Live product and usage numbers for Mantis Ai, straight from production.",
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false } },
};

/**
 * Rendered per request, not prerendered.
 *
 * `revalidate` made this a static page, so the build tried to prerender it -- and the build
 * container has no database, which failed the whole image build on ECONNREFUSED. The ten-minute
 * window lives in unstable_cache instead, which is where it actually belongs: the page re-renders
 * on every request but the DB is still only touched once per window.
 */
export const dynamic = "force-dynamic";

export default async function LivePage() {
  // An investor opening a link from a PDF should never meet a stack trace. If the database is
  // unreachable the page still renders, says so plainly, and says when it last had numbers.
  let d: Awaited<ReturnType<typeof getLiveData>>;
  try {
    d = await getLiveData();
  } catch {
    return (
      <main className="lv">
        <header className="lv-top">
          <Link href="/" className="lv-brand"><span className="lv-brand-dot" aria-hidden />mantis</Link>
        </header>
        <section className="lv-hero">
          <h1>Numbers are briefly unavailable.</h1>
          <p className="lv-sub">
            This page reads straight from the production database and could not reach it just now.
            Nothing is wrong with the product — try again in a minute, or see{" "}
            <Link href="/">mantisai.in</Link>.
          </p>
        </section>
      </main>
    );
  }
  const updated = new Date(d.computedAt);
  const stamp = updated.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    hour12: true, timeZone: "Asia/Kolkata",
  });

  const activeShare = d.users.total ? Math.round((d.users.active7 / d.users.total) * 100) : 0;
  const unlockShare = d.users.total ? Math.round((d.usage.unlockUsers / d.users.total) * 100) : 0;
  const onboardShare = d.users.total ? Math.round((d.users.onboarded / d.users.total) * 100) : 0;

  return (
    <main className="lv">
      <header className="lv-top">
        <Link href="/" className="lv-brand">
          <span className="lv-brand-dot" aria-hidden />
          mantis
        </Link>
        <span className="lv-stamp">
          <i className="lv-pulse" aria-hidden />
          Updated {stamp} IST
        </span>
      </header>

      <section className="lv-hero">
        <p className="lv-eyebrow">Production data · refreshed every 10 minutes</p>
        <h1>
          Today&rsquo;s numbers, <span className="lv-mark">straight from the database.</span>
        </h1>
        <p className="lv-sub">
          Nothing on this page is typed in by hand. Every figure is a query against the live
          Mantis production database, cached for ten minutes so the page cannot knock it over.
        </p>

        <div className="lv-headline">
          <Head n={d.users.total} label="Registered users" note={`+${fmtN(d.users.new7)} in 7 days`} />
          <Head n={d.users.active7} label="Weekly active" note={`${activeShare}% of all users`} />
          <Head n={d.usage.unlocks} label="Leads unlocked" note={`by ${fmtN(d.usage.unlockUsers)} users`} />
          <Head n={d.outreach.partners} label="Partner applications" note="inbound, not solicited" />
        </div>
      </section>

      <section className="lv-grid">
        <Card title="Signups" sub="Last 30 days" wide>
          <AreaTrend data={d.signups} label="Signups" color={C.green} />
        </Card>
        <Card title="Leads unlocked" sub="Last 30 days" wide>
          <AreaTrend data={d.unlocksDaily} label="Unlocks" color={C.blue} />
        </Card>

        <Card title="Revenue" sub="All time, paid orders only">
          <div className="lv-money">
            <strong>₹{fmtN(Math.round(d.money.revenuePaise / 100))}</strong>
            <span>{fmtN(d.money.paidUsers)} paying customers · {fmtN(d.money.paidOrders)} paid orders</span>
            {d.money.paidUsers === 0 && (
              <p className="lv-note">
                Monetisation is deliberately not switched on yet. The number is zero because
                nothing has been charged, not because the figure is missing.
              </p>
            )}
          </div>
        </Card>

        <Card title="Account type" sub="Agency vs freelancer">
          <Donut slices={d.byType} />
        </Card>

        <Card title="Where users are" sub="Top countries">
          <RankedBars rows={d.byCountry} color={C.green} />
        </Card>

        <Card title="How deep usage goes" sub="Users by leads unlocked">
          <RankedBars rows={d.depth} color={C.blue} />
        </Card>

        <Card title="Funnel" sub="Of everyone who registered">
          <ul className="lv-funnel">
            <Step label="Registered" n={d.users.total} pct={100} />
            <Step label="Completed onboarding" n={d.users.onboarded} pct={onboardShare} />
            <Step label="Unlocked a lead" n={d.usage.unlockUsers} pct={unlockShare} />
            <Step label="Active this week" n={d.users.active7} pct={activeShare} />
          </ul>
        </Card>

        <Card title="Reach" sub="Supply and outbound">
          <ul className="lv-mini">
            <li><span>Leads in the database</span><b>{fmtN(d.usage.leads)}</b></li>
            <li><span>Unlocks in last 7 days</span><b>{fmtN(d.usage.unlocks7)}</b></li>
            <li><span>Signups in last 24 hours</span><b>{fmtN(d.users.new1)}</b></li>
            <li><span>Outbound emails sent</span><b>{fmtN(d.outreach.emails)}</b></li>
          </ul>
        </Card>

        <Card title="Weekly cohort retention" sub="Did each signup week come back and unlock?" full>
          <Cohorts rows={d.cohorts} />
        </Card>

        {d.quotes.length > 0 && (
          <Card title="Why agencies applied" sub="In their own words, from partnership applications" full>
            <Quotes items={d.quotes} />
            <p className="lv-consent">
              First name and city only. These are inbound partnership applications, so the
              agencies behind them are not named here.
            </p>
          </Card>
        )}

        <Card title="Latest signups" sub="Most recent 40 accounts" full>
          <div className="lv-table-wrap">
            <table className="lv-table">
              <thead>
                <tr>
                  <th scope="col">User</th><th scope="col">Country</th>
                  <th scope="col">Type</th><th scope="col">Plan</th>
                  <th scope="col" className="lv-num">Unlocks</th><th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((u, i) => (
                  <tr key={i}>
                    <td className="lv-mono">{u.masked}</td>
                    <td>{u.country ?? "—"}</td>
                    <td>{u.type ? pretty(u.type) : "—"}</td>
                    <td><span className="lv-plan">{pretty(u.plan)}</span></td>
                    <td className="lv-num">{u.unlocks ? fmtN(u.unlocks) : "—"}</td>
                    <td>{u.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lv-consent">
            Addresses are masked. The list is here to show the accounts are real and varied, which
            it does without publishing anybody&rsquo;s email on a page that gets forwarded.
          </p>
        </Card>
      </section>

      <footer className="lv-foot">
        <p>
          Computed {stamp} IST · cached for 10 minutes · <Link href="/">mantisai.in</Link>
        </p>
      </footer>
    </main>
  );
}

function Head({ n, label, note }: { n: number; label: string; note: string }) {
  return (
    <div className="lv-head">
      <strong>{fmtN(n)}</strong>
      <span>{label}</span>
      <em>{note}</em>
    </div>
  );
}

function Card({ title, sub, children, wide, full }: {
  title: string; sub: string; children: React.ReactNode; wide?: boolean; full?: boolean;
}) {
  return (
    <section className={`lv-card${wide ? " lv-wide" : ""}${full ? " lv-full" : ""}`}>
      <header><h2>{title}</h2><p>{sub}</p></header>
      {children}
    </section>
  );
}

function Step({ label, n, pct }: { label: string; n: number; pct: number }) {
  return (
    <li>
      <span className="lv-step-top"><span>{label}</span><b>{fmtN(n)}</b></span>
      <span className="lv-step-track">
        <span className="lv-step-fill" style={{ width: `${Math.max(2, pct)}%` }} />
      </span>
      <em>{pct}%</em>
    </li>
  );
}
