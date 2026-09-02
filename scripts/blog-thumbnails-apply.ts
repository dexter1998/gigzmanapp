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
  "how-to-sell-websites-to-restaurants": "a restaurant shopfront beside a website mockup and a map pin",
  "how-to-sell-websites-to-coaching-centres": "a coaching institute alongside a website and enquiry form",
  "how-to-sell-websites-to-car-repair-shops": "a garage workshop beside a website mockup",
  "how-to-sell-websites-to-gyms": "a gym interior alongside a membership signup page",
  "how-to-sell-websites-to-salons-and-barbershops": "a salon alongside a booking page",
  "how-to-sell-websites-to-hardware-stores": "a hardware store beside a product range page",
  "how-to-sell-websites-to-guest-houses": "a small guest house beside a booking page",
  "how-to-sell-websites-to-bakeries-and-cafes": "a bakery shopfront beside an order catalogue",
  "how-to-sell-websites-to-sports-academies": "a sports academy alongside an admission enquiry page",
  "how-to-sell-websites-to-tailors": "a tailoring boutique beside a portfolio gallery",
  "how-to-sell-websites-to-electronics-stores": "an electronics shop beside a product range page",
  "how-to-sell-websites-to-car-washes": "a car wash beside a booking page",
  "how-to-sell-websites-to-laundries": "a laundry beside a pickup and delivery request page",
  "how-to-sell-websites-to-wholesalers": "a wholesale supplier beside a trade enquiry page",
  "how-to-sell-websites-to-caterers": "a catering setup beside an event quote form",
  "how-to-sell-websites-to-farms": "a farm beside a direct-sales page",
  "which-retail-shops-actually-need-a-website": "retail shopfronts compared by whether each has a website",
  "web-design-for-contractors-where-the-leads-are": "a tradesperson's van beside a services page",
  "web-design-for-dentists-an-honest-look": "a dental clinic beside an appointment page",
  "are-lawyers-and-accountants-a-good-web-design-niche": "a professional practice beside an informational website",
  "which-local-verticals-actually-pay-for-a-website": "several local business types ranked side by side",
  "do-businesses-without-websites-get-fewer-reviews": "two shopfronts compared, one without a website and few reviews, one with a website and many",
};

/** Everything not named above gets a description built from its cluster and category. */
function fallbackAlt(title: string, category: string) {
  const t = title.replace(/\s*[—:(].*$/, "").replace(/^(How to|Why|What|Which|Where|Does|Do|Are|Should)\s+/i, "");
  return `Flat illustration for ${category.toLowerCase()}: ${t.toLowerCase()}`;
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
      : fallbackAlt(post.title, post.category);

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
