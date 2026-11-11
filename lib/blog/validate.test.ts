/**
 * Validator for /api/admin/blog/publish.  Run: bun test lib/blog/validate.test.ts
 * (node:test + node:assert, so tsc and `next build` type-check it without bun's own types).
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validatePost, type ValidateContext } from "./validate";

const ctx: ValidateContext = {
  published: new Set(["how-to-find-clients", "my-new-post"]),
  fileExists: (p) => ["/resources/thumbs/a.webp", "/resources/thumbs/a-og.jpg"].includes(p),
};

const h2 = (id: string) => ({ type: "h2", id, text: `Section ${id}` });
const good = () => ({
  slug: "my-new-post",
  title: "How to Get Clients for a Printing Business in India",
  excerpt: "Who buys printing in bulk, the signals that show a business is about to order, and how to win the repeat contract.",
  meta_description: "How to get clients for a printing business in India: find offices, schools and retailers about to order, and win repeat printing contracts year after year.",
  category: "Client Acquisition",
  cluster: "growth",
  tags: ["Printing", "B2B Sales"],
  read_minutes: 7,
  body: [
    { type: "prose", text: ["Printing clients come from businesses that order on a cycle. See [how to find clients](/resources/how-to-find-clients)."] },
    h2("who-buys"), h2("signals"), h2("channels"), h2("script"), h2("pricing"),
    { type: "steps", items: [{ title: "Find", detail: "List offices", icon: "search" }] },
    { type: "youtube", id: "dQw4w9WgXcQ", title: "How a print shop wins contracts" },
    { type: "cta", variant: "table", title: "Find buyers", detail: "Mantis finds them", action: "Start", href: "/login" },
  ],
  faqs: [{ q: "Who buys printing?", a: "Offices, schools and retailers." }],
  links: [["/resources/how-to-find-clients", "how to find clients"], ["/leads/website-development/in/gurgaon", "Gurgaon leads"]],
  hero_image: "/resources/thumbs/a.webp",
  hero_alt: "Illustration of a printing press",
  status: "draft",
});

describe("validatePost", () => {
  test("a good post passes with no warnings", () => {
    const r = validatePost(good(), ctx);
    if (!r.ok) throw new Error(r.errors.join("\n"));
    assert.equal(r.post.slug, "my-new-post");
    assert.equal(r.post.hero_variant, "leads");
    assert.deepEqual(r.warnings, []);
  });

  test("an unknown block type is rejected", () => {
    const p = good();
    (p.body as unknown[]).push({ type: "video", url: "https://youtu.be/x" });
    const r = validatePost(p, ctx);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.join(" ").includes('unknown block type "video"'));
  });

  test("an extra field on a known block is rejected", () => {
    const p = good();
    (p.body as unknown[]).push({ type: "tip", title: "T", text: "x", colour: "green" });
    const r = validatePost(p, ctx);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.join(" ").includes('unknown field "colour"'));
  });

  test("a cluster that is not a BLOG_CLUSTERS key is rejected", () => {
    const r = validatePost({ ...good(), cluster: "seo" }, ctx);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.join(" ").includes("cluster must be one of"));
  });

  test("a category outside BLOG_CATEGORIES is rejected", () => {
    const r = validatePost({ ...good(), category: "Growth Hacks" }, ctx);
    assert.equal(r.ok, false);
  });

  test("dead internal links are rejected and listed — links array and inline prose", () => {
    const p = good();
    p.links.push(["/resources/not-written-yet", "soon"]);
    (p.body[0] as { text: string[] }).text.push("Also [this](/resources/also-missing#x).");
    const r = validatePost(p, ctx);
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(r.deadLinks.sort(), ["/resources/also-missing#x", "/resources/not-written-yet"]);
  });

  test("bad slug, youtube URL instead of id, off-site image, missing hero file", () => {
    const p = { ...good(), slug: "My Post", hero_image: "/resources/thumbs/missing.webp" };
    (p.body as unknown[]).push({ type: "youtube", id: "https://youtube.com/watch?v=dQw4w9WgXcQ", title: "Video" });
    (p.body as unknown[]).push({ type: "image", src: "https://example.com/x.png", alt: "An image" });
    const r = validatePost(p, ctx);
    assert.equal(r.ok, false);
    if (!r.ok) {
      const all = r.errors.join("\n");
      assert.ok(all.includes("slug must match"));
      assert.ok(all.includes("11-character video id"));
      assert.ok(all.includes("src must be a local path"));
      assert.ok(all.includes("must exist on the site"));
    }
  });

  test("editorial targets are warnings, not errors", () => {
    const r = validatePost({ ...good(), title: "Printing clients in India: who buys and how to win the contract each year" }, ctx);
    assert.equal(r.ok, true);
    assert.equal(r.warnings.some((w) => w.startsWith("title is")), true);
  });
});
