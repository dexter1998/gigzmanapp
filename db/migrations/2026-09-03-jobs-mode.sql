-- Jobs mode: a second product surface (job discovery) alongside Leads, sharing the same map +
-- chat discovery architecture. See db/schema.sql for the authoritative, idempotent version of
-- these statements (apply via db/apply-schema.sh, not this file directly).
--
-- Tables: job_companies (one per careers surface found), job_listings (one per open role),
-- applicant_profiles (the standardized application form, filled once per user),
-- job_applications (saved/applied tracking), company_salary_bands (scraped CTC bands).
-- Plus user_profiles.dashboard_mode, which decides which of the two dashboards a user sees.
--
-- Purely additive: every existing account defaults to dashboard_mode = 'leads', i.e. exactly the
-- app they have today. No backfill needed, so unlike some migrations here this file carries no
-- UPDATE statements.

BEGIN;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dashboard_mode TEXT NOT NULL DEFAULT 'leads';

CREATE TABLE IF NOT EXISTS job_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  company_name TEXT,
  lead_id UUID REFERENCES leads(id),
  category TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  city_slug TEXT,
  country_code TEXT,
  favicon_url TEXT,
  careers_url TEXT,
  extraction_method TEXT,
  ats_platform TEXT,
  golden_tier TEXT,
  scraped_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  scrape_status TEXT NOT NULL DEFAULT 'pending',
  scrape_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_companies_latlng ON job_companies(lat, lng);
CREATE INDEX IF NOT EXISTS idx_job_companies_refresh ON job_companies(next_refresh_at)
  WHERE scrape_status <> 'no_careers_page';
CREATE INDEX IF NOT EXISTS idx_job_companies_city ON job_companies(city_slug);

CREATE TABLE IF NOT EXISTS job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES job_companies(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  apply_url TEXT,
  location TEXT,
  description TEXT,
  job_family TEXT,
  seniority TEXT,
  seniority_rank SMALLINT,
  work_mode TEXT,
  employment_type TEXT,
  min_experience_years NUMERIC(4,1),
  max_experience_years NUMERIC(4,1),
  ctc_min_inr INTEGER,
  ctc_max_inr INTEGER,
  ctc_source TEXT,
  ctc_confidence TEXT,
  posted_at TIMESTAMPTZ,
  is_open BOOLEAN NOT NULL DEFAULT true,
  closed_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_open ON job_listings(is_open) WHERE is_open = true;
CREATE INDEX IF NOT EXISTS idx_job_listings_seniority ON job_listings(seniority_rank);
CREATE INDEX IF NOT EXISTS idx_job_listings_family ON job_listings(job_family);

CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_email TEXT PRIMARY KEY REFERENCES user_profiles(email),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  country_code TEXT,
  resume_url TEXT,
  resume_filename TEXT,
  resume_text TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  total_experience_years NUMERIC(4,1),
  current_ctc_inr INTEGER,
  expected_ctc_inr INTEGER,
  notice_period_days INTEGER,
  job_family TEXT,
  seniority TEXT,
  preferred_work_mode TEXT,
  cover_letter TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES user_profiles(email),
  status TEXT NOT NULL DEFAULT 'saved',
  applied_at TIMESTAMPTZ,
  notes TEXT,
  match_score SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_email, status);

CREATE TABLE IF NOT EXISTS company_salary_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug TEXT NOT NULL,
  source TEXT NOT NULL,
  job_family TEXT,
  seniority TEXT,
  ctc_min_inr INTEGER,
  ctc_max_inr INTEGER,
  sample_size INTEGER,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_slug, source, job_family, seniority)
);

CREATE INDEX IF NOT EXISTS idx_company_salary_slug ON company_salary_bands(company_slug);

COMMIT;
