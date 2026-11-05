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
-- How many Places API calls this request actually paid for. 0 = served entirely from
-- area_type_scans. The throttles in /api/leads/find count only rows above 0: a row is written for
-- every request regardless of cache state, so counting rows made a user panning around a fully
-- cached area (their own neighbourhood, already scanned) burn the budget exactly as fast as one
-- exploring genuinely new ground, and then go silent with nothing left to show them.
ALTER TABLE area_scans ADD COLUMN IF NOT EXISTS billed_places_calls INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_area_scans_cache_key ON area_scans(cache_key);
-- Both throttle lookups filter requested_by over a recent created_at window on every single
-- request; without this they degrade into a scan of the whole table as it grows.
CREATE INDEX IF NOT EXISTS idx_area_scans_requester_recent ON area_scans(requested_by, created_at DESC);

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
-- The map asks for "every stored lead inside these bounds" on every pan, which is what lets an
-- already-scanned area draw instantly instead of waiting for discovery. Without this the query is
-- a full scan of leads on every map movement.
CREATE INDEX IF NOT EXISTS idx_leads_latlng ON leads(lat, lng);

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

-- Enrichment moved from a scraper on EC2 to Google Place Details, which returns these directly.
-- Broken out of raw so the CSV export and the detail panel don't each have to reach into JSON.
ALTER TABLE lead_enrichment ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lead_enrichment ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE lead_enrichment ADD COLUMN IF NOT EXISTS price_level TEXT;
ALTER TABLE lead_enrichment ADD COLUMN IF NOT EXISTS business_status TEXT;

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
  credits INTEGER NOT NULL DEFAULT 500,
  credits_limit INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth (multi-path signup: Google (existing) + email/password + phone/SMS-OTP). email
-- stays the PRIMARY KEY / identity column referenced by every other table in this
-- schema. A phone-only signup gets a deterministic synthetic placeholder instead of a
-- migration to a UUID-keyed users table (see lib/synthetic-email.ts) — keeps every
-- existing FK and every session.user.email-keyed route unchanged.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;        -- NULL for Google/phone-only accounts
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;                -- E.164, e.g. "919999999999"
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_synthetic_email BOOLEAN NOT NULL DEFAULT false;
-- ^ true only for phone-only signups whose "email" is the @phone.gigzmanapp.internal
-- placeholder — lets the UI (AppSidebar, /profile) know never to display it as a real
-- address.

-- Postgres UNIQUE treats multiple NULLs as non-conflicting, so this allows unlimited
-- phone-less rows while still forbidding two accounts from claiming the same number.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);

-- Email verification codes for signup/resend. Stores sha256(code), never plaintext —
-- same posture as password_hash.
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES user_profiles(email),
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',      -- signup | resend
  attempt_count INTEGER NOT NULL DEFAULT 0,     -- hitting MAX_VERIFY_ATTEMPTS invalidates the row early
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email, created_at DESC);

-- Phone OTP codes are never stored here — MSG91's hosted OTP API owns that lifecycle
-- (send + verify endpoints; this app only ever sees a yes/no). This table is
-- rate-limit bookkeeping only, mirroring area_scans' row-timestamp cooldown pattern
-- used by PER_AREA_COOLDOWN_SECONDS in app/api/leads/find/route.ts.
CREATE TABLE IF NOT EXISTS phone_otp_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_sends_phone ON phone_otp_sends(phone, created_at DESC);

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

-- Per-message thumbs up/down, captured for later model/prompt tuning — a single nullable
-- column is enough (one rating per message, not a history of ratings).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS feedback TEXT; -- 'up' | 'down' | NULL

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

-- The `ref` column and its unique index live in a migration rather than here, which is why
-- grantCredits() writes a column this file never declares. Restated so the two stop disagreeing:
-- (reason, ref) is what makes a grant idempotent, and the comped plans below depend on it.
ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_ref ON credit_ledger(reason, ref) WHERE ref IS NOT NULL;

-- Comped plans — a plan an admin granted rather than one somebody paid for.
--
-- Kept as its own table instead of a flag on user_profiles because the interesting question is
-- never "is this comped" on its own, it is "who gave it, when, and why" — a partnership, a support
-- make-good, a pilot. user_profiles carries only what a request needs to read on every call.
CREATE TABLE IF NOT EXISTS plan_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  plan TEXT NOT NULL,              -- the plan set on the account
  credits INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,            -- partnership | support | pilot | other
  note TEXT,                       -- free text, shown back in the admin list
  granted_by TEXT NOT NULL,        -- the admin who did it; this is the audit trail
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_grants_user ON plan_grants(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_grants_recent ON plan_grants(created_at DESC);

-- expires_at as its own ALTER, not a column inside the CREATE TABLE above.
-- CREATE TABLE IF NOT EXISTS does nothing at all when the table already exists — it does not
-- reconcile columns — so adding a field to that block only ever works on a database that has never
-- seen the table. plan_grants already existed in both local and production by the time this column
-- was wanted, and the insert failed with "column expires_at does not exist" while the schema file
-- read as though it were there.
ALTER TABLE plan_grants ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- What the product needs on every request: is this plan paid for, or given? The billing screen
-- must not invite someone to "upgrade" to a plan they were handed, or show a comped account a
-- renewal date that will never come.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan_source TEXT NOT NULL DEFAULT 'purchase';  -- purchase | granted
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan_granted_at TIMESTAMPTZ;
-- When a comped plan runs out. Read on every entitlement check rather than relying on a sweep to
-- have run: a plan that is supposed to have ended must stop the moment it ends, not whenever a cron
-- next fires. A sweep still exists to make the stored row agree with reality, but nothing depends
-- on it having happened.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- External-API failure log — every real failure from a third-party call we depend on (Google
-- Places/Geocoding, Bedrock, SES, Message Central, ...) gets a row here via lib/api-alerts.ts,
-- for a future admin panel to surface as live alerts. resolved_at stays NULL until that panel
-- (or a human) marks it handled; nothing in the app itself reads resolved_at today.
-- Opt-outs from non-transactional email. Every bulk message carries a List-Unsubscribe header
-- pointing at /u/<signed token>, and Gmail/Yahoo bulk-sender rules require that to actually work,
-- so this is checked before any marketing send. Transactional mail (OTP, password reset) is not
-- covered by it -- an unsubscribe must never lock someone out of signing in.
-- stream = 'all' is a blanket opt-out; a named stream opts out of just that one.
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email TEXT NOT NULL,
  stream TEXT NOT NULL DEFAULT 'all',
  source TEXT NOT NULL DEFAULT 'link',   -- link | one-click | manual | complaint
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, stream)
);

-- Every non-transactional email the app sends, one row per message. Two jobs:
--   1. Idempotency. The lifecycle rules are evaluated on a schedule, so "has this person already
--      had the day-5 nudge?" has to be answerable, or a daily tick re-sends the same mail daily.
--   2. Attribution. campaign_id is carried in the message headers and in SES's own event tags, so
--      opens/clicks/bounces reported back by SES land against the same identifier stored here.
-- step_key is what makes a send unique: one row per (recipient, campaign, step).
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  step_key TEXT NOT NULL,          -- e.g. 'reactivation_d5', 'partnership_invite'
  template TEXT NOT NULL,
  stream TEXT NOT NULL,            -- transactional | lifecycle | customer_offer
  lead_id UUID REFERENCES leads(id),
  ses_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sends_once ON email_sends(recipient, campaign_id, step_key);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient, sent_at DESC);

CREATE TABLE IF NOT EXISTS api_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,      -- 'google_places' | 'google_geocoding' | 'bedrock' | 'ses' | 'message_central'
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_alerts_provider ON api_alerts(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_alerts_open ON api_alerts(created_at DESC) WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------------------------
-- Programmatic SEO (public /leads pages). Everything here is additive and inert to the product:
-- dropping the pSEO code leaves these columns and tables harmless. See lib/pseo/.
-- ---------------------------------------------------------------------------------------------

-- Resolved from leads.address by lib/pseo/address.ts — no geocoding calls. NULL means the address
-- didn't match the curated registry, which is the deliberate default: unmatched is excluded, never
-- guessed. location_resolved_at is stamped even on failure so junk rows aren't retried forever.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city_slug TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS area_slug TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_resolved_at TIMESTAMPTZ;

-- leads had no index on category at all; every pSEO aggregate groups by (place, has_website,
-- category), so these are what keep the daily stats pass cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_leads_pseo_city ON leads(city_slug, has_website, category);
CREATE INDEX IF NOT EXISTS idx_leads_pseo_area ON leads(area_slug, has_website, category);
CREATE INDEX IF NOT EXISTS idx_leads_unresolved ON leads(created_at) WHERE location_resolved_at IS NULL;

-- The page registry: the single source of truth for what exists, what is indexed, what goes in the
-- sitemap, and every statistic a page renders. A page is never "created" by deploying code.
CREATE TABLE IF NOT EXISTS pseo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,                    -- 'wd|gurgaon|city' | 'wd|gurgaon|area:dlf-phase-3'
  page_type TEXT NOT NULL,                   -- root|service|city|area|category|area_index|category_index
  service_slug TEXT NOT NULL,
  city_slug TEXT,
  area_slug TEXT,
  category_slug TEXT,
  status TEXT NOT NULL DEFAULT 'withheld',   -- published | noindex | withheld
  qualifying_leads INT NOT NULL DEFAULT 0,
  total_leads INT NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}',
  content_hash TEXT,
  rotation_epoch INT NOT NULL DEFAULT 0,
  gate_pass_streak INT NOT NULL DEFAULT 0,   -- promotion needs two consecutive passes
  stats_computed_at TIMESTAMPTZ,
  last_material_change_at TIMESTAMPTZ,       -- bumped ONLY when content_hash changes, never by a
                                             -- rotation or a cron run; this is what sitemap
                                             -- lastmod and any dateModified report
  first_published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pseo_pages_key ON pseo_pages(page_key);
CREATE INDEX IF NOT EXISTS idx_pseo_pages_status ON pseo_pages(status, qualifying_leads DESC);

-- Daily snapshots. Without these the "what changed since last time" modules are impossible and the
-- refresh cycle has nothing honest to say, so it starts recording from day one.
CREATE TABLE IF NOT EXISTS pseo_stats_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  captured_on DATE NOT NULL,
  qualifying_leads INT NOT NULL,
  total_leads INT NOT NULL,
  stats JSONB NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pseo_history_once ON pseo_stats_history(page_key, captured_on);

-- Places that have enough data to deserve a page but aren't in the registry yet. Detected
-- automatically; approved by a human once, because slug choice is a search decision and the city
-- slot of a Google address is as likely to hold a village or a US state code as a city.
CREATE TABLE IF NOT EXISTS pseo_location_candidates (
  token TEXT PRIMARY KEY,                    -- normalized address token
  suggested_name TEXT NOT NULL,
  suggested_slug TEXT NOT NULL,
  lead_count INT NOT NULL DEFAULT 0,
  qualifying_count INT NOT NULL DEFAULT 0,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  exhausted_cells INT NOT NULL DEFAULT 0,
  state TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  decision TEXT                              -- 'registered' | 'rejected'; NULL = waiting
);
CREATE INDEX IF NOT EXISTS idx_pseo_candidates_pending ON pseo_location_candidates(qualifying_count DESC)
  WHERE decision IS NULL;

-- Public marketing pages (/contact, /partner). Both forms are reachable by logged-out visitors,
-- which is the whole point of putting them on the marketing site — so neither can key off an
-- Auth.js session the way every other table in this file does.

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  topic TEXT,                              -- product support | sales & pricing | partnerships |
                                            -- data accuracy | something else
  message TEXT NOT NULL,
  user_email TEXT,                         -- set only when a logged-in user submits; NULL for
                                            -- anonymous visitors (the normal case here)
  status TEXT NOT NULL DEFAULT 'new',      -- new | read | replied | closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status, created_at DESC);

-- partner_applications predates the public /partner page, where there is no session to attribute
-- a row to — user_email has to stop being required for that page to work at all. The dashboard
-- modal still fills it in, so `source` is what tells the two apart when triaging.
ALTER TABLE partner_applications ALTER COLUMN user_email DROP NOT NULL;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS agency_type TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS avg_ticket_size TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dashboard';

CREATE INDEX IF NOT EXISTS idx_partner_applications_triage
  ON partner_applications(agency_type, status, submitted_at DESC);

-- ── Admin panel collectors (2026-08-31) ──

-- Who was here when — one throttled write a day per user, not a hit counter.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- SES event stream (configuration set -> SNS -> our webhook). Joins to email_sends on
-- ses_message_id. Only events from AFTER the configuration set exists ever arrive — no backfill.
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ses_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- Send | Delivery | Bounce | Complaint | Open | Click
  recipient TEXT,
  link TEXT,                       -- Click events only
  raw JSONB,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_events_msg ON email_events(ses_message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type, created_at DESC);

-- Application errors WITH user attribution — CloudWatch has the text, but "which user hit this
-- and why" needs a queryable row. Written best-effort via lib/app-errors.ts; a failure to log
-- must never break the request that was already failing.
CREATE TABLE IF NOT EXISTS app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  route TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_head TEXT,                 -- first stack line only; full stacks live in CloudWatch
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_errors_time ON app_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_user ON app_errors(user_email, created_at DESC);

-- One summary row per cron execution — "did last night's run happen, and did it do anything".
CREATE TABLE IF NOT EXISTS cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job TEXT NOT NULL,               -- enrich | lifecycle_email | pseo
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok BOOLEAN NOT NULL DEFAULT true,
  summary JSONB,                   -- whatever counts the job wants to report
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON cron_runs(job, finished_at DESC);

-- Category phrases users typed that resolution missed — the alias dictionary's next update comes
-- from this table, not from guessing.
CREATE TABLE IF NOT EXISTS unresolved_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unresolved_phrases ON unresolved_phrases(phrase, created_at DESC);

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

-- The one-off backfill (every pre-existing lead is Indian) lives in
-- db/migrations/2026-08-31-global-locations.sql only. This file stays free of UPDATE statements so
-- that db/apply-schema.sh remains safe to point at production, exactly as its header promises.

-- ---------------------------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------------------------
-- Campaign SES sends (2026-09-02). Deliberately separate from email_sends' lifecycle rules: a
-- campaign is a named, admin-authored sequence of touches sent to an uploaded recipient list, not
-- a behavior-triggered rule. email_sends (above) still carries the actual audit trail -- every
-- campaign send goes through sendBulkEmail() and claims a row there exactly like lifecycle mail
-- does, so "who got what, when" always lives in one place. See app/(admin)/admin-campaigns/.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,                  -- same value used as email_sends.campaign_id
  name TEXT NOT NULL,
  sender TEXT NOT NULL,                 -- e.g. 'Mantis Ai <hello@blogyapp.com>' -- campaign-level,
                                         -- since cold outreach and lifecycle mail deliberately
                                         -- send from different domains (see lib/ses.ts)
  stream TEXT NOT NULL,                 -- matches email_sends.stream / email_unsubscribes.stream
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | done
  created_by TEXT NOT NULL,             -- admin email, from requireAdmin()
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per touch. subject/html/text carry {{placeholders}} filled per-recipient at send time
-- via fillTemplate() (lib/email/send-bulk.ts).
CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  step_key TEXT NOT NULL,               -- matches email_sends.step_key
  step_order INT NOT NULL,              -- 1, 2, 3 ... display + send order
  send_day_offset INT NOT NULL,         -- days after the recipient's batch start
                                         -- (campaign_batch_runs.started_at)
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (campaign_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign ON campaign_steps(campaign_id, step_order);

-- Recipients + their per-row template values (a hook business name, a region + count). Imported
-- once via CSV upload; the send loop reads from here and never re-derives content at send time,
-- so what was previewed is exactly what goes out.
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  email TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT 'A',      -- e.g. 'A' / 'B', for staggered start dates
  values JSONB NOT NULL DEFAULT '{}',   -- {{placeholder}} -> value, one row's worth
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, batch);

-- The one manual trigger per (campaign, batch): admin types the campaign id to confirm, this row
-- gets inserted, and every step's send_day_offset is measured from started_at from then on -- the
-- cron in app/api/cron/campaign-email does the rest without any further manual click per step.
-- started_at doubles as the scheduling mechanism: the start API lets an admin pass a future
-- timestamp instead of "now", and getDueCampaignSends() (lib/campaigns.ts) already only picks up
-- a step once `started_at + offset <= now()` -- a future started_at just makes every step wait,
-- for free, with no separate "scheduled" state or extra cron logic.
CREATE TABLE IF NOT EXISTS campaign_batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  batch TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by TEXT NOT NULL,
  UNIQUE (campaign_id, batch)
);

-- 2026-09-03: finer-grained offsets (minutes, not days -- so a test sequence can space touches a
-- minute apart instead of being forced into whole days), a cosmetic step_type for the flow
-- diagram, and a per-campaign variable registry so the template editor can offer an insert-palette
-- before any CSV has been imported. send_day_offset is left in place rather than renamed/dropped
-- (this table has no real production data yet, but renaming would still fight this file's
-- additive-only convention) -- every code path now reads/writes send_offset_minutes only.
ALTER TABLE campaign_steps ALTER COLUMN send_day_offset DROP NOT NULL;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS send_offset_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'single_lead';
-- single_lead | multi_lead -- purely cosmetic (flow diagram label + which variable set a template
-- author is nudged toward), not enforced against the actual template content.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS variables TEXT[] NOT NULL DEFAULT '{}';
-- Named {{placeholder}}s the template editor offers as an insert-palette. Independent of whatever
-- columns a CSV import actually carries -- a mismatch just means a template ships with an unfilled
-- {{tag}} (fillTemplate leaves unknown tags alone, see lib/email/send-bulk.ts), visible in preview
-- before anything sends.

-- ============================================================================
-- Jobs mode (2026-09-03)
--
-- A second product surface alongside Leads: the same map + chat discovery loop, but the thing
-- discovered is an open role at a local business rather than a business that needs a website.
-- It reuses the leads pipeline's shape deliberately -- same grid/bbox reads, same credit
-- metering, same 10-day-style refresh cadence -- so there is one discovery architecture in this
-- codebase, not two.
-- ============================================================================

-- Which dashboard a user lands on and sees in the nav. Not a plan/permission -- purely which of
-- the two product surfaces this person came here for. Defaults to 'leads' so every existing
-- account keeps exactly the app it has today.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dashboard_mode TEXT NOT NULL DEFAULT 'leads';
-- leads | jobs

-- One row per company we have found a careers surface for. Kept separate from `leads` rather than
-- bolted onto it with nullable columns: a job-bearing company is not necessarily a sellable lead
-- (it may already have a great website -- in fact it almost always does, since having a careers
-- page at all implies one), and the two tables' lifecycles and refresh cadences differ.
CREATE TABLE IF NOT EXISTS job_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,             -- registrable host, lowercased, no "www."
  company_name TEXT,
  -- Nullable link back to the Places row this company was discovered through. Nullable because a
  -- company can also enter via a directory/ATS sweep that never touched Places.
  lead_id UUID REFERENCES leads(id),
  category TEXT,                           -- Places primary_type, when discovered via Places
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  city_slug TEXT,
  country_code TEXT,
  favicon_url TEXT,
  careers_url TEXT,                        -- the careers/jobs page we resolved
  -- How we got the listings for this company. Recorded because the three tiers have very
  -- different trust levels and the UI grades confidence off this (see lib/jobs/scraper.ts).
  extraction_method TEXT,                  -- jsonld_schema | ats_api | heuristic_html
  ats_platform TEXT,                       -- greenhouse | lever | workable | keka | ... | null
  -- Prestige tier. Drives the "golden opportunity" card treatment.
  golden_tier TEXT,                        -- big_tech | yc | unicorn | null
  -- 10-day refresh bookkeeping: scraped_at is when we last actually fetched, next_refresh_at is
  -- what the cron sorts on so a backlog drains oldest-first instead of re-scraping the same rows.
  scraped_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  scrape_status TEXT NOT NULL DEFAULT 'pending',   -- pending | ok | failed | no_careers_page
  scrape_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_companies_latlng ON job_companies(lat, lng);
CREATE INDEX IF NOT EXISTS idx_job_companies_refresh ON job_companies(next_refresh_at)
  WHERE scrape_status <> 'no_careers_page';
CREATE INDEX IF NOT EXISTS idx_job_companies_city ON job_companies(city_slug);
-- /admin/jobs lists the most recently scraped companies. Without this the ORDER BY was a full
-- seq scan plus a top-N sort over every row in the table — measured at 2.6s on its own against
-- 172k rows, and that page fires ten queries at once.
CREATE INDEX IF NOT EXISTS idx_job_companies_scraped_at ON job_companies(scraped_at DESC NULLS LAST);

-- One row per open role. `source_hash` (not the URL) is the identity key: the same role often
-- moves URL between refreshes on heuristic-scraped sites, and a plain URL key would resurrect it
-- as a "new" job on every scrape.
CREATE TABLE IF NOT EXISTS job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES job_companies(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL UNIQUE,        -- sha256(company_id + normalized title + location)
  title TEXT NOT NULL,                     -- raw title exactly as scraped
  apply_url TEXT,
  location TEXT,                           -- raw location string as scraped
  description TEXT,

  -- Normalized fields. Derived at scrape time by lib/jobs/normalize.ts, stored rather than
  -- computed on read so that filtering/sorting is an indexed column scan and so a later change to
  -- the normalizer is visible as a data migration rather than silently reinterpreting old rows.
  job_family TEXT,                         -- engineering | sales | marketing | ops | ...
  seniority TEXT,                          -- intern | entry | mid | senior | staff | lead | manager | director
  seniority_rank SMALLINT,                 -- 0..7, for range filters and ORDER BY
  work_mode TEXT,                          -- remote | hybrid | onsite
  employment_type TEXT,                    -- full_time | part_time | contract | internship
  min_experience_years NUMERIC(4,1),
  max_experience_years NUMERIC(4,1),

  -- Compensation. `ctc_source` distinguishes a figure the employer actually published from a
  -- market estimate we attached, because showing a scraped-from-elsewhere band as if the employer
  -- quoted it would be a lie to the job seeker.
  ctc_min_inr INTEGER,
  ctc_max_inr INTEGER,
  ctc_source TEXT,                         -- posting | ambitionbox_estimate | null
  ctc_confidence TEXT,                     -- high | medium | low

  posted_at TIMESTAMPTZ,
  -- Soft-expiry: a listing that disappears from its source is marked closed, never deleted --
  -- job_applications reference it, and "I applied to this and it's gone now" is information.
  is_open BOOLEAN NOT NULL DEFAULT true,
  closed_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_open ON job_listings(is_open) WHERE is_open = true;
CREATE INDEX IF NOT EXISTS idx_job_listings_seniority ON job_listings(seniority_rank);
CREATE INDEX IF NOT EXISTS idx_job_listings_family ON job_listings(job_family);

-- The standardized application profile -- one row per user, filled once, replayed into every
-- application form. Field set is the intersection of what Greenhouse/Lever/Workable actually ask
-- for, plus the three fields every Indian employer asks for and no Western ATS has a slot for
-- (current CTC, expected CTC, notice period). See lib/jobs/application-form.ts.
CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_email TEXT PRIMARY KEY REFERENCES user_profiles(email),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  country_code TEXT,
  resume_url TEXT,
  resume_filename TEXT,
  resume_text TEXT,                        -- parsed plaintext, used for the opportunity match score
  linkedin_url TEXT,
  portfolio_url TEXT,
  total_experience_years NUMERIC(4,1),
  current_ctc_inr INTEGER,
  expected_ctc_inr INTEGER,
  notice_period_days INTEGER,
  job_family TEXT,                         -- the profile the seeker wants, normalized like listings
  seniority TEXT,
  preferred_work_mode TEXT,                -- remote | hybrid | onsite | any
  cover_letter TEXT,
  -- Gate for the locked opportunity-% on job cards: the score is only shown once there is enough
  -- of a profile to compute one honestly. Set by the API, not the client.
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved/applied tracking. The jobs-mode counterpart of `unlocks` -- but note this one is NOT a
-- paywall: saving or marking-applied is free. Applications are the jobs dashboard's headline
-- number the way unlocked leads are the leads dashboard's.
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES user_profiles(email),
  status TEXT NOT NULL DEFAULT 'saved',    -- saved | applied | interviewing | rejected | offer
  applied_at TIMESTAMPTZ,
  notes TEXT,
  -- Snapshot of the opportunity score at the moment of applying. Kept because both the listing and
  -- the applicant profile drift, and "what did it say when I applied" is the useful number later.
  match_score SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_email, status);

-- Company-level salary bands scraped from public salary aggregators. Company-level, not
-- role-level, because that is the granularity the sources actually have for anything smaller than
-- a household-name employer -- claiming role-level precision we do not have would be worse than
-- showing an honest company-wide band.
CREATE TABLE IF NOT EXISTS company_salary_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug TEXT NOT NULL,              -- normalized company name, the lookup key
  source TEXT NOT NULL,                    -- ambitionbox | glassdoor | ...
  job_family TEXT,                         -- null = company-wide band
  seniority TEXT,
  ctc_min_inr INTEGER,
  ctc_max_inr INTEGER,
  sample_size INTEGER,                     -- self-reported datapoints behind the band
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_slug, source, job_family, seniority)
);

CREATE INDEX IF NOT EXISTS idx_company_salary_slug ON company_salary_bands(company_slug);

-- 2026-09-05: jobs discovery was reading the lead's website from lead_enrichment.website_url,
-- populated only by the separate paid per-lead enrichment flow -- so job discovery worked only
-- for the small fraction of leads someone had already unlocked and enriched, not "any business
-- with a website" as intended. Google Places already returns websiteUri in the very same
-- discovery call that sets has_website (see app/api/leads/find/route.ts, scripts/places-ingest.ts)
-- -- it was being read for a boolean and then thrown away. Stored properly instead of re-fetched.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 2026-09-21: review-platform badges (footer strip + "Upvote us on" carousel) used to live in
-- lib/badges.ts as a build-time constant -- every new listing (StartupFast, Product Hunt, and many
-- more queued via growth-os's directory priority queue) meant a full Docker build + App Runner
-- rollout just to add one badge image. That's the wrong cost for what is genuinely just data.
-- Runtime table instead: growth-os (or any script with DATABASE_URL) can INSERT a new live badge
-- and it appears on the next page load, no deploy. Additive-only, matches this file's own rule.
CREATE TABLE IF NOT EXISTS badges (
  platform TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'script')),
  href TEXT NOT NULL,              -- OUR listing page on that platform, never their generic homepage
  img TEXT,                        -- kind='image': their badge asset URL
  width INTEGER, height INTEGER,   -- kind='image'
  src TEXT,                        -- kind='script': their embed script URL
  container_id TEXT,               -- kind='script': the div id their script fills
  alt TEXT NOT NULL,
  show_in_footer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 2026-10-02: engagement-driven outreach journey (cold -> registered).
--
-- The campaign system before this sent purely on time: campaign_steps.send_offset_minutes from
-- the batch start, with no idea whether anyone opened anything. This adds the per-recipient
-- state the journey needs, so a step can be gated on what the recipient actually did.
--
-- Everything here is additive (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS), matching
-- db/schema.sql's own rule, so it is safe to point at production and safe to re-run.
--
-- Why bounceSubType and not bounceType: measured on this database 2026-10-02, of 84,998 Bounce
-- events only 15,544 are real remote-MTA hard bounces (Permanent/General). 43,134 are
-- Permanent/EmailValidationSuppressed -- SES Auto Validation refusing to send, which never
-- reached a mail server at all. Treating those as hard bounces would throw away half the list
-- for a reason that is not the recipient's fault. diagnosticCode is NOT the discriminator: it is
-- populated on both. bounceSubType is.

-- ---------------------------------------------------------------------------
-- Per-recipient journey state
-- ---------------------------------------------------------------------------

-- unverified: never been through Auto Validation (no send attempted yet)
-- verified:   AV passed AND a Delivery event came back
-- invalid:    AV suppressed it, or it hard-bounced
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- new | active | warm | hot | stalled | suppressed | converted
-- warm = opened, never clicked. hot = clicked. Terminal: suppressed, converted.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'new';
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMPTZ;

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS touch_count INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS delivered_count INT NOT NULL DEFAULT 0;

-- DISTINCT messages opened, not Open events. One message can emit many Open events (the reader
-- reopening it, an image cache miss, Apple Mail Privacy Protection prefetching). A rule written
-- against the raw event count fires after a single email, which is not what "opened 5 times"
-- is meant to mean.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS opened_distinct INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS clicked_distinct INT NOT NULL DEFAULT 0;

-- hard_mta | validation_suppressed | on_suppression_list | content_rejected | mailbox_full | transient
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS bounce_kind TEXT;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS transient_bounces INT NOT NULL DEFAULT 0;

-- The last time this person DID something (open/click/reply/signup) -- not the last time we sent.
-- The sunset rule is written against this, because "we mailed them recently" says nothing about
-- whether they are still worth mailing.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS last_meaningful_response TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ;

-- do_not_send is separate from deleting the row on purpose. An address Auto Validation refused
-- is kept as a record -- we want to know we tried, and re-importing the same CSV must not
-- resurrect it -- but it must never be sent to again: measured 2026-10-02, a send to an address
-- SES has suppressed still produces a Bounce event that counts toward the account bounce rate.
-- "Retain" means retain the data, not the eligibility.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS do_not_send BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS do_not_send_reason TEXT;

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS stalled_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS stalled_reason TEXT;
-- A stalled lead is not dead forever; it becomes eligible again after a cooldown with a new
-- angle. Without this the largest pool (never-opened) is burned permanently after one sequence.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS recycle_eligible_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_due
  ON campaign_recipients(campaign_id, state, next_due_at)
  WHERE do_not_send = false;
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_verification
  ON campaign_recipients(campaign_id, verification_status);

-- ---------------------------------------------------------------------------
-- Step gating: which journey state a step is for
-- ---------------------------------------------------------------------------

-- any | cold | warm | hot -- the branch this step belongs to. 'any' keeps every existing step
-- behaving exactly as it does today, so this migration changes no live campaign's behaviour.
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS requires_state TEXT NOT NULL DEFAULT 'any';
-- The last-chance offer (free credits / final value mail). Sent as the FINAL touch to someone
-- who keeps opening but never clicks -- not as an extra touch beyond the cap.
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS is_last_chance BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Campaign-level policy
-- ---------------------------------------------------------------------------

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_touches INT NOT NULL DEFAULT 5;
-- Target share of each day's capacity for brand-new contacts. Follow-ups are time-sensitive and
-- may overflow this; new contacts are not, but keep a floor so the funnel never stops filling.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS new_ratio NUMERIC NOT NULL DEFAULT 0.30;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS new_floor_ratio NUMERIC NOT NULL DEFAULT 0.20;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_cap INT;
-- Two config sets, because Auto Validation is a config-set (or account) setting, not a per-message
-- one. Unverified addresses send through the AV-enabled set so SES screens them; once verified,
-- sending through a set without AV avoids paying the validation fee again on every follow-up.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS config_set_unverified TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS config_set_verified TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_days INT NOT NULL DEFAULT 60;

-- ---------------------------------------------------------------------------
-- Event reducer bookkeeping
-- ---------------------------------------------------------------------------

-- email_events is append-only and shared with everything else that sends mail, and SNS delivers
-- at least once, so the reducer must be able to resume without reprocessing and without double
-- counting. It walks forward by id and remembers where it stopped.
CREATE TABLE IF NOT EXISTS outreach_event_cursor (
  name TEXT PRIMARY KEY,
  last_event_id UUID,
  last_created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (send, event_type) actually applied to recipient state. This is what makes the
-- reducer idempotent against SNS redelivery: counters are incremented only when a row is newly
-- inserted here, so replaying the same event is a no-op rather than a double count.
CREATE TABLE IF NOT EXISTS outreach_applied_events (
  ses_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ses_message_id, event_type)
);

-- ---------------------------------------------------------------------------
-- Gate / run audit — what the dispatcher decided and why, per tick
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outreach_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT REFERENCES campaigns(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  blocked_by TEXT,                 -- which gate stopped it, NULL if it ran
  capacity INT,
  planned_new INT,
  planned_followup INT,
  sent INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  bounce_rate NUMERIC,             -- account Reputation.BounceRate at decision time
  complaint_rate NUMERIC,
  quota_headroom INT,
  notes JSONB
);
CREATE INDEX IF NOT EXISTS idx_outreach_runs_time ON outreach_runs(started_at DESC);

-- How far behind the follow-up schedule each tick found itself. Recorded even when a gate blocks
-- the tick, because that is the case worth catching: the complaint gate blocked 48 consecutive
-- ticks from 2026-10-06 evening, each writing sent=0, while 19,008 recipients aged 17-19 hours
-- past their touch-4 window. A blocked tick and an idle tick were indistinguishable.
ALTER TABLE outreach_runs ADD COLUMN IF NOT EXISTS overdue_count INT;
ALTER TABLE outreach_runs ADD COLUMN IF NOT EXISTS oldest_due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_due
  ON campaign_recipients (campaign_id, next_due_at)
  WHERE do_not_send = false AND next_due_at IS NOT NULL;

-- Per-send step record, so the journey view can show which touch a message was without
-- re-deriving it from step_key string matching.
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS touch_no INT;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS config_set TEXT;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS gap_minutes INT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_window_start_hour INT NOT NULL DEFAULT 9;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_window_end_hour INT NOT NULL DEFAULT 18;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_target INT;


-- 2026-10-03: Stickly.live rewards widget. Users complete link tasks in the
-- widget and earn Mantis credits; the grant arrives as a signed webhook and
-- lands in credit_ledger like any other grant (reason 'stickly_reward',
-- ref 'stickly:<claim id>', deduped by the partial unique index on (reason, ref)).
--
-- This table exists so Stickly never learns a Mantis email. Email is our only
-- stable user id, so passing it through would export the customer list for no
-- gain -- and phone-only signups carry a synthetic @phone.gigzmanapp.internal
-- address that would leak the convention too. The widget sees an opaque id and
-- the webhook maps it back. Deleting a row unlinks the user and nothing else.
-- Which popups a person has already seen, per ACCOUNT rather than per browser.
--
-- This used to live only in localStorage, which quietly broke the one promise "once" makes: a new
-- browser or profile had an empty store, so a one-time popup -- including the 500-credit grant --
-- came back as if it had never been shown. The same keying failed the other way too: the flag was
-- keyed by popup id alone, so a second person signing in on a shared browser was blocked from a
-- popup they had never seen.
--
-- `seen_at` is kept (not just a boolean) because the "daily" frequency needs the date, and because
-- "was any non-greeting popup shown today" is what suppresses the welcome popups.
CREATE TABLE IF NOT EXISTS popup_seen (
  user_email TEXT NOT NULL,
  popup_id   TEXT NOT NULL,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_email, popup_id)
);
CREATE INDEX IF NOT EXISTS idx_popup_seen_user ON popup_seen(user_email, seen_at DESC);

CREATE TABLE IF NOT EXISTS stickly_users (
  stickly_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------------------------
-- Scraping registry (2026-10-06)
--
-- One place where every scraping run registers what it found, so the same domain is never paid
-- for twice. The need was measured: the Stickly SaaS campaign crawled 452,463 domains and the
-- Mantis agency campaign 164,437 with no shared memory between them, and 21,150 domains ended up
-- crawled by both. Worse, a domain found dead in one campaign was crawled again by the next --
-- about 8 page fetches plus a timeout wait, every time.
--
-- Written to the same database the admin already reads so the Scraping page needs no new
-- connection, and the scraper box can write here directly.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scrape_domains (
  domain        text PRIMARY KEY,
  first_seen    timestamptz NOT NULL DEFAULT now(),
  last_seen     timestamptz NOT NULL DEFAULT now(),
  first_source  text,                 -- gosom / directory / apollo / producthunt / yc / vc / ig
  campaigns     text,                 -- comma list: a domain can belong to several campaigns
  company       text,
  category      text,
  country       text,
  city          text,
  website       text,
  status        text,                 -- unknown | alive | unreachable | no_mx | parked
  mx_ok         boolean,
  enriched_at   timestamptz,
  pages_fetched int,
  email_count   int NOT NULL DEFAULT 0,
  -- set once a crawl proves the domain is not worth another visit, with the reason kept so the
  -- decision stays auditable rather than becoming folklore
  do_not_crawl  boolean NOT NULL DEFAULT false,
  dnc_reason    text
);
CREATE INDEX IF NOT EXISTS idx_scrape_domains_status   ON scrape_domains(status);
CREATE INDEX IF NOT EXISTS idx_scrape_domains_enriched ON scrape_domains(enriched_at);
CREATE INDEX IF NOT EXISTS idx_scrape_domains_dnc      ON scrape_domains(do_not_crawl);
CREATE INDEX IF NOT EXISTS idx_scrape_domains_seen     ON scrape_domains(first_seen);

CREATE TABLE IF NOT EXISTS scrape_emails (
  email       text PRIMARY KEY,
  domain      text NOT NULL,
  bucket      text,                   -- founder_named / person_own_domain / generic_t1 ...
  tier        int,                    -- 1/2/3 for the shared-inbox priority tiers
  campaigns   text,
  source      text,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  mx_ok       boolean,
  leader      text,
  leader_role text,
  -- send state lives here so a second campaign cannot mail someone the first one already bounced
  sent_at     timestamptz,
  bounced     boolean NOT NULL DEFAULT false,
  suppressed  boolean NOT NULL DEFAULT false,
  supp_reason text
);
CREATE INDEX IF NOT EXISTS idx_scrape_emails_domain ON scrape_emails(domain);
CREATE INDEX IF NOT EXISTS idx_scrape_emails_bucket ON scrape_emails(bucket);
CREATE INDEX IF NOT EXISTS idx_scrape_emails_seen   ON scrape_emails(first_seen);

-- Every run of every scraper, so throughput and yield are answerable by query afterwards instead
-- of being reconstructed from log tails.
CREATE TABLE IF NOT EXISTS scrape_runs (
  id           bigserial PRIMARY KEY,
  tool         text NOT NULL,         -- gosom / dir-harvest / enrich2 / apollo-extract / ig-profiles
  campaign     text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  input_rows   int,
  new_domains  int,
  new_emails   int,
  skipped      int,                   -- how much the registry saved: domains it told us to skip
  workers      int,
  note         text
);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_started ON scrape_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_tool    ON scrape_runs(tool);

-- gosom has no query-level resume: restart a keyword and it re-runs all its places from the top.
-- Nine keywords were restarted on 2026-10-06 and each re-crawled ground it had already covered.
CREATE TABLE IF NOT EXISTS scrape_queries (
  tool      text NOT NULL,
  keyword   text NOT NULL,
  place     text NOT NULL,
  done_at   timestamptz NOT NULL DEFAULT now(),
  rows_got  int,
  domains   int,
  PRIMARY KEY (tool, keyword, place)
);

-- V2 demo (lib/v2.ts). One jsonb bag rather than a column per signal or a table of its own: the
-- V2 surface is a demonstration on a single allowlisted account, so its signals have no shared
-- shape yet and nothing else joins against them. When a signal earns its place in V2 proper, it
-- graduates to real columns — this bag is deliberately not an API.
-- Renamed from v2_signals before it reached production (it never did): it holds the SELLER's
-- profile — what they sell, to whom, where — written by Mantis Scout. Lead signals live per result.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS v2_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

-- V2 chat (docs/v2-agents.md). Per-chat slot state, written by code only — no LLM in this layer.
-- v1 re-derived every slot from the previous assistant message's intent, which is how a chip
-- like "Try a nearby area" ended up re-running the same area: nothing held a radius to widen.
CREATE TABLE IF NOT EXISTS v2_chat_state (
  chat_id    UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per V2 turn: what kind of request it was, which steps ran and how long they took, and
-- whether no capability fitted (gap). The gap rows are what the next capability gets built from.
CREATE TABLE IF NOT EXISTS v2_turn_log (
  id          BIGSERIAL PRIMARY KEY,
  chat_id     UUID NOT NULL,
  user_email  TEXT NOT NULL,
  turn_type   TEXT NOT NULL,
  audience    TEXT,
  via_action  BOOLEAN NOT NULL DEFAULT false,
  gap         BOOLEAN NOT NULL DEFAULT false,
  gap_note    TEXT,
  steps       JSONB NOT NULL DEFAULT '[]'::jsonb,
  took_ms     INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_turn_log_gap ON v2_turn_log(created_at DESC) WHERE gap;

-- V2 runs (docs/v2-plan.md §3, docs/v2-agents.md §4). A run is a plan the user approved, executed
-- one step at a time by client-driven ticks (App Runner gives CPU only inside a request). The
-- lock is a ROW (locked_until), not pg_advisory_lock — the pool makes advisory locks unsafe.
CREATE TABLE IF NOT EXISTS v2_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL,
  kind          TEXT NOT NULL,                 -- search | contacts
  plan          JSONB NOT NULL,                -- what the Planner produced, compiled
  status        TEXT NOT NULL DEFAULT 'planned', -- planned | running | done | failed | cancelled
  target        INT NOT NULL DEFAULT 20,
  delivered     INT NOT NULL DEFAULT 0,
  est_credits   INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ NOT NULL DEFAULT 'epoch',
  summary_msg   UUID,                          -- the chat message written when the run finished
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_v2_runs_chat ON v2_runs(chat_id, created_at DESC);

CREATE TABLE IF NOT EXISTS v2_run_steps (
  id          BIGSERIAL PRIMARY KEY,
  run_id      UUID NOT NULL REFERENCES v2_runs(id) ON DELETE CASCADE,
  seq         INT NOT NULL,
  playbook_id TEXT,
  op          TEXT NOT NULL,
  label       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'planned', -- planned | running | done | failed | skipped
  input       JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor      INT NOT NULL DEFAULT 0,          -- progress inside a multi-tick step
  raw_count   INT,
  kept_count  INT,
  detail      TEXT,
  error       TEXT,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  UNIQUE (run_id, seq)
);

-- Own rows rather than leads: future sources (registry, directories) have no place_id. A Places
-- lead links lead_id instead of being copied.
CREATE TABLE IF NOT EXISTS v2_results (
  id          BIGSERIAL PRIMARY KEY,
  run_id      UUID NOT NULL REFERENCES v2_runs(id) ON DELETE CASCADE,
  lead_id     UUID,
  name        TEXT NOT NULL,
  category    TEXT,
  area        TEXT,
  website     TEXT,
  domain      TEXT,
  phone       TEXT,
  rating      REAL,
  review_count INT,
  emails      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{email, source: site|registry, tier}]
  signals     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {signal_id: true|false|value}
  site_checked BOOLEAN NOT NULL DEFAULT false,
  contacts_checked BOOLEAN NOT NULL DEFAULT false,
  deep_queued BOOLEAN NOT NULL DEFAULT false,
  score       REAL,
  rank        INT,
  UNIQUE (run_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_v2_results_run ON v2_results(run_id, rank);

-- What the business's homepage says about its site (https, mobile viewport, copyright year,
-- analytics, ad pixels, booking, whatsapp, parked, cms, phones, socials, title, final_url,
-- checked_at, source box|app). Written by the AWS box after a full crawl and by Mantis V2's
-- Qualifier after a fast read; one jsonb because it is read whole, never queried by key yet.
ALTER TABLE scrape_domains ADD COLUMN IF NOT EXISTS site_signals JSONB;

-- Company socials read off the business's own site (LinkedIn first) — default pipeline step 4.
ALTER TABLE v2_results ADD COLUMN IF NOT EXISTS socials JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Every plan Mantis builds is a pipeline; identical shapes share a row and pile up their outcomes,
-- which is what "which pipeline works for whom" is learned from. The id is a hash of the shape.
CREATE TABLE IF NOT EXISTS v2_pipelines (
  id             TEXT PRIMARY KEY,
  shape          JSONB NOT NULL,          -- {ops, playbookIds, mustHave, placeTypes, keywordMode}
  label          TEXT NOT NULL,
  runs           INT NOT NULL DEFAULT 0,
  target_sum     INT NOT NULL DEFAULT 0,
  delivered_sum  INT NOT NULL DEFAULT 0,
  site_sum       INT NOT NULL DEFAULT 0,  -- delivered rows with a readable website
  email_sum      INT NOT NULL DEFAULT 0,
  linkedin_sum   INT NOT NULL DEFAULT 0,
  unlock_sum     INT NOT NULL DEFAULT 0,  -- outcomes: rows the user paid to unlock
  first_run_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS pipeline_id TEXT;

-- What the user did with a result. Kept from day one so learning has something to read later.
CREATE TABLE IF NOT EXISTS v2_outcomes (
  id          BIGSERIAL PRIMARY KEY,
  user_email  TEXT NOT NULL,
  run_id      UUID,
  result_id   BIGINT,
  lead_id     UUID,
  event       TEXT NOT NULL,             -- unlock | add_to_leads | open_site | open_linkedin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_outcomes_run ON v2_outcomes(run_id);

-- Which component produced each part of a result: discovered_by (places_live | places_saved |
-- name_match | registry), url_by (places_listing | place_details | registry), email_by (site |
-- registry), linkedin_by (site), strategy (primary | wide | adjacent | names | registry). The test
-- suite sums this to show which scraper / API / enricher the final leads actually depend on.
ALTER TABLE v2_results ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

-- The person behind the business, as written on its own site (enricher: founder/leader name + role,
-- the best address and its tier). Only what was found written; nothing is guessed.
ALTER TABLE v2_results ADD COLUMN IF NOT EXISTS contact JSONB;

-- Extra lead-table columns (docs/lead-contact-contract.md): {column_key: short value} for the run
-- plan's extraColumns, from measured facts + one cheap read of the page text the run already
-- fetched; `_at` marks a row as filled. Values are never guessed — empty when unknown.
ALTER TABLE v2_results ADD COLUMN IF NOT EXISTS extras JSONB;

-- V2 source registry, learned (docs/v2-agents.md). Every call a source makes for a capability is a
-- row: did it work, for which kind of business, at what cost. Sources are tried in the order these
-- rows rank them, per capability and business type.
CREATE TABLE IF NOT EXISTS v2_source_attempts (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,           -- places_listing | place_details | exa | site | registry | ...
  capability  TEXT NOT NULL,           -- website | person | person_linkedin | email | discover
  place_type  TEXT,
  city        TEXT,
  entity_key  TEXT,                    -- place:<place_id> | domain:<domain>
  ok          BOOLEAN NOT NULL,
  value       TEXT,
  cost_usd    NUMERIC(10,5) NOT NULL DEFAULT 0,
  ms          INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_source_attempts_rank ON v2_source_attempts(capability, place_type, source);

-- Facts about a business, shared by every pipeline: found once by any source, reused by all —
-- a second playbook that meets the same company reads this instead of repeating the lookups.
CREATE TABLE IF NOT EXISTS v2_facts (
  entity_key  TEXT NOT NULL,
  field       TEXT NOT NULL,           -- website | company_linkedin | person_name | person_role | person_linkedin | email
  value       TEXT NOT NULL,
  source      TEXT NOT NULL,
  confidence  REAL NOT NULL DEFAULT 0.5,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_key, field, source)
);

-- Paid search answers are kept: the same query from any pipeline (or a re-run test) reads this
-- instead of paying again. 30-day freshness is enforced by the reader.
CREATE TABLE IF NOT EXISTS v2_search_cache (
  provider   TEXT NOT NULL,
  query      TEXT NOT NULL,
  results    JSONB NOT NULL,
  cost_usd   NUMERIC(10,5) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, query)
);

-- Measured quality of a component (source / API / fetch method / extractor) from a benchmark run:
-- precision = share of its answers that were right; recall = share of cases it answered at all.
-- The confidence module combines these with live attempt counts (v2_source_attempts).
CREATE TABLE IF NOT EXISTS v2_benchmarks (
  component   TEXT NOT NULL,
  capability  TEXT NOT NULL,
  precision   REAL,
  recall      REAL,
  cost_usd    NUMERIC(10,5),             -- per attempt
  n           INT NOT NULL,
  notes       TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (component, capability)
);

-- ---------------------------------------------------------------------------------------------
-- V2 outreach (docs/v2-campaigns.md). User campaigns — separate from the admin `campaigns` above,
-- which are admin-authored broadcasts. Nothing here sends until the user taps Approve AND a sender
-- (their mailbox / our pre-warmed inbox / their WhatsApp) is connected.
-- ---------------------------------------------------------------------------------------------

-- A connected channel account. Secrets are AES-GCM encrypted (lib/v2/outreach/secret.ts).
CREATE TABLE IF NOT EXISTS v2_senders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    TEXT NOT NULL,
  channel       TEXT NOT NULL,           -- email | whatsapp | voice | crm
  provider      TEXT NOT NULL,           -- google | microsoft | imap | mantis_pool | meta | hubspot | ...
  address       TEXT NOT NULL,           -- the mailbox, the WhatsApp number, the CRM account
  display_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'connected',  -- connected | needs_attention | paused | disconnected
  status_note   TEXT,
  daily_limit   INT NOT NULL DEFAULT 40,
  config        JSONB NOT NULL DEFAULT '{}',        -- non-secret settings (hosts, ports, ids)
  secret        TEXT,                               -- encrypted token / password
  last_checked  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_email, channel, address)
);

-- Pre-warmed inboxes / numbers Mantis offers (stocked by us; empty until we add them).
CREATE TABLE IF NOT EXISTS v2_sender_pool (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       TEXT NOT NULL,           -- email | whatsapp
  domain        TEXT,                    -- email: the warmed domain
  address       TEXT NOT NULL,
  health        INT,                     -- 0-100
  warming_days  INT,
  domain_age_days INT,
  warmup_sent   INT, warmup_replies INT,
  price_inr     INT,
  claimed_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reusable mail / WhatsApp messages and saved campaign graphs.
CREATE TABLE IF NOT EXISTS v2_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    TEXT NOT NULL,
  kind          TEXT NOT NULL,           -- email | whatsapp | campaign
  name          TEXT NOT NULL,
  subject       TEXT,                    -- email
  body          TEXT NOT NULL DEFAULT '',-- email: text or html; whatsapp: text
  is_html       BOOLEAN NOT NULL DEFAULT false,
  graph         JSONB,                   -- campaign: {nodes, edges}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_templates_user ON v2_templates(user_email, kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS v2_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    TEXT NOT NULL,
  name          TEXT NOT NULL,
  list_chat_id  UUID,                    -- the Leads list (= the chat it came from)
  kind          TEXT NOT NULL DEFAULT 'sequence',   -- sequence | quick_email | quick_whatsapp | quick_call
  status        TEXT NOT NULL DEFAULT 'draft',      -- draft | testing | approved | scheduled | running | paused | done
  graph         JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  schedule      JSONB NOT NULL DEFAULT '{}',        -- {startAt, window:{from,to}, days:[1..7], tz, dailyCap}
  sender_ids    UUID[] NOT NULL DEFAULT '{}',
  test_sent_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  origin        TEXT NOT NULL DEFAULT 'manual',     -- manual | chat
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_campaigns_user ON v2_campaigns(user_email, updated_at DESC);

-- The planner's conversation for a campaign (the builder's left panel).
CREATE TABLE IF NOT EXISTS v2_campaign_messages (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   UUID NOT NULL REFERENCES v2_campaigns(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,           -- user | assistant
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (recipient, touch) once approved: the queue the sender worker drains.
CREATE TABLE IF NOT EXISTS v2_sends (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   UUID NOT NULL REFERENCES v2_campaigns(id) ON DELETE CASCADE,
  result_id     BIGINT,                  -- v2_results row (the lead)
  node_id       TEXT NOT NULL,
  channel       TEXT NOT NULL,
  to_address    TEXT,
  due_at        TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'queued',     -- queued | scheduled | sent | skipped | failed | cancelled
  status_note   TEXT,
  sent_at       TIMESTAMPTZ, opened_at TIMESTAMPTZ, replied_at TIMESTAMPTZ, bounced_at TIMESTAMPTZ,
  is_test       BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (campaign_id, result_id, node_id, is_test)
);
CREATE INDEX IF NOT EXISTS idx_v2_sends_due ON v2_sends(status, due_at);
-- Call loop (2026-10-31): an AI call that isn't answered, or ends "call me later", is dialled again —
-- same row, requeued — until the lead says yes/no or the touch's retry cap is reached.
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS call_attempt INT NOT NULL DEFAULT 0;   -- dials made after the first
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS outcome TEXT;                          -- booked | interested | not_interested | wrong_person | callback | no_answer | busy | no_conversation
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ;

-- Replies and responses (Inbox).
CREATE TABLE IF NOT EXISTS v2_inbox (
  id            BIGSERIAL PRIMARY KEY,
  user_email    TEXT NOT NULL,
  campaign_id   UUID,
  result_id     BIGINT,
  channel       TEXT NOT NULL,
  from_address  TEXT NOT NULL,
  from_name     TEXT,
  subject       TEXT,
  body          TEXT NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at       TIMESTAMPTZ,
  sentiment     TEXT                    -- interested | not_now | not_interested | unsubscribe | other
);
CREATE INDEX IF NOT EXISTS idx_v2_inbox_user ON v2_inbox(user_email, received_at DESC);

-- Where test sends go (asked once in the test popup, kept for next time).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS v2_test_contacts JSONB;

-- 2026-10-21: the send worker and inbox sync (docs/v2-campaigns.md).
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS external_id TEXT;      -- provider message id (Gmail id / Message-ID / wamid)
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS thread_id TEXT;        -- Gmail thread, so follow-ups stay in one thread
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS redirected_to TEXT;    -- set when V2_OUTREACH_REDIRECT sent it elsewhere
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS external_id TEXT;
-- A reply to the user's own "Send test" (2026-10-22): shown in Inbox, marked Test, and never applied
-- to the real lead's sequence or outcome stats.
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'reply';   -- reply | auto_reply | bounce
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS ai_summary JSONB;          -- {summary, next}: Inbox's "AI summary" card, made once per reply
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS ai_summary_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_inbox_external ON v2_inbox(user_email, external_id);
ALTER TABLE v2_senders ADD COLUMN IF NOT EXISTS last_synced TIMESTAMPTZ;

-- 2026-10-21: templates ↔ campaign sync, call scripts, media.
ALTER TABLE v2_templates ADD COLUMN IF NOT EXISTS campaign_id UUID;   -- set when the planner wrote it for a campaign
ALTER TABLE v2_templates ADD COLUMN IF NOT EXISTS touch INT;          -- …and which touch
ALTER TABLE v2_templates ADD COLUMN IF NOT EXISTS media_url TEXT;     -- WhatsApp image header / email hero image
-- kind now also 'call' (a call talk track).

-- Uploaded images for templates. Served publicly by unguessable id so mail clients and Meta can
-- fetch them (hosted images, not CID attachments — same rule as the rest of Mantis's mail).
CREATE TABLE IF NOT EXISTS v2_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  name        TEXT NOT NULL,
  mime        TEXT NOT NULL,
  bytes       BYTEA NOT NULL,
  size        INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Signal graph (2026-10-22)
-- What was OBSERVED about a company (a careers page's roles, Instagram followers, a funding round),
-- with where it was read and until when it is trusted. Every run reads here first and fetches
-- only what is missing or expired, so a company read for one user is free for the next.
CREATE TABLE IF NOT EXISTS company_facts (
  entity       TEXT NOT NULL,            -- domain (preferred) or place:<place_id>
  key          TEXT NOT NULL,            -- hiring | social | funding | offerings | forms | security | ...
  value        JSONB NOT NULL,
  source       TEXT NOT NULL,            -- careers_page | greenhouse | instagram | news | site | places | registry:<name>
  evidence_url TEXT,
  observed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity, key)
);
CREATE INDEX IF NOT EXISTS idx_company_facts_key ON company_facts(key, observed_at DESC);

-- What was DERIVED from those facts by a rule (lib/v2/signals/rules.ts): "hiring 3 sales roles"
-- → needs_crm, needs_lead_data. derived_from names the fact keys, so every claim can show why.
CREATE TABLE IF NOT EXISTS company_signals (
  entity       TEXT NOT NULL,
  signal       TEXT NOT NULL,
  confidence   REAL NOT NULL,
  rule_id      TEXT NOT NULL,
  derived_from TEXT[] NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, signal)
);
CREATE INDEX IF NOT EXISTS idx_company_signals_signal ON company_signals(signal, confidence DESC);

-- What happened after outreach to a lead that carried a signal: the learning loop re-weights
-- rules from this (a rule whose leads never reply loses weight).
CREATE TABLE IF NOT EXISTS signal_outcomes (
  id           BIGSERIAL PRIMARY KEY,
  entity       TEXT NOT NULL,
  signal       TEXT NOT NULL,
  rule_id      TEXT,
  outcome      TEXT NOT NULL,            -- sent | opened | replied | interested | meeting | bounced | unsubscribed
  campaign_id  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signal_outcomes_rule ON signal_outcomes(rule_id, outcome);

-- Public registers (RERA, FSSAI, MCA, GeM …) are called at most once a day per query and kept:
-- every later read in the day — any user, any run — comes from here.
CREATE TABLE IF NOT EXISTS registry_cache (
  source      TEXT NOT NULL,
  query       TEXT NOT NULL,
  day         DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  rows        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source, query, day)
);

-- Who a campaign speaks for (2026-10-22): company, offer and caller name, confirmed in the Campaign
-- Planner before Approve. The AI voice agent and the planner's copy use it; null = not confirmed.
ALTER TABLE v2_campaigns ADD COLUMN IF NOT EXISTS sender_profile JSONB;

-- 2026-10-23: the standalone AI test call (Integrations → AI voice calls). A self-test has no
-- campaign, so it has no v2_sends row; settled from the voice agent's analytics like any call.
CREATE TABLE IF NOT EXISTS v2_voice_tests (
  id                BIGSERIAL PRIMARY KEY,
  user_email        TEXT NOT NULL,
  phone             TEXT NOT NULL,
  name              TEXT,
  attempt_id        TEXT,                              -- the voice platform's call id
  status            TEXT NOT NULL DEFAULT 'calling',   -- calling | done | failed
  status_note       TEXT,
  connected_seconds INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_v2_voice_tests_user ON v2_voice_tests(user_email, created_at DESC);

-- 2026-10-23: Business profiles — a user can sell for more than one business (their own agency,
-- a client, a side business). Each website read (Mantis Scout) or Settings → Business profiles
-- entry is one row; a chat picks one (v2_chat_state.state.businessProfileId) and the Planner,
-- "Sending as" and pitch prefill read that one. user_profiles.v2_profile stays as a MIRROR of the
-- default profile, so code that reads it without a chat keeps working (lib/v2/business-profiles.ts).
CREATE TABLE IF NOT EXISTS v2_business_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email       TEXT NOT NULL,
  name             TEXT NOT NULL,
  website          TEXT,
  summary          TEXT NOT NULL DEFAULT '',
  services         JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_service  TEXT,
  target_trades    JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_areas     JSONB NOT NULL DEFAULT '[]'::jsonb,
  playbook_ids     JSONB NOT NULL DEFAULT '[]'::jsonb,
  source           TEXT NOT NULL DEFAULT 'chat',     -- website | chat | manual
  is_default       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_v2_business_profiles_user ON v2_business_profiles(user_email, last_used_at DESC NULLS LAST);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_business_profiles_default ON v2_business_profiles(user_email) WHERE is_default;

-- Backfill (idempotent): each user's single v2_profile becomes their first, default profile.
INSERT INTO v2_business_profiles (user_email, name, website, summary, services, primary_service, target_trades,
                                  target_areas, playbook_ids, source, is_default, created_at, updated_at)
SELECT up.email,
       coalesce(nullif(trim(up.v2_profile->>'company'), ''),
                nullif(regexp_replace(coalesce(up.v2_profile->>'website', ''), '^(https?://)?(www\.)?([^/]+).*$', '\3'), ''),
                'My business'),
       nullif(up.v2_profile->>'website', ''),
       coalesce(up.v2_profile->>'summary', ''),
       CASE WHEN jsonb_typeof(up.v2_profile->'services') = 'array' THEN up.v2_profile->'services' ELSE '[]'::jsonb END,
       nullif(up.v2_profile->>'primaryService', ''),
       CASE WHEN jsonb_typeof(up.v2_profile->'targetTrades') = 'array' THEN up.v2_profile->'targetTrades' ELSE '[]'::jsonb END,
       CASE WHEN jsonb_typeof(up.v2_profile->'targetAreas') = 'array' THEN up.v2_profile->'targetAreas' ELSE '[]'::jsonb END,
       CASE WHEN jsonb_typeof(up.v2_profile->'playbookIds') = 'array' THEN up.v2_profile->'playbookIds' ELSE '[]'::jsonb END,
       CASE WHEN up.v2_profile->>'source' = 'website' THEN 'website' ELSE 'chat' END,
       true,
       CASE WHEN up.v2_profile->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' THEN (up.v2_profile->>'updatedAt')::timestamptz ELSE now() END,
       CASE WHEN up.v2_profile->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' THEN (up.v2_profile->>'updatedAt')::timestamptz ELSE now() END
FROM user_profiles up
WHERE jsonb_typeof(up.v2_profile->'summary') = 'string'
  AND NOT EXISTS (SELECT 1 FROM v2_business_profiles b WHERE b.user_email = up.email);

-- Sidebar pin (ChatGPT-style "Pinned" section above Recent). NULL = not pinned; newest pin first.
-- Rename reuses chats.title.
ALTER TABLE chats ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Account deletion is a request, not a button: the user files it from /profile, the account keeps
-- working while it is pending, and staff approve or reject it in /admin/deletions. Approval runs
-- lib/account-deletion.ts (one transaction). The row itself is kept after approval as the record
-- that the deletion happened, and auth.ts reads it to kill any session issued before decided_at.
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    TEXT NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at    TIMESTAMPTZ,
  decided_by    TEXT,
  note          TEXT
);
-- One open request per account; history (cancelled/rejected/approved) is unlimited.
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_deletion_pending
  ON account_deletion_requests(user_email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_account_deletion_email_status
  ON account_deletion_requests(user_email, status, decided_at DESC);

-- 2026-10-23: sidebar notification counts (lib/nav-badges.ts). The server is the source of truth for
-- "what is new": one row per (user, section) holding when the user last looked at it. Sections are
-- 'inbox' | 'leads' | 'campaigns' | 'chat' (the chat baseline) and 'chat:<chatId>' (one chat seen).
-- A missing row is created at the first poll with seen_at = now(), so a first visit shows no flood
-- of old items.
CREATE TABLE IF NOT EXISTS nav_seen (
  user_email TEXT NOT NULL,
  section    TEXT NOT NULL,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_email, section)
);
-- received_at is the MESSAGE's own date (mail Date header / WhatsApp timestamp), so a reply synced
-- late carries an old time and would slip under seen_at. created_at is when Mantis stored it — that
-- is what "new since you last looked" means. Existing rows take the migration time (fast default).
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_v2_inbox_user_created ON v2_inbox(user_email, created_at DESC);
-- Leads + chat counters: a user's runs that finished after a time.
CREATE INDEX IF NOT EXISTS idx_v2_runs_user_finished ON v2_runs(user_email, finished_at DESC) WHERE finished_at IS NOT NULL;
-- Campaigns counter: campaigns that reached 'done', and AI test calls that settled.
CREATE INDEX IF NOT EXISTS idx_v2_voice_tests_user_finished ON v2_voice_tests(user_email, finished_at DESC) WHERE finished_at IS NOT NULL;

-- 2026-10-23: one place to count leads a user found — V1 map unlocks AND V2 chat runs (delivered,
-- ranked results). Admin and /live counted only `unlocks`, so every V2 user showed 0 leads.
CREATE OR REPLACE VIEW lead_finds AS
  SELECT unlocked_by AS user_email, unlocked_at AS found_at, 'v1'::text AS via FROM unlocks
  UNION ALL
  SELECT u.user_email, COALESCE(u.finished_at, u.created_at) AS found_at, 'v2'::text AS via
  FROM v2_results r JOIN v2_runs u ON u.id = r.run_id
  WHERE r.rank IS NOT NULL AND u.status IN ('done', 'stopped');

-- 2026-10-23: who a business sells to. Mantis finds businesses, not consumers: a consumer-facing
-- business (clinic, school, salon) gets a "B2C isn't supported" note and vendor/partner searches
-- instead of customer leads. partner_trades = businesses it could collaborate with.
ALTER TABLE v2_business_profiles ADD COLUMN IF NOT EXISTS sells_to TEXT;
ALTER TABLE v2_business_profiles ADD COLUMN IF NOT EXISTS partner_trades JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE v2_business_profiles ADD COLUMN IF NOT EXISTS business_model TEXT;

-- 2026-10-23: learning keys the audit found missing. A pipeline's confidence (summed lead scores),
-- and per run who it was for (seller service), where, at what size band, and how good it was.
ALTER TABLE v2_pipelines ADD COLUMN IF NOT EXISTS score_sum DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS seller_service TEXT;
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS area_text TEXT;
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS business_profile_id UUID;
ALTER TABLE v2_outcomes ADD COLUMN IF NOT EXISTS pipeline_id TEXT;
ALTER TABLE v2_outcomes ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE v2_outcomes ADD COLUMN IF NOT EXISTS campaign_id UUID;
ALTER TABLE v2_outcomes ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE v2_outcomes ADD COLUMN IF NOT EXISTS detail JSONB;
CREATE INDEX IF NOT EXISTS idx_v2_outcomes_pipeline ON v2_outcomes(pipeline_id, event);

-- 2026-10-23: one request at a time per grid cell. Two requests for the same tile half a second
-- apart both read the same pending cell and both paid Google for it (prod ledger, sangitaverma).
ALTER TABLE area_type_scans ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Public funded-startups pages (2026-10-24): rounds extracted from funding news once a week
-- (lib/funded/refresh.ts). One row per company; a newer round replaces the older one.
CREATE TABLE IF NOT EXISTS funded_startups (
  company_key  text PRIMARY KEY,
  company      text NOT NULL,
  website      text,
  about        text,
  city         text,
  city_slug    text,
  round        text,
  amount       text,
  announced    date,
  investors    jsonb NOT NULL DEFAULT '[]',
  source_url   text NOT NULL,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funded_startups_announced ON funded_startups(announced DESC);
CREATE INDEX IF NOT EXISTS idx_funded_startups_city ON funded_startups(city_slug);

-- Orchestrator (2026-10-26): the model's own reasoning for each run — which pipeline it reused, the
-- source order it chose and why; and every mid-run decision (continue with which source, or stop).
ALTER TABLE v2_runs ADD COLUMN IF NOT EXISTS reasoning JSONB;
CREATE TABLE IF NOT EXISTS v2_decisions (
  id           BIGSERIAL PRIMARY KEY,
  run_id       UUID NOT NULL,
  at           TEXT NOT NULL,              -- plan | rank
  decision     JSONB NOT NULL,             -- { action, strategy, reusePipelineId, strategies, reasoning, confidence }
  context_chars INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v2_decisions_run ON v2_decisions(run_id);

-- Product analytics (2026-10-26, Tarun: "har ek button ki tracking, admin mein har section ke actions,
-- upsell ke liye"). One row per user action. Two writers: the client beacon (every click / page view
-- in the app, components/ActivityBeacon.tsx) and server routes (completed actions — the truth for
-- funnels, lib/events.ts). Event names are section.object.action (docs/analytics-events.md).
CREATE TABLE IF NOT EXISTS product_events (
  id          BIGSERIAL PRIMARY KEY,
  user_email  TEXT NOT NULL,
  session_id  TEXT,                        -- per browser tab, from the beacon
  event       TEXT NOT NULL,               -- e.g. chat.plan.run, integrations.email.connected
  section     TEXT NOT NULL,               -- chat | leads | campaigns | inbox | templates | integrations | billing | settings | nav | account
  source      TEXT NOT NULL DEFAULT 'client', -- client | server
  path        TEXT,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  device      TEXT,                        -- mobile | desktop
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_events_user_time ON product_events(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_event_time ON product_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_section_time ON product_events(section, created_at DESC);

-- First-touch acquisition (2026-10-26): utm / referrer / landing page from the m_src cookie
-- (components/AttributionCapture.tsx), written once at signup or onboarding (lib/attribution.ts).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signup_source JSONB;

-- 2026-11-02: AI call recordings ("agent:interaction id", fetched through /api/v2/outreach/voice/recording).
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS recording TEXT;
ALTER TABLE v2_sends ADD COLUMN IF NOT EXISTS recording TEXT;
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS call_outcome TEXT;   -- booked | interested | not_interested | callback | wrong_person | no_conversation
ALTER TABLE v2_inbox ADD COLUMN IF NOT EXISTS call_meeting TEXT;   -- "Tuesday 4 pm" when a meeting was booked on the call

-- 2026-11-02: a campaign's activity log — every step of every send (queued, dialling, the call's
-- end status, outcome, retry, skip, stop/restart), shown live in the builder and kept afterwards.
CREATE TABLE IF NOT EXISTS v2_send_log (
  id          BIGSERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL,
  send_id     BIGINT,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind        TEXT NOT NULL,      -- queued | dial | deferred | call_status | outcome | retry | skipped | failed | sent | campaign
  text        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_v2_send_log_campaign ON v2_send_log(campaign_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_send_log_send ON v2_send_log(send_id, at);

-- 2026-11-04: the Campaign Planner runs in the background (App Runner cuts requests at 120 s).
ALTER TABLE v2_campaigns ADD COLUMN IF NOT EXISTS planning_since TIMESTAMPTZ;
ALTER TABLE v2_campaigns ADD COLUMN IF NOT EXISTS plan_error TEXT;
