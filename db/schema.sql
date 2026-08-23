-- gigzmanapp core schema (ROADMAP: see plan — leads, area_scans, lead_enrichment, unlocks)

CREATE TABLE IF NOT EXISTS area_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by TEXT NOT NULL,              -- user email (Auth.js Google identity)
  area_label TEXT NOT NULL,                -- e.g. "Sadar Bazar, Gurugram"
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  category TEXT,                           -- barbershop, hair_salon, nail_salon, spa, plumbing,
                                            -- electrician, landscaping, roofing, ... (confirmed
                                            -- list from Pindrop's own filter panel)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | discovering | enriching | done | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_scan_id UUID REFERENCES area_scans(id),
  place_id TEXT UNIQUE NOT NULL,           -- Google Places place_id, dedup key
  business_name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  has_website BOOLEAN,                     -- NULL = still checking (grey/pending state)
  website_checked_at TIMESTAMPTZ,
  contacted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_area_scan ON leads(area_scan_id);
CREATE INDEX IF NOT EXISTS idx_leads_has_website ON leads(has_website);

CREATE TABLE IF NOT EXISTS lead_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  social_links JSONB,
  ad_spend_signals JSONB,
  tech_stack JSONB,
  -- source/provider intentionally not yet set — data source for this table is a real open item,
  -- not chosen yet (see plan file)
  enriched_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  unlocked_by TEXT NOT NULL,               -- user email
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UI-only premium flag for now (no real payment gateway yet — plan-confirmed decision)
  UNIQUE (lead_id, unlocked_by)
);
