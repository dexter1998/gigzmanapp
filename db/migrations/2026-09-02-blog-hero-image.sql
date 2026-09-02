-- A real hero image per post, alongside the generated /api/og card.
--
-- hero_variant picks the background for the rendered social card; hero_image is an actual
-- illustration used on the index card, the article hero, and as the og:image when present.
-- Two columns because they answer different questions: one is "which art", the other is
-- "is there a bespoke image for this post at all".
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS hero_image TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS hero_alt TEXT;
