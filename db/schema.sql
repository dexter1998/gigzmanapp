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
  rating REAL,                             -- Google rating (0-5), NULL if no reviews
  review_count INTEGER,                    -- Google userRatingCount, NULL if no reviews
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- leads predates is_competitor/rating/review_count — same reasoning as area_scans.cache_key above.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating REAL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_area_scan ON leads(area_scan_id);
CREATE INDEX IF NOT EXISTS idx_leads_has_website ON leads(has_website);

-- Per (area cell, section, type-batch) grid-search progress, replacing area_scans' role as the
-- fetch-skip cache for /api/leads/find. Nearby Search (New) hard-caps at 20 results per call with
-- no pagination — the only way past that ceiling is to split a capped call's circle into 4 smaller
-- quadrant circles and query those individually. is_exhausted permanently caches a cell once every
-- sub-circle has returned under 20 (nothing left to find); pending_cells persists the still-capped
-- sub-circles so a later visit continues subdividing instead of re-querying what's already known
-- (the earlier bug's actual cost waste, per user report: "22 businesses already fetched" should
-- mean the next run goes for the batch after those 22, not re-fetch the same ones).
CREATE TABLE IF NOT EXISTS area_type_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,          -- "<lat_r>_<lng_r>_<section>_<batchIndex>"
  section TEXT NOT NULL,
  batch_index INTEGER NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  is_exhausted BOOLEAN NOT NULL DEFAULT false,
  pending_cells JSONB NOT NULL DEFAULT '[]',  -- [{lat,lng,radius}, ...] still-capped sub-circles
  result_count INTEGER NOT NULL DEFAULT 0,
  top_level_count INTEGER,          -- raw place count from this batch's very first (unsubdivided)
                                     -- call — the baseline a later staleness probe compares
                                     -- against, never overwritten after being set once
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- bumped on real work AND on a probe that
                                                        -- found nothing changed (not just real work)
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- area_type_scans predates top_level_count/last_verified_at (added for the staleness-probe
-- refresh model) — same reasoning as the other ALTER TABLE migrations in this file.
ALTER TABLE area_type_scans ADD COLUMN IF NOT EXISTS top_level_count INTEGER;
ALTER TABLE area_type_scans ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_area_type_scans_cache_key ON area_type_scans(cache_key);

-- Source is the self-hosted gosom (google-maps-scraper) EC2 instance — richer per-business data
-- than Nearby Search's response gives (a real website URL string instead of just a has_website
-- boolean, hours, popular times), fetched on-demand for a lead the user has already unlocked
-- (not run in bulk during discovery). Only ever one row per lead — re-enriching overwrites it
-- rather than accumulating history, since there's no use for stale enrichment snapshots yet.
CREATE TABLE IF NOT EXISTS lead_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | starting_instance | scraping | done | failed
  website_url TEXT,
  open_hours JSONB,
  popular_times JSONB,
  raw JSONB, -- the full gosom record for this business, for whatever isn't broken out above yet
  error TEXT,
  ssm_command_id TEXT, -- the in-flight SSM RunCommand id while status = 'scraping'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- Example prompts shown under the chat box (chat itself is a Phase 1 placeholder — see
-- app/(app)/home/page.tsx). icp_category is unused for now (every row shows as a general
-- example); once real chat/ICP routing exists, it lets suggestions be ranked by what similar
-- users actually search for instead of a flat random pick.
CREATE TABLE IF NOT EXISTS chat_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  icp_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real chat (Phase 2). Fills the sidebar's already-built, already-empty "Your chats" slot.

-- Marker for future industry-specific discovery branching — today there is exactly one
-- vertical (web_dev_agency), hardcoded as the default, so this is deliberately NOT a
-- signals/services registry yet. That machinery gets added when a second vertical
-- actually exists, not speculatively now.
CREATE TABLE IF NOT EXISTS icps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  vertical_key TEXT NOT NULL DEFAULT 'web_dev_agency',
  offer TEXT, -- what the user sells; seeded from agency_profiles/freelancer_profiles
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat', -- first ~6 words of the first user message
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_email ON chats(user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  intent JSONB, -- the validated ChatIntent (see lib/planner.ts) for assistant turns
                -- that produced one — action/category/areaText/filters/reply etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at);

-- Single-currency execution ledger (plan-confirmed decision — not fixed discover/
-- qualify/contact tiers). Every credit-spending action, map or chat, writes one row
-- here; UNIQUE(user_email, lead_id, reason) makes double-charging the same action on
-- the same lead impossible even under a race. reason is intentionally free text, not a
-- fixed enum, so a new execution type never needs a migration to start logging here.
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id),
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL, -- always negative (credits spent)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_dedup ON credit_ledger(user_email, lead_id, reason);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_email, created_at DESC);
