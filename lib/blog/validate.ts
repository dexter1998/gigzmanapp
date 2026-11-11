import { BLOG_CATEGORIES, BLOG_CLUSTERS, type Block, type BlogCluster } from "@/lib/blog/blocks";
import { OG_BACKGROUNDS, type OgVariant } from "@/lib/og";
import { BLOCK_ICONS } from "@/components/blog/icons";

/**
 * Runtime check of a post submitted through /api/admin/blog/publish.
 *
 * The seed scripts only ever had tsc between them and the jsonb columns, and a block the renderer
 * does not know is skipped without a word — so a malformed post goes live as a page with holes in
 * it. The API is written to by an external agent with no compiler at all, which makes this the
 * only check. Pure (no DB, no fs): the caller passes in which slugs are published and which local
 * files exist, so the same code is what the unit tests exercise.
 *
 * Errors block the write. Warnings are the audit's editorial targets (scripts/blog-audit.ts) —
 * worth fixing, not worth refusing a post over.
 */

export type PublishInput = {
  slug: string; title: string; excerpt: string; meta_description: string; category: string;
  cluster: BlogCluster; tags: string[]; read_minutes: number; body: Block[]; faqs: { q: string; a: string }[];
  links: [string, string][]; hero_image: string | null; hero_alt: string | null; hero_variant: OgVariant;
  status: "draft" | "published";
};

export type ValidateContext = {
  /** Slugs that are published right now, plus this post's own slug. */
  published: Set<string>;
  /** Whether a path under public/ exists, e.g. "/resources/thumbs/x.webp". */
  fileExists: (publicPath: string) => boolean;
};

export type ValidateResult =
  | { ok: true; post: PublishInput; warnings: string[] }
  | { ok: false; errors: string[]; deadLinks: string[]; warnings: string[] };

export const SLUG_RE = /^[a-z0-9-]{3,90}$/;
/** In-article links to another article, as written in prose: [anchor](/resources/slug). */
const INLINE_LINK = /\[[^\]]+\]\(([^)\s]+)\)/g;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const LOCAL_PATH = /^\/[A-Za-z0-9/_.-]+$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown, min = 1, max = 5000): v is string => typeof v === "string" && v.trim().length >= min && v.length <= max;
const isStrArr = (v: unknown, minLen = 1): v is string[] => Array.isArray(v) && v.length >= minLen && v.every((x) => isStr(x));
const optStr = (v: unknown) => v === undefined || isStr(v);
const optNum = (v: unknown) => v === undefined || (typeof v === "number" && Number.isFinite(v) && v > 0);

/** Exact key sets per block type: an extra key is almost always a typo of a real one
 *  ("caption" vs "captions"), and the renderer would silently drop it. */
const BLOCK_KEYS: Record<string, string[]> = {
  prose: ["text"], h2: ["text", "id"], h3: ["text"], checklist: ["items"], table: ["head", "rows", "note"],
  features: ["items"], steps: ["items"], cta: ["variant", "title", "detail", "action", "href"],
  countrytable: ["note"], citytable: ["country", "min", "limit", "order", "note"],
  leads: ["city", "heading", "limit", "country"], image: ["src", "alt", "caption", "credit", "width", "height"],
  tip: ["title", "text"], quote: ["text", "attribution", "href"], youtube: ["id", "title"],
};

function checkBlock(b: unknown, at: string, err: (m: string) => void, warn: (m: string) => void, ctx: ValidateContext) {
  if (!isObj(b) || typeof b.type !== "string") return err(`${at}: not a block object with a "type"`);
  const keys = BLOCK_KEYS[b.type];
  if (!keys) return err(`${at}: unknown block type "${b.type}" (allowed: ${Object.keys(BLOCK_KEYS).join(", ")})`);
  for (const k of Object.keys(b)) if (k !== "type" && !keys.includes(k)) err(`${at} (${b.type}): unknown field "${k}"`);
  const icon = (name: unknown, where: string) => {
    if (!isStr(name)) err(`${where}: icon missing`);
    else if (!(name in BLOCK_ICONS)) warn(`${where}: icon "${name}" is not one of ${Object.keys(BLOCK_ICONS).join(", ")} — shows the search icon`);
  };
  switch (b.type) {
    case "prose": if (!isStrArr(b.text)) err(`${at} (prose): text must be a non-empty array of strings`); break;
    case "h2":
      if (!isStr(b.text, 3, 160)) err(`${at} (h2): text 3–160 chars`);
      if (typeof b.id !== "string" || !/^[a-z0-9-]{2,60}$/.test(b.id)) err(`${at} (h2): id must match ^[a-z0-9-]{2,60}$`);
      break;
    case "h3": if (!isStr(b.text, 3, 160)) err(`${at} (h3): text 3–160 chars`); break;
    case "checklist":
      if (!Array.isArray(b.items) || !b.items.length || !b.items.every((i) => isObj(i) && isStr(i.title) && optStr(i.detail) && Object.keys(i).every((k) => k === "title" || k === "detail")))
        err(`${at} (checklist): items must be [{title, detail?}]`);
      break;
    case "table": {
      const head = b.head, rows = b.rows;
      if (!isStrArr(head)) { err(`${at} (table): head must be an array of strings`); break; }
      if (!Array.isArray(rows) || !rows.length || !rows.every((r) => Array.isArray(r) && r.every((c) => typeof c === "string")))
        err(`${at} (table): rows must be string[][]`);
      else rows.forEach((r, j) => { if ((r as string[]).length !== head.length) err(`${at} (table): row ${j} has ${(r as string[]).length} cells, head has ${head.length}`); });
      if (!optStr(b.note)) err(`${at} (table): note must be a string`);
      break;
    }
    case "features": case "steps":
      if (!Array.isArray(b.items) || !b.items.length) { err(`${at} (${b.type}): items must be a non-empty array`); break; }
      b.items.forEach((i, j) => {
        if (!isObj(i) || !isStr(i.title) || !isStr(i.detail)) err(`${at} (${b.type}) item ${j}: needs title, detail, icon`);
        else { icon(i.icon, `${at} (${b.type}) item ${j}`); for (const k of Object.keys(i)) if (!["title", "detail", "icon"].includes(k)) err(`${at} (${b.type}) item ${j}: unknown field "${k}"`); }
      });
      break;
    case "cta":
      if (!["map", "table", "leadcard"].includes(b.variant as string)) err(`${at} (cta): variant must be map | table | leadcard`);
      for (const k of ["title", "detail", "action", "href"]) if (!isStr(b[k])) err(`${at} (cta): ${k} required`);
      break;
    case "countrytable": if (!optStr(b.note)) err(`${at} (countrytable): note must be a string`); break;
    case "citytable":
      if (!optStr(b.country) || !optNum(b.min) || !optNum(b.limit) || !optStr(b.note)) err(`${at} (citytable): country/note strings, min/limit positive numbers`);
      if (b.order !== undefined && b.order !== "gap" && b.order !== "size") err(`${at} (citytable): order must be gap | size`);
      break;
    case "leads":
      if (typeof b.city !== "string" || !SLUG_RE.test(b.city)) err(`${at} (leads): city must be a city slug like "gurgaon"`);
      if (!isStr(b.heading)) err(`${at} (leads): heading required`);
      if (!optNum(b.limit) || !optStr(b.country)) err(`${at} (leads): limit number, country string`);
      break;
    case "image":
      // next/image has no remote hosts configured: an off-site src throws at render and takes the
      // whole article down with it, so only files that ship in public/ are accepted.
      if (typeof b.src !== "string" || !LOCAL_PATH.test(b.src)) err(`${at} (image): src must be a local path like /resources/thumbs/x.webp`);
      else if (!ctx.fileExists(b.src)) err(`${at} (image): ${b.src} does not exist on the site`);
      if (!isStr(b.alt, 5, 300)) err(`${at} (image): alt 5–300 chars`);
      if (!optStr(b.caption) || !optStr(b.credit) || !optNum(b.width) || !optNum(b.height)) err(`${at} (image): caption/credit strings, width/height numbers`);
      break;
    case "tip": if (!isStr(b.title) || !isStr(b.text)) err(`${at} (tip): title and text required`); break;
    case "quote":
      if (!isStr(b.text) || !isStr(b.attribution)) err(`${at} (quote): text and attribution required`);
      if (b.href !== undefined && (typeof b.href !== "string" || !/^https:\/\//.test(b.href))) err(`${at} (quote): href must be https://`);
      break;
    case "youtube":
      if (typeof b.id !== "string" || !YOUTUBE_ID.test(b.id)) err(`${at} (youtube): id must be the 11-character video id, not a URL`);
      if (!isStr(b.title, 3, 200)) err(`${at} (youtube): title 3–200 chars (it is the iframe's accessible name)`);
      break;
  }
}

/** Every href a post points at: prose/tip/checklist inline links, CTA hrefs and the links list. */
function hrefsIn(body: unknown, links: [string, string][]): string[] {
  const out = links.map(([h]) => h);
  for (const m of JSON.stringify(body).matchAll(INLINE_LINK)) out.push(m[1]!);
  if (Array.isArray(body)) for (const b of body) if (isObj(b) && b.type === "cta" && typeof b.href === "string") out.push(b.href);
  return out;
}

export function validatePost(raw: unknown, ctx: ValidateContext): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => { errors.push(m); };
  const warn = (m: string) => { warnings.push(m); };
  if (!isObj(raw)) return { ok: false, errors: ["body must be a JSON object"], deadLinks: [], warnings };

  const allowed = ["slug", "title", "excerpt", "meta_description", "category", "cluster", "tags", "read_minutes", "body", "faqs", "links", "hero_image", "hero_alt", "hero_variant", "status", "dry_run"];
  for (const k of Object.keys(raw)) if (!allowed.includes(k)) err(`unknown field "${k}"`);

  const r = raw;
  if (typeof r.slug !== "string" || !SLUG_RE.test(r.slug)) err("slug must match ^[a-z0-9-]{3,90}$");
  if (!isStr(r.title, 20, 110)) err("title must be 20–110 characters");
  else if (r.title.length < 45 || r.title.length > 60) warn(`title is ${r.title.length} chars; 45–60 is the target`);
  if (!isStr(r.excerpt, 50, 320)) err("excerpt must be 50–320 characters");
  if (!isStr(r.meta_description, 70, 200)) err("meta_description must be 70–200 characters");
  else if (r.meta_description.length < 130 || r.meta_description.length > 158) warn(`meta_description is ${r.meta_description.length} chars; 130–158 is the target`);
  if (!(BLOG_CATEGORIES as readonly string[]).includes(r.category as string)) err(`category must be one of: ${BLOG_CATEGORIES.join(", ")}`);
  if (typeof r.cluster !== "string" || !(r.cluster in BLOG_CLUSTERS)) err(`cluster must be one of: ${Object.keys(BLOG_CLUSTERS).join(", ")}`);
  if (!Array.isArray(r.tags) || r.tags.length > 8 || !r.tags.every((t) => isStr(t, 2, 40))) err("tags must be up to 8 strings of 2–40 chars");
  if (!Number.isInteger(r.read_minutes) || (r.read_minutes as number) < 1 || (r.read_minutes as number) > 60) err("read_minutes must be an integer 1–60");
  if (r.status !== "draft" && r.status !== "published") err('status must be "draft" or "published"');
  if (r.dry_run !== undefined && typeof r.dry_run !== "boolean") err("dry_run must be a boolean");
  const variant = r.hero_variant ?? "leads";
  if (typeof variant !== "string" || !(variant in OG_BACKGROUNDS)) err(`hero_variant must be one of: ${Object.keys(OG_BACKGROUNDS).join(", ")}`);

  if (!Array.isArray(r.body) || r.body.length === 0) err("body must be a non-empty array of blocks");
  else if (r.body.length > 200) err("body has more than 200 blocks");
  else {
    r.body.forEach((b, i) => checkBlock(b, `body[${i}]`, err, warn, ctx));
    const ids = r.body.filter((b) => isObj(b) && b.type === "h2").map((b) => (b as Obj).id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) err(`duplicate h2 ids: ${[...new Set(dup)].join(", ")}`);
    if (ids.length < 5) warn(`${ids.length} H2 sections; 5+ is the target`);
    if (JSON.stringify(r.body).includes("[[")) warn("body still has [[slug|anchor]] tokens — write real [anchor](/resources/slug) links");
  }
  if (!Array.isArray(r.faqs) || r.faqs.length > 20 || !r.faqs.every((f) => isObj(f) && isStr(f.q, 5, 300) && isStr(f.a, 5, 2000) && Object.keys(f).every((k) => k === "q" || k === "a")))
    err("faqs must be up to 20 items of {q, a}");
  const links = r.links;
  if (!Array.isArray(links) || links.length > 30 || !links.every((l) => Array.isArray(l) && l.length === 2 && isStr(l[0]) && isStr(l[1], 3, 120)))
    err("links must be up to 30 [href, anchor] pairs");

  // Hero: an illustration already on the site. The article page derives the social card from the
  // same name (x.webp → x-og.jpg), so both files must exist or the og:image 404s.
  const hero = r.hero_image ?? null;
  if (hero !== null) {
    const m = typeof hero === "string" ? /^\/resources\/thumbs\/[a-z0-9-]+\.webp$/.exec(hero) : null;
    if (!m) err("hero_image must be /resources/thumbs/<name>.webp (or omitted for the generated card)");
    else if (!ctx.fileExists(hero as string) || !ctx.fileExists((hero as string).replace(/\.webp$/, "-og.jpg")))
      err(`hero_image ${hero} (and its -og.jpg pair) must exist on the site`);
    if (!isStr(r.hero_alt, 5, 300)) err("hero_alt (5–300 chars) is required with hero_image");
  } else if (r.hero_alt !== undefined && r.hero_alt !== null) warn("hero_alt ignored without hero_image");

  // Links to other articles must land on a live article. External links are allowed; other
  // internal paths (/leads/…, /login) are not checked here.
  const deadLinks: string[] = [];
  if (Array.isArray(links)) {
    for (const href of hrefsIn(r.body, links as [string, string][])) {
      const m = /^\/resources\/([^/?#]+)\/?(?:[?#].*)?$/.exec(href);
      if (m && !ctx.published.has(m[1]!)) deadLinks.push(href);
      else if (!href.startsWith("/") && !/^https:\/\//.test(href) && !href.startsWith("mailto:")) err(`link "${href}" must be a /path or https:// URL`);
    }
  }
  if (deadLinks.length) err(`links to articles that are not published: ${[...new Set(deadLinks)].join(", ")}`);

  if (errors.length) return { ok: false, errors, deadLinks: [...new Set(deadLinks)], warnings };
  return {
    ok: true, warnings,
    post: {
      slug: r.slug as string, title: (r.title as string).trim(), excerpt: (r.excerpt as string).trim(), meta_description: (r.meta_description as string).trim(),
      category: r.category as string, cluster: r.cluster as BlogCluster, tags: r.tags as string[], read_minutes: r.read_minutes as number,
      body: r.body as Block[], faqs: r.faqs as { q: string; a: string }[], links: links as [string, string][],
      hero_image: hero as string | null, hero_alt: hero ? (r.hero_alt as string) : null, hero_variant: variant as OgVariant,
      status: r.status as "draft" | "published",
    },
  };
}
