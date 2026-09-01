-- Resource Center (blog). Content lives in the database rather than MDX files so a post can be
-- edited and re-published without a deploy, and so the index can filter/search server-side.
--
-- Deliberately NOT reusing pseo_pages: those rows are generated and gated by lead data, these are
-- written by a person. Conflating them would put editorial content behind a data quality gate.

BEGIN;

CREATE TABLE IF NOT EXISTS blog_authors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  -- Only what is true. An invented credential is a Low-quality signal in Google's own rater
  -- guidelines, so this stays sparse rather than padded.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,                     -- <title> and H1 (kept identical: matching them
                                            -- measurably reduces Google's title rewrites)
  excerpt TEXT NOT NULL,                   -- card text + meta description source
  meta_description TEXT,                   -- overrides excerpt when the SERP needs different copy
  category TEXT NOT NULL,                  -- one of BLOG_CATEGORIES; drives the index filter pills
  cluster TEXT NOT NULL,                   -- topical cluster: which hub this post links up to
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_slug TEXT NOT NULL REFERENCES blog_authors(slug),
  hero_variant TEXT,                       -- /api/og background variant
  read_minutes INT NOT NULL DEFAULT 6,
  body JSONB NOT NULL DEFAULT '[]',        -- ordered blocks; see lib/blog/blocks.ts
  faqs JSONB NOT NULL DEFAULT '[]',        -- [{q,a}] — rendered for readers, no FAQPage schema
                                            -- (Google ended FAQ rich results on 7 May 2026)
  status TEXT NOT NULL DEFAULT 'draft',    -- draft | published
  featured BOOLEAN NOT NULL DEFAULT false, -- at most one; the index's hero card
  published_at TIMESTAMPTZ,
  -- Only bumped when the content actually changes. Google discounts lastmod it can't verify, and
  -- restamping without an edit is named as a search-engine-first signal in its own docs.
  content_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_live ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_cluster ON blog_posts(cluster, published_at DESC) WHERE status = 'published';

-- Editorial internal links. Modelled on the gigzman PSEO engine's link formula: every post links
-- up to its cluster hub, across to siblings, and down into the lead pages. Stored rather than
-- computed so an editor can override a bad automatic pick.
CREATE TABLE IF NOT EXISTS blog_links (
  from_slug TEXT NOT NULL REFERENCES blog_posts(slug) ON DELETE CASCADE,
  to_href TEXT NOT NULL,
  anchor TEXT NOT NULL,                    -- descriptive; must make sense read alone
  kind TEXT NOT NULL,                      -- hub | sibling | lead_page | external
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (from_slug, to_href)
);

COMMIT;
