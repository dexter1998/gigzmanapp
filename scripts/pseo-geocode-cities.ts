/**
 * Prints ready-to-paste `City` entries for lib/pseo/locations.ts, with centroid and bbox taken
 * from the Geocoding API's own viewport for the place.
 *
 * The registry is curated by hand on purpose (see locations.ts), and this does not change that —
 * it produces a draft for a human to review and paste, not a generated file the app reads. What
 * it removes is the one part of an entry nobody can write honestly from memory: the bounding box.
 * That box is the integrity check every resolved lead is tested against, so a guessed one either
 * silently drops real businesses or silently swallows a neighbouring city's.
 *
 * Geocoding is a different SKU from Places ($5/1,000, 10,000 free per month), so a run of this
 * size costs nothing and does not touch the Text Search budget.
 *
 *   GOOGLE_PLACES_API_KEY=... npx tsx scripts/pseo-geocode-cities.ts
 */

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) { console.error("GOOGLE_PLACES_API_KEY not set"); process.exit(1); }

type Seed = { slug: string; countryCode: string; query: string; name?: string };

/** Slugs are global, not per-country: `city_slug` is a bare column on `leads` and the key of every
 *  pSEO aggregate, so two cities sharing one would silently merge into a single page. Where a name
 *  is ambiguous worldwide the slug carries a qualifier even if today's registry has no collision —
 *  `london` is Greater London, and a future London, Ontario has to arrive as `london-on`. */
const SEEDS: Seed[] = [
  { slug: "leeds", countryCode: "gb", query: "Leeds, United Kingdom" },
  { slug: "glasgow", countryCode: "gb", query: "Glasgow, United Kingdom" },
  { slug: "liverpool", countryCode: "gb", query: "Liverpool, United Kingdom" },
  { slug: "bristol", countryCode: "gb", query: "Bristol, United Kingdom" },
  // Added later, once the 20% United Kingdom share turned out to need more than three cities
  // to absorb it.
  // India — 50% of the scan budget.
  { slug: "mumbai", countryCode: "in", query: "Mumbai, Maharashtra, India" },
  { slug: "bangalore", countryCode: "in", query: "Bengaluru, Karnataka, India", name: "Bangalore" },
  { slug: "hyderabad", countryCode: "in", query: "Hyderabad, Telangana, India" },
  { slug: "chennai", countryCode: "in", query: "Chennai, Tamil Nadu, India" },
  { slug: "pune", countryCode: "in", query: "Pune, Maharashtra, India" },
  { slug: "ahmedabad", countryCode: "in", query: "Ahmedabad, Gujarat, India" },
  { slug: "kolkata", countryCode: "in", query: "Kolkata, West Bengal, India" },
  { slug: "jaipur", countryCode: "in", query: "Jaipur, Rajasthan, India" },
  { slug: "surat", countryCode: "in", query: "Surat, Gujarat, India" },
  { slug: "lucknow", countryCode: "in", query: "Lucknow, Uttar Pradesh, India" },
  { slug: "indore", countryCode: "in", query: "Indore, Madhya Pradesh, India" },
  { slug: "noida", countryCode: "in", query: "Noida, Uttar Pradesh, India" },
  { slug: "chandigarh", countryCode: "in", query: "Chandigarh, India" },
  { slug: "coimbatore", countryCode: "in", query: "Coimbatore, Tamil Nadu, India" },
  // United States — 30%.
  { slug: "austin", countryCode: "us", query: "Austin, Texas, USA" },
  { slug: "phoenix", countryCode: "us", query: "Phoenix, Arizona, USA" },
  { slug: "charlotte", countryCode: "us", query: "Charlotte, North Carolina, USA" },
  { slug: "nashville", countryCode: "us", query: "Nashville, Tennessee, USA" },
  { slug: "tampa", countryCode: "us", query: "Tampa, Florida, USA" },
  { slug: "denver", countryCode: "us", query: "Denver, Colorado, USA" },
  { slug: "san-antonio", countryCode: "us", query: "San Antonio, Texas, USA" },
  { slug: "kansas-city", countryCode: "us", query: "Kansas City, Missouri, USA" },
  // Australia, United Kingdom, Canada — 20% between them.
  { slug: "sydney", countryCode: "au", query: "Sydney, New South Wales, Australia" },
  { slug: "melbourne", countryCode: "au", query: "Melbourne, Victoria, Australia" },
  { slug: "brisbane", countryCode: "au", query: "Brisbane, Queensland, Australia" },
  { slug: "london", countryCode: "gb", query: "London, United Kingdom" },
  { slug: "manchester", countryCode: "gb", query: "Manchester, United Kingdom" },
  { slug: "birmingham", countryCode: "gb", query: "Birmingham, United Kingdom" },
  { slug: "toronto", countryCode: "ca", query: "Toronto, Ontario, Canada" },
  { slug: "vancouver", countryCode: "ca", query: "Vancouver, British Columbia, Canada" },
  { slug: "calgary", countryCode: "ca", query: "Calgary, Alberta, Canada" },
];

type GeocodeComponent = { long_name: string; short_name: string; types: string[] };
type GeocodeResult = {
  address_components?: GeocodeComponent[];
  geometry: { location: { lat: number; lng: number }; viewport: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } } };
};

const comp = (r: GeocodeResult, type: string, short = false) =>
  r.address_components?.find((c) => c.types.includes(type))?.[short ? "short_name" : "long_name"] ?? null;

async function main() {
  const seen = new Set<string>();
  for (const s of SEEDS) {
    if (seen.has(s.slug)) { console.error(`DUPLICATE SLUG: ${s.slug}`); process.exit(1); }
    seen.add(s.slug);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(s.query)}&key=${KEY}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status !== "OK" || !j.results?.length) { console.error(`  // ${s.slug}: FAILED ${j.status} ${j.error_message ?? ""}`); continue; }

    const res: GeocodeResult = j.results[0];
    const loc = res.geometry.location;
    // The viewport, not `bounds`: bounds is the tight legal boundary and is absent for some
    // places, while viewport is always present and is the area Google itself would frame the city
    // in — which is what "is this lead plausibly in this city" wants.
    const vp = res.geometry.viewport;
    const country = comp(res, "country", true);
    const state = comp(res, "administrative_area_level_1") ?? comp(res, "country");

    if (country?.toLowerCase() !== s.countryCode) {
      console.error(`  // ${s.slug}: WRONG COUNTRY, geocoder says ${country}, seed says ${s.countryCode.toUpperCase()}`);
    }

    const name = s.name ?? comp(res, "locality") ?? comp(res, "postal_town") ?? s.slug;
    const f = (n: number) => Number(n.toFixed(4));
    console.log(`  {
    slug: ${JSON.stringify(s.slug)},
    countryCode: ${JSON.stringify(s.countryCode)},
    name: ${JSON.stringify(name)},
    aliases: [${JSON.stringify(name.toLowerCase())}],
    state: ${JSON.stringify(state)},
    centroid: { lat: ${f(loc.lat)}, lng: ${f(loc.lng)} },
    bbox: [${f(vp.southwest.lat)}, ${f(vp.southwest.lng)}, ${f(vp.northeast.lat)}, ${f(vp.northeast.lng)}],
    status: "draft",
  },`);
    await new Promise((r) => setTimeout(r, 120));
  }
  console.error(`\n${SEEDS.length} seeds geocoded (Geocoding SKU, free tier — Text Search budget untouched).`);
}
main();
