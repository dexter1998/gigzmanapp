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

-- Minutes to wait AFTER this step before the recipient's next touch is allowed -- a cooldown,
-- not an absolute offset from the batch start. Engagement branching makes an absolute schedule
-- meaningless: which step comes next depends on what the recipient did, so the only thing that
-- can be known in advance is how long to wait before asking that question again.
-- NULL falls back to the difference between consecutive send_offset_minutes, so campaigns
-- written before this migration keep exactly their original spacing.
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS gap_minutes INT;

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

-- Per-send step record, so the journey view can show which touch a message was without
-- re-deriving it from step_key string matching.
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS touch_no INT;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS config_set TEXT;
