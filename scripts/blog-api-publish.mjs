#!/usr/bin/env node
/**
 * Publish (or dry-run) one /resources article through POST /api/admin/blog/publish.
 *
 *   MANTIS_BLOG_TOKEN=… node scripts/blog-api-publish.mjs post.json [--dry-run]
 *   MANTIS_BLOG_TOKEN=… node scripts/blog-api-publish.mjs --get <slug>
 *
 * MANTIS_BLOG_URL defaults to https://mantisai.in. The token is gigzman/blog-publish-token in
 * Secrets Manager. post.json is the payload described in lib/blog/validate.ts; "status": "draft"
 * keeps it off the site. Exit code 0 on ok, 1 on a validation/HTTP error, 2 on bad usage.
 */
import fs from "node:fs";

const base = (process.env.MANTIS_BLOG_URL || "https://mantisai.in").replace(/\/$/, "");
const token = process.env.MANTIS_BLOG_TOKEN;
const args = process.argv.slice(2);
if (!token) { console.error("MANTIS_BLOG_TOKEN is not set"); process.exit(2); }

let res;
if (args[0] === "--get") {
  if (!args[1]) { console.error("usage: --get <slug>"); process.exit(2); }
  res = await fetch(`${base}/api/admin/blog/${encodeURIComponent(args[1])}`, { headers: { authorization: `Bearer ${token}` } });
} else {
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) { console.error("usage: node blog-api-publish.mjs post.json [--dry-run] | --get <slug>"); process.exit(2); }
  const post = JSON.parse(fs.readFileSync(file, "utf8"));
  if (args.includes("--dry-run")) post.dry_run = true;
  res = await fetch(`${base}/api/admin/blog/publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(post),
  });
}
const text = await res.text();
let out;
try { out = JSON.parse(text); } catch { out = { ok: false, http: res.status, body: text.slice(0, 500) }; }
console.log(JSON.stringify(out, null, 2));
process.exit(res.ok && out.ok ? 0 : 1);
