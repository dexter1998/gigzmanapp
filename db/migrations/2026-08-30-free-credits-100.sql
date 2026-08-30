-- Free allowance 20 -> 100 credits, alongside the new metered rate card.
--
-- A lead unlock used to cost 1 credit, so 20 credits meant 20 leads. Under the rate card it costs
-- 5, which would have silently cut every existing free account from 20 usable leads to 4. This
-- raises the allowance so nobody's purchasing power drops on the day the pricing lands.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-08-30-free-credits-100.sql

BEGIN;

ALTER TABLE user_profiles ALTER COLUMN credits SET DEFAULT 100;
ALTER TABLE user_profiles ALTER COLUMN credits_limit SET DEFAULT 100;

-- GREATEST, never a flat assignment: this must not claw back credits from anyone who already has
-- more than 100, whether they bought them or were granted them.
UPDATE user_profiles
SET credits = GREATEST(credits, 100),
    credits_limit = GREATEST(credits_limit, 100),
    updated_at = now()
WHERE plan = 'free';

COMMIT;
