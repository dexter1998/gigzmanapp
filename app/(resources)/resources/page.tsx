import Link from "next/link";
import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { BLOG_CATEGORIES } from "@/lib/blog/blocks";
import { listPosts, countPosts, featuredPost } from "@/lib/blog/db";
import Image from "next/image";
import { Icon } from "@/components/blog/icons";
import { OrigamiFloor } from "@/components/marketing/MarketingPieces";

export const dynamic = "force-dynamic";

const PER_PAGE = 6;

export const metadata: Metadata = {
  title: { absolute: `Resources — Playbooks for Finding Local Clients | ${COMPANY.brandLong}` },
  description:
    "Playbooks, comparisons and original data for agencies and freelancers who sell websites to " +
    "local businesses. Find high-intent prospects and close more of them. Start free.",
  alternates: { canonical: `${COMPANY.site}/resources` },
  openGraph: {
    title: "Playbooks to find and close local clients",
    description: "Guides, tool comparisons and original research for agencies selling to local businesses.",
    url: `${COMPANY.site}/resources`,
    siteName: COMPANY.brand,
    type: "website",
    images: ogImageMeta({
      v: "methodology", eyebrow: "Mantis Resources", t1: "Playbooks to find",
      t2: "and close local clients.", cta: "Read the guides →", url: "mantisai.in/resources",
    }),
  },
  twitter: { card: "summary_large_image" },
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

export default async function ResourcesIndex({ searchParams }: Props) {
  const sp = await searchParams;
  const category = sp.category && (BLOG_CATEGORIES as readonly string[]).includes(sp.category) ? sp.category : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [featured, posts, total] = await Promise.all([
    page === 1 && !category ? featuredPost() : Promise.resolve(null),
    listPosts({ category, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
    countPosts(category),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (category) u.set("category", category);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/resources?${s}` : "/resources";
  };

  return (
    <>
      <section className="rc-hero">
        <OrigamiFloor height={200} opacity={0.6} />
        <div className="rc-wrap">
        <div className="rc-eyebrow" style={{ position: "relative", zIndex: 1 }}>Mantis Resources</div>
        <h1 style={{ position: "relative", zIndex: 1 }}>Playbooks to <em>find and close</em> local clients.</h1>
        <p style={{ position: "relative", zIndex: 1 }}>Actionable guides and strategies for lead generation, web discovery, and contact enrichment.</p>
        </div>
      </section>

      <div className="rc-wrap">

      {featured && (
        <Link href={`/resources/${featured.slug}`} className="rc-featured" style={{ textDecoration: "none" }}>
          <div className="rc-featured-art">
            {featured.hero_image && (
              <Image src={featured.hero_image} alt={featured.hero_alt ?? ""} fill priority
                     sizes="340px" style={{ objectFit: "cover" }} />
            )}
          </div>
          <div className="rc-featured-body">
            <span className="rc-badge">Featured</span>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <div className="rc-meta">
              <span><Icon name="clock" /> {featured.read_minutes} min read</span>
              <span className="read">Read article →</span>
            </div>
          </div>
        </Link>
      )}

      <div className="rc-filters">
        <form action="/resources" method="get">
          <input className="rc-search" type="search" name="q" placeholder="Search resources, guides, and playbooks…" aria-label="Search resources" />
        </form>
        <div className="rc-pills">
          <Link href="/resources" className={`rc-pill${!category ? " on" : ""}`}>All</Link>
          {BLOG_CATEGORIES.map((c) => (
            <Link key={c} href={`/resources?category=${encodeURIComponent(c)}`} className={`rc-pill${category === c ? " on" : ""}`}>{c}</Link>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "var(--g-gray-500)", padding: "40px 0", textAlign: "center" }}>
          Nothing here yet. The first playbooks are being written.
        </p>
      ) : (
        <div className="rc-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/resources/${p.slug}`} className="rc-card">
              <div className="rc-card-art">
                {p.hero_image && (
                  <Image src={p.hero_image} alt={p.hero_alt ?? ""} fill
                         sizes="(max-width:640px) 100vw, 360px" style={{ objectFit: "cover" }} />
                )}
              </div>
              <div className="rc-card-body">
                <div className="rc-cat">{p.category}</div>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <div className="rc-card-foot">
                  <span>{fmtDate(p.published_at)}</span>
                  <span>{p.read_minutes} min read →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="rc-pages" aria-label="Pagination">
          {page > 1 && <Link href={qs(page - 1)} aria-label="Previous page">‹</Link>}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
            .map((n, idx, arr) => (
              <span key={n} style={{ display: "contents" }}>
                {idx > 0 && arr[idx - 1] !== n - 1 && <span className="gap">…</span>}
                <Link href={qs(n)} className={n === page ? "on" : undefined} aria-current={n === page ? "page" : undefined}>{n}</Link>
              </span>
            ))}
          {page < pages && <Link href={qs(page + 1)} aria-label="Next page">›</Link>}
        </nav>
      )}

      <section className="rc-news">
        <div>
          <h2>Local opportunities,<br /><em>delivered weekly.</em></h2>
          <p>Get actionable playbooks, platform updates, and proven strategies to help you find and close more local clients.</p>
        </div>
        <form style={{ display: "flex", gap: 8 }}>
          <input className="rc-search" style={{ width: 240 }} type="email" placeholder="Enter your email" aria-label="Email address" />
          <button className="rc-btn dark" type="submit">Subscribe</button>
        </form>
      </section>
      </div>
    </>
  );
}
