import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { cityPath } from "@/lib/pseo/urls";
import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { getCityCards, getGapTotals, fmtCount, fmtPct } from "@/lib/landing/no-website";
import { PageShell, Hero, StatStrip, Section, Prose, Cta, Faq, CityStrip } from "@/components/landing/NoWebsitePieces";

/** Kept out of the build: a parameterless route that reads Postgres would otherwise be prerendered
 *  at build time, which is the coupling that broke the container build. The aggregates behind it
 *  are cached for a day (lib/landing/no-website.ts), so this is a cache read per request. */
export const dynamic = "force-dynamic";

const TITLE = "Businesses Near Me Without a Website";

export async function generateMetadata(): Promise<Metadata> {
  const totals = await getGapTotals().catch(() => null);
  const count = totals?.qualifying ?? 0;

  return {
    // 36 characters. The root layout appends " — Mantis" (9), so this renders at 45 — inside the
    // ~59 Google shows. The lead section's city titles are 79 and get truncated.
    title: TITLE,
    description: count
      ? `Find local businesses near you with no website. ${fmtCount(count)} verified businesses with an active Google listing and no site, with ratings and review counts.`
      : "Find local businesses near you with no website — an active Google listing, real customers, and nowhere to send them. Verified from live map data.",
    alternates: { canonical: `${COMPANY.site}/businesses-near-me-without-websites` },
    openGraph: {
      title: TITLE,
      url: `${COMPANY.site}/businesses-near-me-without-websites`,
      images: ogImageMeta({
        v: "nearby",
        eyebrow: "No-website leads",
        t1: "Businesses near you",
        t2: "with no website.",
        cta: "Search your city →",
        url: "mantisai.in/businesses-near-me-without-websites",
      }),
    },
    twitter: { card: "summary_large_image" },
  };
}

const FAQS = [
  {
    q: "How do you know a business has no website?",
    a: "Every business here has an active Google Business Profile with no website field set, and we re-check it rather than trusting the listing once. A business is only counted after that check, and each card shows when it was last verified. Businesses we have not checked either way are excluded from the counts entirely rather than assumed.",
  },
  {
    q: "Are these businesses actually trading, or dead listings?",
    a: "That is what the review counts are for. A listing with twenty recent reviews and a four-star rating is a business with customers; it is the strongest kind of prospect on this page, because it is demonstrably trading and demonstrably has nowhere to send anyone online. The cards are ranked with that in mind rather than by distance.",
  },
  {
    q: "Is a Facebook page or an Instagram profile counted as a website?",
    a: "No. A social profile in the website field is recorded as having no site of its own, because that is the pitch: the business is renting an audience on someone else's platform and owns nothing. That is a deliberate choice and it is why our counts run higher than a raw export of the website field.",
  },
  {
    q: "Which countries and cities do you cover?",
    a: "Coverage is uneven and shown honestly rather than implied. The city list on this page is every city we have actually scanned and verified, with its real count. India is the deepest coverage by a wide margin — roughly two in three small businesses there have no website, against a far smaller share in the US and UK.",
  },
  {
    q: "What does it cost?",
    a: "Browsing is free and needs no account. The names, ratings, categories and counts on the city pages are public. Credits are only spent when you unlock a specific lead's phone number and address to contact it.",
  },
];

export default async function BusinessesNearMePage() {
  const [totals, cityRows] = await Promise.all([
    getGapTotals().catch(() => null),
    getCityCards().catch(() => []),
  ]);

  const cities = cityRows
    .map((p) => {
      const city = CITY_BY_SLUG.get(p.city_slug);
      if (!city) return null;
      return {
        slug: p.city_slug,
        name: city.name,
        href: cityPath(p.service_slug, p.city_slug),
        qualifying: p.qualifying_leads,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <PageShell>
      <Hero
        eyebrow="No-website leads"
        h1="Businesses near you without a website"
        lede={
          totals && totals.qualifying > 0 ? (
            <>
              <strong style={{ color: "var(--g-ink)" }}>{fmtCount(totals.qualifying)} businesses</strong> in{" "}
              {fmtCount(totals.cities)} cities have an active Google listing, real reviews and no website
              at all. Not "a bad website" — none. Pick your city below to see who they are, what they
              do and how many people have reviewed them.
            </>
          ) : (
            <>
              Some businesses run entirely on a Google listing and a phone number. We check which ones,
              verify it, and publish the list city by city — free to browse.
            </>
          )
        }
      />

      {totals && totals.checked > 0 && (
        <StatStrip
          stats={[
            { value: fmtCount(totals.qualifying), label: "businesses with no website" },
            { value: fmtPct(totals.gapRate), label: "of those we checked" },
            { value: fmtCount(totals.cities), label: "cities covered" },
            { value: fmtCount(totals.checked), label: "listings verified either way" },
          ]}
        />
      )}

      <CityStrip cities={cities} heading="Find businesses near you" />

      <Section h2="Why a business with no website is the best lead you can call">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            Most lead lists sell you businesses that already have a website and might want a better
            one. You are then arguing about taste, competing with whoever built the current site, and
            talking to someone who has already solved the problem once.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            A business with no website at all is a different conversation. There is no incumbent, no
            redesign committee and no comparison to a site they are attached to. The gap is
            self-evident to the owner the moment you describe it, because they already feel it every
            time a customer asks for a menu, a price list or a booking link.
          </p>
          <p style={{ margin: 0 }}>
            The ones worth calling first are the ones with reviews. A listing with no reviews may be
            dormant or barely trading. A listing with forty reviews and a 4.5 rating is a business
            with steady customers and nowhere online to send them, which is the entire pitch in one
            sentence.
          </p>
        </Prose>
      </Section>

      <Section h2="How to find them yourself, and where that breaks">
        <Prose>
          <p style={{ margin: "0 0 14px" }}>
            You can do this by hand. Open Google Maps, search a category and a neighbourhood, and
            click through the listings looking for ones with no website link. It works, and for a
            single afternoon in a single area it is genuinely the fastest way to start.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            It stops working at scale for three reasons. Maps has no "no website" filter, so every
            listing has to be opened individually. The results are capped per search, so a dense area
            needs the map moved and re-searched dozens of times to be covered properly. And the
            website field lies in both directions — profiles pointing at a dead domain, a Linktree or
            a Facebook page all need a human to judge.
          </p>
          <p style={{ margin: 0 }}>
            That checking is what is already done here.{" "}
            <Link href="/leads/methodology" style={{ color: "var(--g-green-text)", textDecoration: "underline" }}>
              How these figures are produced
            </Link>{" "}
            sets out the method, including what we exclude and why.
          </p>
        </Prose>
      </Section>

      <Faq items={FAQS} />

      <Cta
        title="Start with your own city"
        body="Browsing every city page is free and needs no account. Credits are only spent when you unlock a specific business's phone number and address."
        href="/find-businesses-without-websites"
        label="Search any city"
      />
    </PageShell>
  );
}
