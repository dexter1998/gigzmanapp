-- gigzmanapp core schema (ROADMAP: see plan — leads, area_scans, lead_enrichment, unlocks)

CREATE TABLE IF NOT EXISTS area_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by TEXT NOT NULL,              -- user email (Auth.js Google identity)
  area_label TEXT NOT NULL,                -- e.g. "Sadar Bazar, Gurugram"
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  category TEXT,                           -- one real Google Place Type per scan (barber_shop,
                                            -- plumber, lawyer, accounting, ... — see
                                            -- CATEGORY_TYPE_MAP in the find route)
  cache_key TEXT,                          -- "<lat_rounded>_<lng_rounded>_<category>" — lets a
                                            -- repeat search of roughly the same area+category
                                            -- reuse existing leads instead of re-billing Places API
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | discovering | enriching | done | failed
  full_depth BOOLEAN NOT NULL DEFAULT true, -- false = pan-triggered, only fetched 1 Places API
                                             -- page instead of 3 — a shallow scan can satisfy a
                                             -- future shallow request but must never be reused to
                                             -- answer a full-depth one, or real businesses beyond
                                             -- page 1 silently stay hidden for the whole cache
                                             -- freshness window
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- area_scans predates cache_key/full_depth — CREATE TABLE IF NOT EXISTS above is a no-op once
-- the table already exists, so new columns need their own explicit migration.
ALTER TABLE area_scans ADD COLUMN IF NOT EXISTS cache_key TEXT;
ALTER TABLE area_scans ADD COLUMN IF NOT EXISTS full_depth BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_area_scans_cache_key ON area_scans(cache_key);

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
  is_competitor BOOLEAN NOT NULL DEFAULT false, -- web/app/software dev shops — not a lead, shown
                                                 -- as a red/danger pin instead of grey/green/amber
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- leads predates is_competitor — same reasoning as area_scans.cache_key above.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN NOT NULL DEFAULT false;

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

-- Onboarding, plan/credits, and partner program (Auth.js is JWT-only, no adapter/users table —
-- email is the stable identity key here, same pattern as unlocked_by/requested_by above).

CREATE TABLE IF NOT EXISTS user_profiles (
  email TEXT PRIMARY KEY,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  role TEXT,                               -- ceo_founder | agency_owner | freelancer |
                                            -- business_owner | growth_manager | marketing_manager |
                                            -- sales_manager | other
  custom_role TEXT,                        -- set when role = 'other'
  business_type TEXT,                      -- agency | freelancer
  plan TEXT NOT NULL DEFAULT 'free',       -- free | starter | pro | business
  credits INTEGER NOT NULL DEFAULT 20,
  credits_limit INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agency_profiles (
  email TEXT PRIMARY KEY REFERENCES user_profiles(email),
  agency_name TEXT,
  work_email TEXT,
  website TEXT,
  designation TEXT,
  team_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS freelancer_profiles (
  email TEXT PRIMARY KEY REFERENCES user_profiles(email),
  business_name TEXT,
  work_email TEXT,
  website TEXT,
  primary_service TEXT,
  custom_service TEXT,
  active_clients TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  agency_name TEXT,
  website TEXT,
  linkedin TEXT,
  country TEXT,
  city TEXT,
  services JSONB,                          -- array of selected service strings
  other_service TEXT,
  year_established TEXT,
  team_size TEXT,
  projects_closed_per_month TEXT,
  monthly_revenue_range TEXT,
  active_clients TEXT,
  partnership_reason TEXT,
  partnership_approach JSONB,              -- array of selected approach strings
  estimated_client_introductions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- draft | submitted | under_review | approved |
                                             -- rejected | contacted
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_user ON partner_applications(user_email);
