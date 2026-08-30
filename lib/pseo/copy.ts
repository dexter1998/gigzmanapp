import type { PseoPageData } from "@/lib/pseo/page-data";

export type Faq = { q: string; a: string };

const dateFmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

const pct = (n: number) => `${Math.round(n * 100)}%`;
/** Indian digit grouping, matching every other number on the page. */
const num = (n: number) => n.toLocaleString("en-IN");

/**
 * FAQ answers built from the page's own figures.
 *
 * The same ten questions with the same ten answers across ninety pages is the clearest scaled
 * content smell there is, so nothing here is a fixed string: every answer quotes numbers from this
 * slice, and questions only appear when the data makes them answerable. A page with no rating
 * coverage does not get the "are these businesses still trading" question, because it could not
 * answer it honestly.
 */
export function faqsFor(data: PseoPageData): Faq[] {
  const { stats, city, service, areaName, categoryLabel } = data;
  const place = areaName ? `${areaName}, ${city.name}` : city.name;
  const subject = categoryLabel ? `${categoryLabel} businesses in ${place}` : `businesses in ${place}`;
  const faqs: Faq[] = [];

  faqs.push({
    q: `How many ${subject} have no website?`,
    a:
      `${num(stats.qualifying)} of the ${num(stats.checked)} ${subject} we have checked have no website of their own — ` +
      `${pct(stats.gapRate)}. ` +
      (stats.unknown > 0
        ? `A further ${num(stats.unknown)} have not been checked either way; they are excluded from both sides of that figure rather than counted as having no site.`
        : `Every business in this slice has been checked in both directions.`),
  });

  faqs.push({
    q: "Where does this data come from?",
    a:
      `Business names, categories, ratings and review counts come from public Google Maps listings, observed by Mantis` +
      `${dateFmt(stats.verifiedRange.newest) ? ` — most recently on ${dateFmt(stats.verifiedRange.newest)}` : ""}. ` +
      `The website gap rates, area rankings, Lead Scores and coverage figures are our own calculations from that data and are published nowhere else. ` +
      `We do not resell Google's data; we publish what we measured on top of it.`,
  });

  if (stats.medianReviewsNoWebsite !== null && stats.medianReviewsWithWebsite !== null && stats.medianReviewsNoWebsite > 0) {
    faqs.push({
      q: "Are these businesses actually still trading?",
      a:
        `Most are. Among ${subject} that carry reviews, the median business without a website has ` +
        `${stats.medianReviewsNoWebsite} reviews, against ${stats.medianReviewsWithWebsite} for those that have one` +
        `${stats.medianRatingNoWebsite !== null ? `, at a median rating of ${stats.medianRatingNoWebsite.toFixed(1)}★` : ""}. ` +
        `A listing with dozens of recent reviews and no website is an active business, not an abandoned pin.`,
    });
  }

  faqs.push({
    q: "How is the Lead Score calculated?",
    a:
      `It is a 0–100 score combining rating, review volume, business category and how complete the listing is — the same ` +
      `function the Mantis app uses, so a score here never disagrees with one inside the product. It is deterministic: ` +
      `the same business scores the same every time. The full method is on our methodology page.`,
  });

  faqs.push({
    q: `Is this the complete list of ${subject} with no website?`,
    a:
      `It is the complete set we have verified. ${num(stats.coverage.exhausted)} of the ${num(stats.coverage.cells)} map cells covering ` +
      `${place} have been searched to exhaustion` +
      `${dateFmt(stats.coverage.lastVerified) ? `, most recently on ${dateFmt(stats.coverage.lastVerified)}` : ""}, ` +
      `which is why we can state a rate rather than just a count. Coverage deepens over time and these figures are recalculated daily.`,
  });

  faqs.push({
    q: "What do I get for free, and what needs an account?",
    a:
      `Every statistic on this page, plus each business's name, category, area, rating, review count, Lead Score and the date ` +
      `we last checked it, is free and needs no account. Phone numbers, email addresses and exact street addresses are not ` +
      `published here — those are what a free ${service.name} account unlocks, along with saving leads and exporting them.`,
  });

  if (data.rank && data.rank.of > 1) {
    faqs.push({
      q: `How does ${areaName} compare with the rest of ${city.name}?`,
      a:
        `It ranks ${ordinal(data.rank.byCount)} of ${data.rank.of} areas in ${city.name} by number of businesses without a ` +
        `website, and ${ordinal(data.rank.byGapRate)} by the share that lack one (${pct(stats.gapRate)} here). ` +
        `Rankings are recomputed daily against every other area we cover in the city.`,
    });
  }

  faqs.push({
    q: "How often is this page updated?",
    a:
      `Statistics are recalculated daily. The listed businesses are re-sorted on a fifteen-day cycle so the page is not a ` +
      `single frozen snapshot. We deliberately do not stamp today's date on a page that has not changed — the "figures last ` +
      `changed" date below moves only when the underlying numbers actually move.`,
  });

  return faqs;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
