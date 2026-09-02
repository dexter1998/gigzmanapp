/**
 * Converts the generated thumbnails and wires them onto posts.
 *
 * Source PNGs are 1600×900 at ~1.5MB each — 156MB for the set, which is not shippable. They are
 * flat illustrations, so WebP takes them to roughly 25–35KB with no visible loss.
 *
 * On alt text: these sit directly beside the post title on the card and in the hero, so repeating
 * the title would make a screen reader read it twice. The alt describes what the illustration
 * depicts instead, which is also what makes it useful as an OG image description.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { sql } from "@/lib/db";
import { OVERRIDES } from "./blog-thumbnails";

const SRC = "/Users/dextermorgan/Downloads/mantis-blog-thumbnails-all-106";
const OUT = path.join(process.cwd(), "public", "resources", "thumbs");

/** Subject descriptions, not titles. Every one describes what is drawn. */
const ALT: Record<string, string> = {
  vertical: "Flat illustration of a {x} shown alongside its website and map listing",
  data: "Flat illustration representing {x}",
  outreach: "Flat illustration of {x}",
  tools: "Flat illustration comparing {x}",
  ops: "Flat illustration of {x}",
};

/** Per-post subject phrase. Kept explicit because a generated phrase reads like a generated phrase. */
const SUBJECT: Record<string, string> = {
  "are-lawyers-and-accountants-a-good-web-design-niche": "a professional practice office beside an informational website",
  "do-businesses-without-websites-get-fewer-reviews": "two shopfronts compared, one without a website and few reviews, one with a website and many",
  "high-ticket-web-design-niches-in-india": "several business types stacked by the value each one supports",
  "how-many-local-businesses-have-no-website": "a row of shopfronts with only some of them connected to a website",
  "india-vs-uk-vs-australia-website-adoption": "three markets compared side by side",
  "scraping-google-maps-for-leads-what-breaks": "a map grid feeding a data pipeline",
  "should-you-niche-down-what-the-data-says": "one business category separated out from a wider group",
  "state-of-local-lead-generation-2026": "an annual summary of local business data",
  "the-lifetime-value-of-one-local-client": "a single client relationship extending over time",
  "the-real-size-of-the-indian-web-design-market": "the scale of an addressable local market",
  "tier-1-vs-tier-2-india-website-gap": "a metro and a smaller city compared",
  "tier-2-indian-cities-are-the-real-web-design-market": "a smaller Indian city's high street",
  "web-design-for-dentists-an-honest-look": "a dental clinic beside an appointment page",
  "which-business-types-least-likely-to-have-a-website": "business categories ranked by how many lack a website",
  "which-indian-cities-have-the-biggest-website-gap": "Indian cities ranked by website gap",
  "which-local-verticals-actually-pay-for-a-website": "several local business types ranked side by side",
  "which-retail-shops-actually-need-a-website": "retail shopfronts compared by whether each needs a website",
  "why-every-no-website-statistic-is-outdated": "an old statistic set against a live measurement",
  "building-a-weekly-prospecting-routine": "a weekly calendar with prospecting blocks marked",
  "businesses-near-me-without-a-website": "nearby businesses pinned on a local map",
  "call-whatsapp-or-walk-in-indian-smbs": "three outreach channels compared — phone, messaging and visiting in person",
  "cold-call-script-selling-websites-local-businesses": "a phone call to a local shop",
  "cold-email-for-local-businesses-when-it-works": "an email sent toward a local business",
  "does-cold-calling-still-work-for-web-design": "a phone ringing at a shop counter",
  "google-maps-prospecting-for-web-designers": "a map interface being used to find businesses",
  "handling-its-too-expensive-without-discounting": "a price being discussed rather than reduced",
  "handling-we-dont-need-a-website": "a shop owner declining a pitch",
  "how-many-businesses-should-be-in-your-pipeline": "a sales pipeline holding a set of prospects",
  "how-many-touches-before-a-local-business-buys": "a sequence of repeated contacts leading to a sale",
  "how-to-build-a-lead-list-for-a-web-design-agency": "a list of businesses being assembled and filtered",
  "how-to-find-businesses-that-need-a-website": "businesses on a map filtered down to those without a website",
  "how-to-find-small-businesses-without-a-website-in-india": "Indian small businesses located on a map",
  "how-to-take-advance-payment-from-indian-clients": "a payment being made at a counter",
  "qualifying-a-local-lead-before-you-call": "a business listing being checked before contact",
  "selling-in-hindi-what-changes-in-a-sales-call": "a conversation between a salesperson and a shop owner",
  "territory-planning-splitting-a-city-between-reps": "a city map divided into working areas",
  "the-first-call-10-questions-that-qualify-a-lead": "a first conversation with a business owner",
  "the-free-mockup-play-does-it-still-close": "a website mockup being shown to an owner",
  "we-already-have-a-facebook-page-objection": "a social page set against an owned website",
  "what-to-say-to-a-business-with-no-website": "an opening conversation at a shop counter",
  "what-to-send-a-local-business-after-the-call": "a follow-up message on a phone",
  "whatsapp-outreach-local-business-india": "a messaging conversation with a local business",
  "where-to-find-web-design-clients": "several client sources shown together",
  "why-well-do-it-cheaper-is-a-losing-position": "two quotes compared on price alone",
  "good-better-best-packaging-website-offers": "three service packages presented side by side",
  "hourly-project-or-value-pricing-model": "three pricing models compared",
  "how-indian-agencies-win-uk-and-australian-clients": "work crossing between countries",
  "how-much-to-charge-for-a-website-india": "a price being set for a website build",
  "how-to-find-clients-for-web-development": "a business system rather than a brochure site",
  "how-to-grow-a-web-agency-past-5-lakh-a-month": "an agency's revenue growing month on month",
  "how-to-price-a-website-redesign": "an old website being replaced by a new one",
  "how-to-sell-maintenance-plans-after-the-build": "a website being updated month after launch",
  "how-to-sell-websites-to-bakeries-and-cafes": "a bakery shopfront beside an order catalogue",
  "how-to-sell-websites-to-car-repair-shops": "a garage workshop beside a website mockup",
  "how-to-sell-websites-to-car-washes": "a car wash beside a booking page",
  "how-to-sell-websites-to-caterers": "a catering setup beside an event quote form",
  "how-to-sell-websites-to-coaching-centres": "a coaching institute alongside an enquiry form",
  "how-to-sell-websites-to-electronics-stores": "an electronics shop beside a product range page",
  "how-to-sell-websites-to-farms": "a farm beside a direct-sales page",
  "how-to-sell-websites-to-guest-houses": "a small guest house beside a booking page",
  "how-to-sell-websites-to-gyms": "a gym interior alongside a membership signup page",
  "how-to-sell-websites-to-hardware-stores": "a hardware store beside a product range page",
  "how-to-sell-websites-to-laundries": "a laundry beside a pickup and delivery request page",
  "how-to-sell-websites-to-restaurants": "a restaurant shopfront beside a website mockup and a map pin",
  "how-to-sell-websites-to-salons-and-barbershops": "a salon alongside a booking page",
  "how-to-sell-websites-to-sports-academies": "a sports academy alongside an admission enquiry page",
  "how-to-sell-websites-to-tailors": "a tailoring boutique beside a portfolio gallery",
  "how-to-sell-websites-to-wholesalers": "a wholesale supplier beside a trade enquiry page",
  "how-to-start-a-web-design-agency-in-india": "a new agency being set up",
  "web-design-for-contractors-where-the-leads-are": "a tradesperson's van beside a services page",
  "website-maintenance-plans-what-to-charge": "a monthly care plan attached to a website",
  "why-facebook-only-businesses-are-your-best-prospects": "a business running on a social page alone",
  "your-first-10-web-design-clients": "a first set of client projects",
  "apollo-alternative-local-business-leads": "a contact database set against local map listings",
  "best-lead-generation-tools-for-indian-agencies": "lead tools compared for the Indian market",
  "best-lead-generation-tools-for-web-design-agencies": "several lead tools compared",
  "bought-database-vs-live-search": "a static file set against a live search",
  "credit-based-vs-seat-based-lead-tools": "two software pricing models compared",
  "do-you-need-an-email-finder-for-local-businesses": "an email search returning nothing for a local business",
  "exclusive-leads-vs-your-own-list": "a bought lead set against a self-built list",
  "free-ways-to-find-businesses-without-websites": "free methods for finding businesses",
  "google-maps-scrapers-compared": "map scraping tools compared",
  "justdial-indiamart-as-lead-sources": "directory listings used as a source of prospects",
  "lead-generation-tools-that-work-outside-the-us": "lead data coverage across countries",
  "should-you-buy-web-design-leads": "leads being purchased against leads being found",
  "why-apollo-and-zoominfo-miss-businesses-without-websites": "a database search returning no record for a local business",
  "why-tech-stack-filtering-misses-your-best-prospects": "a website scanner with nothing to scan",
};

/** Posts without a hand-written description fall back to this. It is accurate for every image in
 *  the set — all 106 are flat green-and-cream illustrations of the article's subject — but it is
 *  noticeably weaker than the hand-written ones, and the remaining 65 are worth doing properly. */
function fallbackAlt(title: string) {
  const subject = title
    .replace(/\s*[—:(].*$/, "")                                    // drop subtitles and years
    .replace(/^(How to|Why|What|Which|Where|Does|Do|Are|Should|The)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();
  return `Flat green-and-cream illustration depicting ${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = new Map<string, string>();
  for (const d of fs.readdirSync(SRC)) {
    const p = path.join(SRC, d);
    if (fs.statSync(p).isDirectory())
      for (const f of fs.readdirSync(p)) if (f.endsWith(".png")) files.set(f.replace(/\.png$/, ""), path.join(p, f));
  }

  const posts = (await sql`
    SELECT slug, title, category FROM blog_posts WHERE status = 'published'
  `) as unknown as { slug: string; title: string; category: string }[];
  const byslug = new Map(posts.map((p) => [p.slug, p]));

  let done = 0, bytesIn = 0, bytesOut = 0;
  for (const [file, slug] of Object.entries(OVERRIDES)) {
    const src = files.get(file);
    const post = byslug.get(slug);
    if (!src || !post) { console.log("  !! skip", file, "->", slug); continue; }

    const dest = path.join(OUT, `${slug}.webp`);
    bytesIn += fs.statSync(src).size;
    await sharp(src).resize(1600, 900, { fit: "cover" }).webp({ quality: 85, effort: 6 }).toFile(dest);
    bytesOut += fs.statSync(dest).size;

    // Separate OG derivative. WebP previews are still unreliable across WhatsApp, LinkedIn and some
    // Slack unfurls, and OG wants 1.91:1 rather than 16:9 — so this is a JPEG at 1200×630. The
    // illustrations are centre-weighted with padding, so the crop takes nothing that matters.
    const og = path.join(OUT, `${slug}-og.jpg`);
    await sharp(src).resize(1200, 630, { fit: "cover", position: "centre" })
      .jpeg({ quality: 84, mozjpeg: true }).toFile(og);
    bytesOut += fs.statSync(og).size;

    const alt = SUBJECT[slug]
      ? `Flat illustration of ${SUBJECT[slug]}`
      : fallbackAlt(post.title);

    await sql`
      UPDATE blog_posts
      SET hero_image = ${`/resources/thumbs/${slug}.webp`}, hero_alt = ${alt}
      WHERE slug = ${slug}
    `;
    done++;
  }
  console.log(`\n  ✓ ${done} thumbnails converted and wired`);
  console.log(`    ${(bytesIn / 1048576).toFixed(0)}MB PNG → ${(bytesOut / 1048576).toFixed(1)}MB WebP`);
  console.log(`    average ${(bytesOut / done / 1024).toFixed(0)}KB each`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
