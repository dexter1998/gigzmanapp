-- Admin panel collectors. Additive + idempotent. The panel itself is read-only; these tables are
-- what it reads. Apply to prod via the SSM jump host (RDS is private).

BEGIN;

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

COMMIT;
