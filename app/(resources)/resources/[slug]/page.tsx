import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { COMPANY } from "@/lib/company";
import { ogImageUrl, type OgVariant } from "@/lib/og";
import { BLOG_CLUSTERS } from "@/lib/blog/blocks";
import { getPost, linksFor, publishedSlugs } from "@/lib/blog/db";
import { Blocks } from "@/components/blog/Blocks";
import { Icon } from "@/components/blog/icons";

/** Prerendered, not dynamic. That one decision fixes four things at once: AI crawlers (which do
 *  not execute JavaScript) get complete HTML, metadata resolves into <head> instead of being
 *  streamed into the body, a missing slug 404s with a real status code, and TTFB stays low. */
export async function generateStaticParams() {
  try {
    return (await publishedSlugs()).map(({ slug }) => ({ slug }));
  } catch {
    // A build must never require the database — the container build has no network to it.
    return [];
  }
}
export const revalidate = 3600;

/** Deduped so generateMetadata and the page share one query, per Next's own guidance. */
const load = cache(async (slug: string) => getPost(slug));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) return { title: "Not found" };
  const url = `${COMPANY.site}/resources/${post.slug}`;
  return {
    // Title and H1 stay identical — matching them measurably reduces how often Google rewrites
    // the title, and a rewritten title is a title we didn't choose.
    title: { absolute: post.title },
    description: post.meta_description ?? post.excerpt,
    alternates: { canonical: url },
    authors: [{ name: post.author.name }],
    openGraph: {
      type: "article",
      url,
      siteName: COMPANY.brand,
      title: post.title,
      description: post.meta_description ?? post.excerpt,
      publishedTime: new Date(post.published_at).toISOString(),
      modifiedTime: new Date(post.content_updated_at ?? post.published_at).toISOString(),
      authors: [post.author.name],
      images: [{
        url: ogImageUrl({
          v: (post.hero_variant as OgVariant) ?? "methodology",
          eyebrow: post.category,
          t1: post.title.split(" ").slice(0, 4).join(" "),
          t2: post.title.split(" ").slice(4).join(" ").slice(0, 46),
          url: `mantisai.in/resources/${post.slug}`,
        }),
        width: 1200, height: 630, alt: post.title,
      }],
    },
    twitter: { card: "summary_large_image" },
  };
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) notFound();

  const { explicit, siblings } = await linksFor(post.slug, post.cluster);
  const hub = BLOG_CLUSTERS[post.cluster];
  const toc = post.body.filter((b): b is Extract<typeof b, { type: "h2" }> => b.type === "h2");
  const url = `${COMPANY.site}/resources/${post.slug}`;

  /* Article + BreadcrumbList only. FAQPage is deliberately absent: Google ended FAQ rich results
     on 7 May 2026 and deleted the documentation, so the markup would render nothing. The FAQs
     below are still written — for readers, and because a direct question-and-answer pair is the
     most quotable shape a passage can take. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.meta_description ?? post.excerpt,
        datePublished: new Date(post.published_at).toISOString(),
        dateModified: new Date(post.content_updated_at ?? post.published_at).toISOString(),
        author: { "@type": "Person", name: post.author.name, url: post.author.linkedin_url ?? `${COMPANY.site}/resources` },
        image: [ogImageUrl({ v: (post.hero_variant as OgVariant) ?? "methodology", eyebrow: post.category, t1: post.title.slice(0, 44) })],
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Resources", item: `${COMPANY.site}/resources` },
          { "@type": "ListItem", position: 2, name: post.category, item: `${COMPANY.site}/resources?category=${encodeURIComponent(post.category)}` },
          { "@type": "ListItem", position: 3, name: post.title },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify does not escape "<" — required, not optional, since titles are editable.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="rc-wrap">
        <article>
          <header className="rc-article-hero">
            <div className="rc-eyebrow">{post.category}</div>
            <h1>{post.title}</h1>
            <p className="sub">{post.excerpt}</p>
            <div className="rc-byline">
              <span>By <b>{post.author.name}</b></span>
              <span>·</span>
              {/* Visible date, matching the JSON-LD exactly — Google reconciles the two and
                  prefers a date it can see on the page. */}
              <span>Published {fmtDate(post.published_at)}</span>
              {post.content_updated_at && <><span>·</span><span>Updated {fmtDate(post.content_updated_at)}</span></>}
              <span>·</span>
              <span>{post.read_minutes} min read</span>
            </div>
            {post.tags.length > 0 && (
              <div className="rc-tags">{post.tags.map((t) => <span className="rc-tag" key={t}>{t}</span>)}</div>
            )}
          </header>

          <div className="rc-article">
            <nav className="rc-toc" aria-label="On this page">
              <div className="label">On this page</div>
              {toc.map((h) => <a key={h.id} href={`#${h.id}`}>{h.text}</a>)}
            </nav>

            <div className="rc-body">
              <Blocks blocks={post.body} />

              {post.faqs.length > 0 && (
                <>
                  <h2 id="faq">Frequently asked questions</h2>
                  <div className="rc-faq">
                    {post.faqs.map((f, i) => (
                      <details key={i}>
                        <summary>{f.q}</summary>
                        <p>{f.a}</p>
                      </details>
                    ))}
                  </div>
                </>
              )}

              {/* Every post links up to its cluster hub and across to siblings. Internal link
                  count and click depth are what Google says it reads as relative importance —
                  the link graph is the mechanism, not the label "topical authority". */}
              <h2 id="related">Related reading</h2>
              <div className="rc-related">
                <Link href={hub.hub}>
                  <div className="rc-cat">{hub.label}</div>
                  <h4>Start here</h4>
                  <p>The hub for everything in this cluster.</p>
                </Link>
                {siblings.map((s) => (
                  <Link key={s.slug} href={`/resources/${s.slug}`}>
                    <div className="rc-cat">{post.category}</div>
                    <h4>{s.title}</h4>
                    <p>Same cluster.</p>
                  </Link>
                ))}
              </div>
              {explicit.length > 0 && (
                <p style={{ marginTop: 18, fontSize: 14 }}>
                  {explicit.map((l, i) => (
                    <span key={l.to_href}>
                      {i > 0 && " · "}
                      {l.to_href.startsWith("/") ? <Link href={l.to_href}>{l.anchor}</Link> : <a href={l.to_href} rel="noopener">{l.anchor}</a>}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </article>
      </div>

      <section className="rc-close">
        <div className="rc-wrap">
          <h2>Your next clients are <em>already nearby.</em></h2>
          <p>Find high-intent local businesses and grow your agency with confidence.</p>
          <div className="row">
            <Link href="/login" className="rc-btn">Get free access <Icon name="arrow" /></Link>
            <Link href="/partner" className="rc-btn dark">Partner with us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
