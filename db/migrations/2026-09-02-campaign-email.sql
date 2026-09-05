-- Campaign SES sends: admin-authored, manually-started, cron-advanced sequences to an uploaded
-- recipient list. See db/schema.sql for the authoritative, idempotent version of these statements
-- (this file is the dated record; apply via db/apply-schema.sh, not this file directly).

BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sender TEXT NOT NULL,
  stream TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  step_key TEXT NOT NULL,
  step_order INT NOT NULL,
  send_day_offset INT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (campaign_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign ON campaign_steps(campaign_id, step_order);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  email TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT 'A',
  values JSONB NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, batch);

CREATE TABLE IF NOT EXISTS campaign_batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  batch TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by TEXT NOT NULL,
  UNIQUE (campaign_id, batch)
);

COMMIT;
