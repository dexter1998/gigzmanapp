-- Per-recipient send timezone, so a follow-up lands in their morning rather than ours.
--
-- Measured on the Mantis list, 4 days, bot-filtered (opens more than 10 minutes after the send,
-- which excludes the security scanners that open within seconds):
--
--     00:00-06:00 IST   18,893 sends    103 human opens   0.55%
--     10:00-17:00 IST  153,984 sends  3,398 human opens   2.21%
--
-- Four times the engagement for the same mail, and the worst hour (00:00, 0.03%) against the best
-- (11:00, 3.16%) is a hundredfold. Roughly 300 opens were lost to night sending in those four days
-- alone.
--
-- A single global window cannot fix this once a list spans countries: 11:00 IST is 01:30 for New
-- York. The schedule has to be per recipient, which is why this is a column and not a campaign
-- setting. next_due_at is already per recipient, so nothing else in the schema has to move.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS send_tz text;

-- Where the timezone came from, kept because the three sources are not equally trustworthy and a
-- wrong guess is worse than the default: 'country' and 'cctld' are declared facts about the
-- business, 'observed' is derived from when this person actually opened a previous email, and
-- 'default' means we do not know.
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS send_tz_source text;

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_tz
  ON campaign_recipients (campaign_id, send_tz) WHERE do_not_send = false;

-- The fallback has to be per campaign, not one global constant.
--
-- The first backfill dry run resolved 86.9% of rows to the default, which is fine for Stickly
-- (its own opens cluster 13:00-17:00 UTC, the US morning) and badly wrong for Mantis, whose list
-- is Indian agencies. One shared default would have moved every Mantis follow-up out of the hours
-- that measurably work and into the middle of their night.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS default_tz text NOT NULL DEFAULT 'America/New_York';
