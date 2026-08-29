-- Public marketing forms (/contact and /partner).
--
-- Both forms are reachable by logged-out visitors, which is the whole point of putting them on
-- the marketing site — so neither can key off an Auth.js session the way the rest of the schema
-- does. Everything here is additive and idempotent; existing partner_applications rows keep their
-- user_email and pick up source='dashboard'.
--
-- Run against production before deploying the marketing pages, otherwise both form endpoints 500:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-08-30-public-forms.sql

BEGIN;

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  topic TEXT,
  message TEXT NOT NULL,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status, created_at DESC);

ALTER TABLE partner_applications ALTER COLUMN user_email DROP NOT NULL;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS agency_type TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS avg_ticket_size TEXT;
ALTER TABLE partner_applications ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dashboard';

CREATE INDEX IF NOT EXISTS idx_partner_applications_triage
  ON partner_applications(agency_type, status, submitted_at DESC);

COMMIT;
