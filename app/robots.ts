import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

/** Everything that must stay out of every crawler's reach, AI or otherwise. Kept in one place so a
 *  new bot group can never quietly forget one of them. */
const PRIVATE_PATHS = [
  "/api/",
  // Signed unsubscribe links. A crawler following one would be requesting an opt-out URL for a
  // real subscriber; the endpoint only mutates on POST, but these should not be fetched at all.
  "/u/",
  // Authenticated product surfaces — nothing here renders for a crawler anyway.
  // Note /leads is NOT here: it is the public programmatic lead-market section. The authenticated
  // lead table moved to /my-leads precisely so this prefix could be crawled — robots Disallow
  // matches by prefix, so the two could never have coexisted.
  "/home",
  "/my-leads",
  "/chat",
  "/lms",
  "/profile",
  "/onboarding",
  // Account flows: no search value, and /verify carries an email in its query string.
  "/login",
  "/verify",
  "/preferences",
];

/**
 * Assistant and answer-engine crawlers, given an explicit welcome.
 *
 * They already fall under the `*` group, so this changes nothing about what they may fetch. It is
 * here because several of these bots are opt-in by convention — Google-Extended and
 * Applebot-Extended in particular control AI training and answer use independently of Googlebot —
 * and a named group is the only way to say yes deliberately rather than by omission.
 *
 * Deliberately NOT copied from the usual template: `Disallow: /_next/`. Blocking the build output
 * blocks the CSS and JavaScript a renderer needs, and Google is explicit that doing so degrades how
 * it sees the page. Our pages are server-rendered, so a bot that cannot fetch /_next/ still reads
 * the content — but there is no upside to blocking it either.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "FacebookBot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_AGENTS,
        // The two llms files and the sitemap index are named explicitly. Redundant against
        // `Allow: /`, but they are the entry points these crawlers look for, and naming them is
        // the cheapest way to make the invitation unambiguous.
        allow: ["/", "/llms.txt", "/llms-full.txt", "/sitemap.xml", "/leads/feed.xml"],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${COMPANY.site}/sitemap.xml`,
    host: COMPANY.site,
  };
}
