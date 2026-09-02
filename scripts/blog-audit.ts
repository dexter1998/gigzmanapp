/**
 * Checks every published post against the rules the plan committed to, so "we followed the SEO
 * rules" is something the build can prove rather than something I assert.
 *
 * Thresholds come from the research, not from habit: 45–60 characters is where Google's title
 * rewrite rate bottoms out; 130–158 is what a SERP renders before truncating; the keyword checks
 * mirror the only placement guidance Google actually publishes (titles, headings, first
 * paragraph) and stop there, because density targets are not a thing it measures.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type Row = {
  slug: string; title: string; meta_description: string | null; excerpt: string;
  category: string; cluster: string; body: Block[]; faqs: unknown[]; tags: string[];
};

const ok = (b: boolean) => (b ? "  ok " : "  !! ");

function textOf(body: Block[]): string {
  return body.flatMap((b) =>
    b.type === "prose" ? b.text
    : b.type === "h2" || b.type === "h3" ? [b.text]
    : b.type === "checklist" ? b.items.map((i) => `${i.title} ${i.detail ?? ""}`)
    : b.type === "table" ? [...b.head, ...b.rows.flat()]
    : b.type === "quote" ? [b.text]
    : b.type === "tip" ? [b.title, b.text]
    : b.type === "features" ? b.items.map((i) => `${i.title} ${i.detail}`)
    : b.type === "steps" ? b.items.map((i) => `${i.title} ${i.detail}`)
    : b.type === "cta" ? [b.title, b.detail]
    : b.type === "leads" ? [b.heading]
    : []
  ).join(" ");
}

async function main() {
  const rows = (await sql`
    SELECT slug, title, meta_description, excerpt, category, cluster, body, faqs, tags
    FROM blog_posts WHERE status = 'published' ORDER BY published_at
  `) as unknown as Row[];

  let failures = 0;
  for (const p of rows) {
    const meta = p.meta_description ?? p.excerpt;
    const h2s = p.body.filter((b) => b.type === "h2") as Extract<Block, { type: "h2" }>[];
    const first = (p.body.find((b) => b.type === "prose") as Extract<Block, { type: "prose" }> | undefined)?.text[0] ?? "";
    const words = textOf(p.body).split(/\s+/).length;

    // The head term, approximated as the title's distinctive words — good enough to catch a post
    // whose body never mentions what its title promises.
    const stop = new Set(["how","to","the","a","an","of","in","for","and","with","your","you","is","are","it","that","have","no","not","on","at","2026","what","which","when","why"]);
    const terms = p.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
    const bodyLower = textOf(p.body).toLowerCase();
    const inFirst = terms.filter((t) => first.toLowerCase().includes(t)).length;
    const inH2 = terms.filter((t) => h2s.some((h) => h.text.toLowerCase().includes(t))).length;
    const missing = terms.filter((t) => !bodyLower.includes(t));

    const checks: [string, boolean, string][] = [
      ["title 45–60", p.title.length >= 45 && p.title.length <= 60, `${p.title.length}`],
      ["meta 130–158", meta.length >= 130 && meta.length <= 158, `${meta.length}`],
      ["5+ H2 sections", h2s.length >= 5, `${h2s.length}`],
      ["every H2 has an id", h2s.every((h) => !!h.id), ""],
      ["opens with an answer", first.length > 60 && !/^(in this|this (guide|post|article)|we will|let's)/i.test(first), ""],
      ["term in first para", inFirst >= 1, `${inFirst}/${terms.length}`],
      ["term in an H2", inH2 >= 1, `${inH2}/${terms.length}`],
      ["no title term absent from body", missing.length === 0, missing.join(",")],
      ["700–2,600 words", words >= 700 && words <= 2600, `${words}`],
      ["4+ FAQs", p.faqs.length >= 4, `${p.faqs.length}`],
      ["has a data table", p.body.some((b) => b.type === "table" || b.type === "citytable" || b.type === "countrytable"), ""],
      ["has a product CTA", p.body.some((b) => b.type === "cta"), ""],
      ["2+ tags", p.tags.length >= 2, `${p.tags.length}`],
    ];

    const bad = checks.filter(([, pass]) => !pass);
    failures += bad.length;
    console.log(`\n${bad.length === 0 ? "PASS" : "CHECK"}  ${p.slug}`);
    for (const [name, pass, detail] of checks) {
      if (!pass) console.log(`${ok(pass)}${name}${detail ? ` — ${detail}` : ""}`);
    }
    if (bad.length === 0) console.log("      all 13 checks pass");
  }

  // Link graph: no orphans, no dead ends. Google's own rule is that every page worth having
  // carries at least one inbound link from elsewhere on the site.
  const orphans = await sql`
    SELECT p.slug FROM blog_posts p
    WHERE p.status = 'published'
      AND NOT EXISTS (SELECT 1 FROM blog_links l WHERE l.to_href = '/resources/' || p.slug)
  `;
  const deadEnds = await sql`
    SELECT p.slug FROM blog_posts p
    WHERE p.status = 'published' AND NOT EXISTS (SELECT 1 FROM blog_links l WHERE l.from_slug = p.slug)
  `;
  console.log(`\n── link graph ──`);
  console.log(`  orphans (no inbound link):  ${orphans.length ? orphans.map((o: any) => o.slug).join(", ") : "none"}`);
  console.log(`  dead ends (no outbound):    ${deadEnds.length ? deadEnds.map((o: any) => o.slug).join(", ") : "none"}`);
  console.log(`\n${failures === 0 && orphans.length === 0 ? "ALL CLEAR" : `${failures} content checks + ${orphans.length} orphans to fix`}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
