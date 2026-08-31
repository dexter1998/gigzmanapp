-- Split out of db/schema.sql; see that file for the reasoning.
-- Bulk pre-scanned regions.
--
-- A region we covered offline with a broad Places sweep (scripts/places-scan.ts), recorded so the
-- live grid search can skip ground we already own. Without this the bulk scan is invisible to
-- /api/leads/find: that route decides whether to spend money by looking for an exhausted
-- area_type_scans row under an exact `lat_lng_section_batch` key that only its own searchNearby
-- grid ever writes, so 125,000 stored leads would sit there while every request re-bought them.
--
-- The claim is deliberately per (city, section) rather than per city. The sweep asks 106 search
-- phrases, which is not the same as asking for all 370 allowlisted types — so a section is only
-- marked covered if the sweep actually produced a real number of leads whose primaryType belongs
-- to it. Claiming a whole city would make the route skip discovery for sections nobody swept,
-- which is not a saving, it is silent data loss dressed as one.
CREATE TABLE IF NOT EXISTS prescanned_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  section TEXT NOT NULL,                  -- a CATEGORY_SECTIONS key, matching what the route asks for
  min_lat DOUBLE PRECISION NOT NULL,
  min_lng DOUBLE PRECISION NOT NULL,
  max_lat DOUBLE PRECISION NOT NULL,
  max_lng DOUBLE PRECISION NOT NULL,
  lead_count INT NOT NULL,                -- allowlisted, non-competitor leads this section holds here
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescanned_key ON prescanned_regions(city_slug, section);
-- The route's lookup is "which region covers this point for this section", on every request.
CREATE INDEX IF NOT EXISTS idx_prescanned_section ON prescanned_regions(section);
