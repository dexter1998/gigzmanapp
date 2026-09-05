-- Campaign offsets move to minute granularity, plus step_type and campaign-level variables. See
-- db/schema.sql for the authoritative, idempotent version of these statements (apply via
-- db/apply-schema.sh, not this file directly). Backfills the one pre-existing test row's
-- send_day_offset (0) into send_offset_minutes (0) -- schema.sql stays free of UPDATE statements
-- by convention (see its header note), so that one-time backfill lives here only.

BEGIN;

ALTER TABLE campaign_steps ALTER COLUMN send_day_offset DROP NOT NULL;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS send_offset_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS step_type TEXT NOT NULL DEFAULT 'single_lead';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS variables TEXT[] NOT NULL DEFAULT '{}';

UPDATE campaign_steps SET send_offset_minutes = send_day_offset * 1440
WHERE send_day_offset IS NOT NULL;

COMMIT;
