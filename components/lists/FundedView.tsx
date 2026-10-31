import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { fmtCount } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq } from "@/components/landing/NoWebsitePieces";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { FUNDED_CITIES } from "@/lib/funded/refresh";
import type { FundedData } from "@/lib/funded/load";

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "source"; } };

/**
 * Recently funded Indian startups, from funding news re-read every week (lib/funded/refresh.ts).
 * Every row links to the article it came from — the claim is the article's, we only extract it.
 */
export function FundedView({ data, cityName, citySlug }: { data: FundedData; cityName?: string; citySlug?: string }) {
  const where = cityName ? `in ${cityName}` : "in India";
  const path = citySlug ? `/funded-startups-india/${citySlug}` : "/funded-startups-india";
  const crumbs: Crumb[] = cityName
    ? [{ label: "Home", href: "/" }, { label: "Funded startups in India", href: "/funded-startups-india" }, { label: cityName }]
    : [{ label: "Home", href: "/" }, { label: "Funded startups in India" }];
  const top = data.rounds[0];
  const faqs = [
    { q: `How often is this list of funded startups ${where} updated?`, a: `Every week. Mantis re-reads Indian funding news, extracts each round an article states — company, round, amount, date, investors — and adds or updates the company here. Rounds older than six months drop off. Last updated ${fmtDate(data.updated)}.` },
    { q: "Where does the data come from?", a: "From published funding news: each row links to the article it was taken from. We only copy what the article states; a field it does not state is left blank rather than guessed." },
    { q: "Why would a seller want a list of recently funded startups?", a: "Because a startup that has just raised has a budget it is expected to spend — on hiring, tools, marketing and agencies — usually in the first three months. Recruiters, SaaS companies, agencies, CA firms and office-space providers sell into that window." },
    { q: "How do I contact these startups?", a: "Mantis finds the company's website, its founders and their LinkedIn, and where the site names one, a direct email — then runs email or call outreach. Free to start with 500 credits." },
    { q: "Do you cover startups outside India?", a: "Not on this page. Funding signals for other countries are available inside Mantis when you search for them." },
  ];
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "ItemList", name: `Recently funded startups ${where}`, url: `${COMPANY.site}${path}`, numberOfItems: data.total,
      itemListElement: data.rows.slice(0, 50).map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.company })) },
    { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    breadcrumbJsonLd(crumbs, COMPANY.site),
  ] };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={crumbs} />
      <Hero eyebrow="Funding signal · updated weekly" h1={`Recently funded startups ${where}`}
        lede={<>These are <strong style={{ color: "var(--g-ink)" }}>{fmtCount(data.total)} startups {where} that announced a funding round in the last six months</strong>, taken from funding news and re-checked every week — with the round, amount, investors and the article each came from.</>} />
      <p style={{ fontSize: 13, color: "var(--g-ink-soft)", margin: "10px 0 0" }}>Updated {fmtDate(data.updated)} · For recruiters, SaaS companies, agencies and service firms that sell to startups.</p>
      <div style={{ marginTop: 22, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--g-border)" }}>
        <Image src="/resources/thumbs/the-lifetime-value-of-one-local-client.webp" alt="Illustration of a growing company and revenue" width={1600} height={900} priority sizes="(max-width: 900px) 100vw, 852px" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <StatStrip stats={[
        { value: fmtCount(data.total), label: "funded in the last 6 months" },
        ...(top ? [{ value: top.round, label: `most common round (${fmtCount(top.n)})` }] : []),
        ...(cityName ? [] : [{ value: fmtCount(data.cities.length), label: "cities" }]),
        { value: fmtDate(data.rows[0]?.announced ?? null), label: "latest round" },
      ]} />

      <Section h2={`The latest funding rounds ${where}`}>
        <p style={{ fontSize: 13.5, color: "var(--g-ink-soft)", margin: "0 0 14px" }}>Newest first. Each card links to the article the round was taken from, and to the company&apos;s site where the article gives one.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {data.rows.slice(0, 150).map((r) => (
            <article key={r.company} style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.round && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "var(--g-green-mint, #e8f3df)", color: "var(--g-green-text)" }}>{r.round}</span>}
                {r.amount && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "var(--g-cream, #f4f1ea)", color: "var(--g-ink)" }}>{r.amount}</span>}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--g-ink)", margin: 0 }}>
                {r.website ? <a href={`https://${r.website.replace(/^https?:\/\//, "")}`} rel="nofollow noopener" target="_blank" style={{ color: "var(--g-ink)" }}>{r.company}</a> : r.company}
              </h3>
              {r.about && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--g-ink-soft)", margin: 0 }}>{r.about}</p>}
              {Array.isArray(r.investors) && r.investors.length > 0 && <p style={{ fontSize: 12.5, color: "var(--g-gray-500)", margin: 0 }}>Investors: {r.investors.slice(0, 3).join(", ")}</p>}
              <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", margin: "auto 0 0", paddingTop: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{[r.city, fmtDate(r.announced)].filter(Boolean).join(" · ")}</span>
                <a href={r.source_url} rel="nofollow noopener" target="_blank" style={{ color: "var(--g-green-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50%" }}>{host(r.source_url)}</a>
              </p>
            </article>
          ))}
        </div>
      </Section>

      {data.rounds.length > 1 && (
        <Section h2="By stage">
          <GapTable minWidth={0} head={["Round", "Startups"]} rows={data.rounds.map((r) => ({ key: r.round, cells: [r.round, fmtCount(r.n)] }))} />
        </Section>
      )}

      {!cityName && data.cities.length > 0 && (
        <Section h2="Funded startups by city">
          <GapTable minWidth={0} head={["City", "Startups funded"]} rows={data.cities.map((c) => {
            const name = FUNDED_CITIES.find((x) => x.slug === c.slug)?.name ?? c.slug;
            return { key: c.slug, cells: [<Link key="l" href={`/funded-startups-india/${c.slug}`} style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>{name}</Link>, fmtCount(c.n)] };
          })} />
        </Section>
      )}

      {data.investors.length > 2 && (
        <Section h2="Most active investors in these rounds">
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--g-ink-soft)", margin: 0 }}>{data.investors.map((i) => `${i.name} (${i.n})`).join(" · ")}</p>
        </Section>
      )}

      <Section h2="Why recently funded startups are worth contacting now">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>A round is announced after the money is in the bank, and the plan it was raised on starts the same week: hiring, tools, marketing, an office. The first ninety days after an announcement are when a startup signs the most new vendors — and when a founder is most likely to answer someone who says something specific about what they just raised for.</p>
          <p style={{ margin: "0 0 14px" }}>Twelve to eighteen months later the same company is preparing its next round, which is a different sale: fundraising advisors, CFO services and the metrics tooling investors will ask about.</p>
          <p style={{ margin: 0 }}>Guides for both: <Link href="/resources/how-to-get-app-development-clients" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>getting software clients from funded startups</Link>, <Link href="/resources/recruitment-leads-find-companies-hiring" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>finding companies that are hiring</Link> and <Link href="/resources/how-to-find-clients" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>how to find clients</Link>.</p>
        </Prose>
      </Section>

      {cityName && (
        <Section h2="Other cities">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link href="/funded-startups-india" style={{ fontSize: 14, color: "var(--g-green-text)", textDecoration: "underline" }}>All of India</Link>
            {FUNDED_CITIES.filter((c) => c.slug !== citySlug).map((c) => <Link key={c.slug} href={`/funded-startups-india/${c.slug}`} style={{ fontSize: 14, color: "var(--g-ink)", textDecoration: "underline" }}>{c.name}</Link>)}
          </div>
        </Section>
      )}

      <Faq items={faqs} />
      <Cta title="Reach these founders before everyone else does" body="Mantis finds each startup's website, founders and their LinkedIn, and a direct email where the site names one — then runs the outreach. Free to start with 500 credits." href="/login" label="Start free" />
    </PageShell>
  );
}
