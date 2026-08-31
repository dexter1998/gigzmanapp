-- Multi-country lead pages. Additive and inert to the product, like the rest of the pSEO columns:
-- dropping this feature leaves these columns harmless.
--
-- `city_slug` alone was sufficient while there was one country. It still identifies a city (slugs
-- are globally unique by construction — see lib/pseo/locations.ts), but every aggregate that wants
-- "this country's pages" would otherwise have to join through the registry in application code.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code TEXT;   -- ISO 3166-1 alpha-2, lowercase
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
-- 'components' | 'text' | 'coordinates' — which resolution path produced city_slug. A coverage
-- shortfall traced to the parser and one traced to the scan need completely different fixes, and
-- without this the two are indistinguishable after the fact.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_via TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country_code, city_slug, has_website);

ALTER TABLE pseo_pages ADD COLUMN IF NOT EXISTS country_code TEXT;
CREATE INDEX IF NOT EXISTS idx_pseo_pages_country ON pseo_pages(country_code, status);

-- Backfill: every lead that predates this scan is Indian. Safe because the registry contained only
-- Indian cities until now, so any resolved row is by definition in India.
UPDATE leads SET country_code = 'in' WHERE country_code IS NULL AND city_slug IS NOT NULL;
UPDATE pseo_pages SET country_code = 'in' WHERE country_code IS NULL;
