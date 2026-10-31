import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { pseoSql as sql } from "@/lib/pseo/db";
import { LockIcon } from "@/components/icons";
import { cityPath } from "@/lib/pseo/urls";
import { COUNTRIES } from "@/lib/pseo/countries";
import { fmtCount } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, GapTable, Cta, Faq } from "@/components/landing/NoWebsitePieces";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/pseo/Breadcrumbs";
import { SIGNAL_LABEL, LISTS, SERVICE_LISTS, NOSITE_LISTS, type ListDef, type Signal } from "@/lib/lists/defs";
import type { ListData, SampleRow } from "@/lib/lists/load";

/**
 * One renderer for every list page. What differs between pages is the data and the argument
 * (defs.ts `angle`, `audience`), which is what should differ — the same rule the no-website landing
 * pages follow. Nothing actionable (phone, email, address) is ever rendered; it is only counted.
 */

/** City pages lead with the search term itself: "SEO leads in Mumbai", "Dentist email list in Pune". */
export const cityHeading = (d: ListDef, city: string) => `${d.keyword.charAt(0).toUpperCase() + d.keyword.slice(1)} in ${city}`;

export const listPath = (d: ListDef) =>
  d.kind === "service" ? `/leads-for/${d.slug}` : d.kind === "nosite" ? `/businesses-without-websites/${d.slug}` : `/lists/${d.slug}`;

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
/** Lower-case the first letter for mid-sentence use, unless it starts an acronym ("SEO agencies"). */
const midSentence = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

function hub(d: ListDef): Crumb {
  if (d.kind === "service") return { label: "Leads by service", href: "/leads-for" };
  if (d.kind === "nosite") return { label: "Businesses without websites", href: "/businesses-without-websites" };
  return { label: "Business lists", href: "/lists" };
}

function lede(d: ListData, def: ListDef, cityName?: string): string {
  const where = cityName ? ` in ${cityName}` : def.country ? " in India" : "";
  if (def.kind === "nosite")
    return `${fmtCount(d.total)} ${def.noun}${where}, each with an active Google listing and no website of its own — found and checked by Mantis across ${d.cities.length >= 14 ? "dozens of" : d.cities.length} cities. ${fmtCount(d.withPhone)} have a phone number on their listing.`;
  if (def.kind === "service" || def.kind === "tech")
    return `${fmtCount(d.total)} ${def.noun}${where}, out of ${fmtCount(d.read)} business websites we have read ourselves${where}. This page is the ${def.keyword} list: who they are, where they are and what their sites show — with contact details unlocked in Mantis.`;
  return `This ${def.keyword} covers ${fmtCount(d.total)} ${def.noun}${where}, each found on Google Maps and checked by Mantis — ${fmtCount(d.withPhone)} with a phone number and ${fmtCount(d.withWebsite)} with a website we can read for emails, decision-makers and buying signals.`;
}

function faqs(def: ListDef, d: ListData): Array<{ q: string; a: string }> {
  const out: Array<{ q: string; a: string }> = [];
  const topCity = d.cities[0];
  out.push({
    q: `How many ${def.noun} are on this ${def.kind === "industry" ? "list" : "page"}?`,
    a: `${fmtCount(d.total)} at the time this page was generated${topCity ? `, with the most in ${topCity.name} (${fmtCount(topCity.n)})` : ""}. The count is queried from our index whenever the page is rebuilt (at most daily), so it moves as we find and re-check businesses.`,
  });
  out.push({
    q: "Where does the data come from?",
    a: def.kind === "service" || def.kind === "tech"
      ? "From our own reads of each business's website. Mantis fetches the site, detects the platform, tracking tags, booking, careers pages, WhatsApp links and contact details, and stores what it found with the date. Nothing here is bought from a data vendor."
      : "Businesses are found on Google Maps by category and area, deduplicated, and checked: whether they have a website, whether that website is really theirs (a Facebook page or a directory listing does not count), and — where there is a site — what it says. Emails are taken from the business's own pages, never guessed from a pattern.",
  });
  if (def.kind !== "nosite")
    out.push({
      q: "Does the list include email addresses?",
      a: d.read > 0
        ? `Yes, where the business publishes one. Of the websites we have read for this list, ${pct(d.withEmail, def.kind === "industry" ? d.read : d.total)} show at least one email, and ${fmtCount(d.withPerson)} name a decision-maker. Emails are graded: a named person's address above a role inbox above a generic one.`
        : "Yes, where the business publishes one on its own website. We read sites continuously; emails appear as each site is read, graded from a named person's address down to a generic inbox.",
    });
  out.push({
    q: "Can I download it?",
    a: `Not from this page — names are shown here because they are already public on Google Maps; phone numbers, emails and addresses are what you unlock in Mantis, a business at a time or in bulk, and export from there. Free to start: every account gets ${"500"} credits once.`,
  });
  out.push({
    q: "Is it legal to contact these businesses?",
    a: "These are businesses, contacted at their published business details. B2B outreach is generally allowed, but the rules differ by country — the UK and EU expect a legitimate-interest basis and an easy opt-out, India's DPDP Act covers personal data. Mantis adds unsubscribe handling to email campaigns; check the rules for the countries you sell into.",
  });
  out.push({
    q: `How is this different from buying a ${def.kind === "industry" ? def.keyword : "lead list"}?`,
    a: "A bought list is a snapshot — often years old, priced per record, and blind to businesses without a website. This one is built from live map data and our own website reads, and Mantis re-checks a business when you use it, so you are not paying for closed shops and dead inboxes.",
  });
  return out;
}

function Badge({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "amber" | "green" }) {
  const c = tone === "amber" ? { bg: "#fef3c7", fg: "#92400e" } : tone === "green" ? { bg: "var(--g-green-bg, #e8f3df)", fg: "var(--g-green-text)" } : { bg: "var(--g-cream, #f4f1ea)", fg: "var(--g-ink-soft)" };
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.2, padding: "3px 8px", borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>{children}</span>;
}

function SampleCard({ r }: { r: SampleRow }) {
  return (
    <article style={{ background: "var(--g-white)", border: "1px solid var(--g-border)", borderRadius: "var(--radius-lg)", padding: 16, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {!r.hasWebsite && <Badge tone="amber">No website</Badge>}
        {r.flags.slice(0, 3).map((f) => <Badge key={f} tone={f.startsWith("has_") ? "green" : "amber"}>{SIGNAL_LABEL[f]}</Badge>)}
        {r.cms && r.cms !== "null" && <Badge>{titleCase(r.cms.replace(/_/g, " "))}</Badge>}
      </div>
      <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--g-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</h3>
      <p style={{ fontSize: 13, color: "var(--g-ink-soft)", margin: "4px 0 0" }}>
        {[r.category && titleCase(r.category), r.city].filter(Boolean).join(" · ")}
        {r.rating !== null && <> · ★ {r.rating.toFixed(1)}{r.reviews ? ` (${fmtCount(r.reviews)})` : ""}</>}
      </p>
      <p style={{ fontSize: 12.5, color: "var(--g-ink-soft)", margin: "10px 0 0", display: "flex", gap: 6, alignItems: "center" }}>
        <LockIcon size={12} color="var(--g-ink-soft)" /> Phone, email and address unlock in Mantis
      </p>
    </article>
  );
}

async function RelatedLinks({ def }: { def: ListDef }) {
  const posts = await sql<{ slug: string; title: string }[]>`SELECT slug, title FROM blog_posts WHERE status = 'published' AND slug = ANY(${[...def.related, "how-to-find-clients"]})`.catch(() => []);
  const titleOf = new Map(posts.map((p) => [p.slug, p.title]));
  const siblings = [...LISTS, ...SERVICE_LISTS, ...NOSITE_LISTS].filter((x) => x.slug !== def.slug && (x.kind === def.kind || (def.kind === "nosite" && x.kind === "industry" && x.categories?.some((c) => def.categories?.includes(c))) || (def.kind === "industry" && x.kind === "nosite" && x.categories?.some((c) => def.categories?.includes(c))))).slice(0, 10);
  return (
    <Section h2="Related lists and guides">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--g-green-text)", marginBottom: 8 }}>Guides</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {[...def.related, "how-to-find-clients"].filter((s) => titleOf.has(s)).map((s) => (
              <li key={s}><Link href={`/resources/${s}`} style={{ color: "var(--g-ink)", textDecoration: "underline", textUnderlineOffset: 3, fontSize: 14.5 }}>{titleOf.get(s)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--g-green-text)", marginBottom: 8 }}>More lists</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {siblings.map((x) => (
              <li key={x.kind + x.slug}><Link href={listPath(x)} style={{ color: "var(--g-ink)", textDecoration: "underline", textUnderlineOffset: 3, fontSize: 14.5 }}>{x.h1.charAt(0).toUpperCase() + x.h1.slice(1)}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function ListView({ def, data, city, cityPages = [] }: {
  def: ListDef; data: ListData;
  /** Set on a city page (/lists/<slug>/<city>). */
  city?: { slug: string; name: string };
  /** Cities that have their own page for this list (passed the 25-row gate). */
  cityPages?: Array<{ slug: string; name: string; n: number }>;
}) {
  const path = listPath(def) + (city ? `/${city.slug}` : "");
  const url = `${COMPANY.site}${path}`;
  const H1 = city ? cityHeading(def, city.name) : def.h1.charAt(0).toUpperCase() + def.h1.slice(1);
  const crumbs: Crumb[] = city
    ? [{ label: "Home", href: "/" }, hub(def), { label: def.h1.charAt(0).toUpperCase() + def.h1.slice(1), href: listPath(def) }, { label: city.name }]
    : [{ label: "Home", href: "/" }, hub(def), { label: H1 }];
  const cityHref = new Map(cityPages.map((c) => [c.slug, `${listPath(def)}/${c.slug}`]));
  const readBase = def.kind === "industry" || def.kind === "nosite" ? data.read : data.total;
  const signalRows = (Object.entries(data.signals) as Array<[Signal, number]>).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const faqItems = faqs(def, data);
  const updated = data.checkedAt ?? new Date();

  const stats: Array<{ value: string; label: string }> = [{ value: fmtCount(data.total), label: def.noun }];
  if (def.kind === "nosite") stats.push({ value: fmtCount(data.withPhone), label: "with a phone number" }, { value: fmtCount(data.cities.length), label: "top cities shown" });
  else {
    stats.push({ value: fmtCount(data.withPhone), label: "with a phone number" });
    if (def.kind === "industry") stats.push({ value: fmtCount(data.withWebsite), label: "with a website" });
    if (data.withEmail > 0) stats.push({ value: fmtCount(data.withEmail), label: "emails found on their sites" });
    if (data.withPerson > 0) stats.push({ value: fmtCount(data.withPerson), label: "named decision-makers" });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset", "@id": `${url}#dataset`, name: city ? `${def.title} — ${city.name}` : def.title, url,
        description: lede(data, def, city?.name),
        creator: { "@id": `${COMPANY.site}/#organization` },
        dateModified: updated.toISOString(),
        isAccessibleForFree: false,
        variableMeasured: ["business name", "category", "city", "phone", "website", "email", "rating", ...signalRows.map(([s]) => SIGNAL_LABEL[s])],
        spatialCoverage: data.countries.map((c) => COUNTRY_NAME.get(c.code) ?? c.code.toUpperCase()),
      },
      { "@type": "FAQPage", mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      breadcrumbJsonLd(crumbs, COMPANY.site),
    ],
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={crumbs} />
      <Hero eyebrow={def.kind === "service" ? "Leads by buying signal" : def.kind === "nosite" ? "No-website leads" : def.kind === "tech" ? "Technology lists" : "Business database"} h1={H1} lede={lede(data, def, city?.name)} />
      <p style={{ fontSize: 13, color: "var(--g-ink-soft)", margin: "10px 0 0" }}>
        Updated {updated.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · For {midSentence(def.audience)}
      </p>
      <div style={{ marginTop: 22, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--g-border)" }}>
        <Image src={def.image} alt={def.imageAlt} width={1600} height={900} priority sizes="(max-width: 900px) 100vw, 852px" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <StatStrip stats={stats} />

      <Section h2={`Why ${def.kind === "industry" ? "this list" : `these ${def.kind === "nosite" ? "businesses" : "leads"}`} ${def.kind === "industry" ? "is worth using" : "are worth calling"}`}>
        <Prose>
          {def.angle.map((p, i) => <p key={i} style={{ margin: "0 0 14px" }}>{p}</p>)}
          <p style={{ margin: 0 }}>Built for {midSentence(def.audience)}</p>
        </Prose>
      </Section>

      {data.sample.length > 0 && (
        <Section h2={`A sample of the ${def.noun}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
            {data.sample.map((r, i) => <SampleCard key={i} r={r} />)}
          </div>
          <p style={{ fontSize: 13, color: "var(--g-ink-soft)", margin: "12px 0 0" }}>
            The most-reviewed {data.sample.length} of {fmtCount(data.total)}. Names, ratings and categories are public on Google Maps; contact details are not shown here.
          </p>
        </Section>
      )}

      {!city && data.cities.length > 0 && (
        <Section h2="Where they are">
          <GapTable
            minWidth={0}
            caption={`Cities with the most ${def.noun} in our index.`}
            head={["City", "Country", def.noun.charAt(0).toUpperCase() + def.noun.slice(1)]}
            rows={data.cities.map((c) => ({
              key: `${c.name}-${c.country}`,
              cells: [
                c.slug && cityHref.has(c.slug) ? <Link key="l" href={cityHref.get(c.slug)!} style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>{c.name}</Link>
                  : c.slug && def.kind === "nosite" ? <Link key="l" href={cityPath("website-development", c.slug)} style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>{c.name}</Link> : c.name,
                c.country ? COUNTRY_NAME.get(c.country) ?? c.country.toUpperCase() : "—",
                fmtCount(c.n),
              ],
            }))}
          />
        </Section>
      )}

      {signalRows.length > 0 && readBase >= 10 && (
        <Section h2="What their websites show">
          <Prose>
            <p style={{ margin: "0 0 14px" }}>
              Read by Mantis from {fmtCount(readBase)} of these businesses&apos; own websites. Each line is a fact you can open the site and check — which is what makes it a usable reason to get in touch.
            </p>
          </Prose>
          <GapTable
            minWidth={0}
            head={["Signal on the website", "Businesses", "Share"]}
            rows={signalRows.map(([s, n]) => ({ key: s, cells: [SIGNAL_LABEL[s], fmtCount(n), pct(n, readBase)] }))}
          />
          {data.cms.length > 0 && (
            <p style={{ fontSize: 13.5, color: "var(--g-ink-soft)", margin: "12px 0 0" }}>
              Platforms: {data.cms.map((c) => `${titleCase(c.cms.replace(/_/g, " "))} ${fmtCount(c.n)}`).join(" · ")}.
            </p>
          )}
        </Section>
      )}

      {data.categories.length > 1 && (
        <Section h2="By type of business">
          <GapTable minWidth={0} head={["Type", "Businesses"]} rows={data.categories.map((c) => ({ key: c.category, cells: [titleCase(String(c.category).replace(/_/g, " ")), fmtCount(c.n)] }))} />
        </Section>
      )}

      <Section h2="What each record includes">
        <GapTable
          head={["Field", "Shown here", "In Mantis"]}
          rows={[
            ["Business name, category, rating, reviews", "Yes", "Yes"],
            ["City and area", "Yes", "Yes, with full address and map pin"],
            ["Phone number", "Counted only", "Yes — mobile vs landline marked"],
            ["Website", "Counted only", "Yes, checked to be the business's own"],
            ["Emails from the website", "Counted only", "Yes — named person, role or generic, with the page it was found on"],
            ["Decision-maker", "Counted only", "Yes, when the site names one; LinkedIn when found"],
            ["Website signals (booking, tracking, age, hiring)", "As totals", "Per business"],
          ].map((r) => ({ key: r[0], cells: r }))}
        />
      </Section>

      <Section h2="How to turn this into conversations">
        <Prose>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
            <li><strong style={{ color: "var(--g-ink)" }}>Tell Mantis what you sell and where.</strong> It reads your website, works out who buys from you, and plans the search — this page is one of the lists it can build.</li>
            <li><strong style={{ color: "var(--g-ink)" }}>Pick the businesses with a reason to buy now.</strong> Filter on the signals above — no booking, no tracking, an outdated site, hiring — and Mantis ranks the rest by fit and reachability.</li>
            <li><strong style={{ color: "var(--g-ink)" }}>Reach them where they answer.</strong> Email sequences from your own mailbox, or AI voice calls in English, Hindi and Hinglish, with replies summarised in one inbox.</li>
          </ol>
        </Prose>
      </Section>

      {cityPages.length > 0 && (
        <Section h2={city ? "Same list, other cities" : "By city"}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {city && <Link href={listPath(def)} style={{ fontSize: 13.5, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--g-border)", background: "var(--g-white)", color: "var(--g-green-text)", textDecoration: "none" }}>All cities</Link>}
            {cityPages.filter((c) => c.slug !== city?.slug).slice(0, 40).map((c) => (
              <Link key={c.slug} href={`${listPath(def)}/${c.slug}`} style={{ fontSize: 13.5, padding: "6px 12px", borderRadius: 999, border: "1px solid var(--g-border)", background: "var(--g-white)", color: "var(--g-ink)", textDecoration: "none" }}>{c.name} <span style={{ color: "var(--g-gray-500)" }}>{fmtCount(c.n)}</span></Link>
            ))}
          </div>
        </Section>
      )}

      <Faq items={faqItems} />
      <RelatedLinks def={def} />
      <Cta
        title={`Get the full ${def.kind === "industry" ? def.keyword : `list of ${def.noun}`}`}
        body="Free to start with 500 credits. Tell Mantis what you sell and where — it builds the list, finds the contacts and drafts the outreach."
        href="/login"
        label="Start free"
      />
    </PageShell>
  );
}
