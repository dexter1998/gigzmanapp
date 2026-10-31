/**
 * GitHub source benchmark: discovery → own site (blog) → Website Enrich API.
 * How many developers/shops come with a site, how many sites read, how many publish an email there.
 * usage: npx tsx --env-file=.env.local scripts/v2-testsuite/bench-github.ts
 */
import { searchGithub, NOT_A_SITE } from "@/lib/v2/sources/github";
import { enrichSite } from "@/lib/v2/enrich-site";

const QUERIES = [
  { label: "TypeScript devs, Gurgaon", location: "Gurgaon", language: "TypeScript", type: "user" as const, minFollowers: 5 },
  { label: "Dev orgs, Bangalore", location: "Bangalore", type: "org" as const, minFollowers: 5 },
  { label: "Flutter devs, India", location: "India", language: "Dart", type: "user" as const, minFollowers: 20 },
];

async function main() {
  for (const q of QUERIES) {
    const people = await searchGithub({ ...q, limit: 25 });
    const withBlog = people.filter((p) => p.blog && !NOT_A_SITE.test(p.blog));
    const enriched = await Promise.all(withBlog.map((p) => enrichSite(p.blog!, ["contacts", "meta", "pages"]).catch(() => null)));
    const read = enriched.filter((e) => e?.ok);
    const email = read.filter((e) => e!.contacts?.emails.length);
    console.log(`${q.label}: ${people.length} profiles · ${withBlog.length} with own site · ${read.length} sites read · ${email.length} publish an email on their site · ${people.filter((p) => p.profileEmailReference).length} profile emails (reference only)`);
    for (const [i, p] of withBlog.slice(0, 3).entries()) console.log(`   ${p.login} (${p.company ?? "-"}) → ${p.blog} → ${enriched[i]?.contacts?.emails.slice(0, 2).join(", ") || "no email on site"}`);
  }
  process.exit(0);
}
main();
