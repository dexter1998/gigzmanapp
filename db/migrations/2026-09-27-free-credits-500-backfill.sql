-- Retroactive +500 credits for every account that existed before 2026-09-26 23:30 IST.
--
-- 2026-09-26-free-credits-500.sql raised the DEFAULT for new signups only and said so explicitly:
-- "not a retroactive top-up for everyone already on the platform". This is that top-up, decided
-- afterwards — so the two files stay separate rather than one being edited to mean something new.
--
-- The cutoff is written in IST because that is the timezone the decision was made in; Postgres
-- stores it as the equivalent instant (2026-09-26 18:00 UTC) either way.
--
-- Idempotent: credit_ledger's partial unique index on (reason, ref) WHERE ref IS NOT NULL carries
-- one row per account, so a second run inserts nothing and therefore updates no balance. The
-- INSERT is deliberately what gates the UPDATE — same shape as lib/credits/server.ts's
-- grantCredits, for the same reason (a replay must not grant twice).
--
-- That ledger row is also what the dashboard's "500 credits, on us." popup keys on: it is shown to
-- accounts that have this row and to no one else, so the popup can never claim a gift that did not
-- actually land (see lib/popups.ts, AudienceTag).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-09-27-free-credits-500-backfill.sql

BEGIN;

WITH eligible AS (
  SELECT email
    FROM user_profiles
   WHERE created_at < TIMESTAMPTZ '2026-09-26 23:30:00+05:30'
),
granted AS (
  INSERT INTO credit_ledger (user_email, reason, amount, ref)
  SELECT email, 'promo_grant', 500, 'free-credits-500-2026-09-26:' || email
    FROM eligible
  ON CONFLICT DO NOTHING
  RETURNING user_email
)
UPDATE user_profiles p
   SET credits = p.credits + 500,
       -- The limit is a ceiling the balance is displayed against (profile page renders
       -- "credits / credits_limit"), so a grant that pushed the balance past it would render as
       -- 800/500. GREATEST raises it only when it has to, exactly as grantCredits does.
       credits_limit = GREATEST(p.credits_limit, p.credits + 500),
       updated_at = now()
  FROM granted g
 WHERE p.email = g.user_email;

COMMIT;
