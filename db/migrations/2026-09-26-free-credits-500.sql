-- Free starting balance 100 -> 500 credits for new signups.
--
-- Only the column DEFAULT changes here -- existing users keep whatever balance they already have.
-- This is deliberately narrower than 2026-08-30-free-credits-100.sql (which also bumped existing
-- free-plan balances via GREATEST): this change was scoped to new users only, not a retroactive
-- top-up for everyone already on the platform.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-09-26-free-credits-500.sql

BEGIN;

ALTER TABLE user_profiles ALTER COLUMN credits SET DEFAULT 500;
ALTER TABLE user_profiles ALTER COLUMN credits_limit SET DEFAULT 500;

COMMIT;
