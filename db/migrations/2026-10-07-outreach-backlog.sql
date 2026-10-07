-- Record how far behind the follow-up schedule is, on every dispatcher tick.
--
-- The planner already orders due follow-ups by next_due_at ASC, so an overdue recipient is picked
-- up first as soon as the dispatcher runs. What was missing was any record that it had NOT run:
-- the complaint gate blocked 48 consecutive ticks from 2026-10-06 evening, each one dutifully
-- writing sent=0, while 19,008 recipients aged 17-19 hours past their touch-4 window with nothing
-- measuring it. A blocked tick and a quiet tick looked identical.
--
-- Additive only.
ALTER TABLE outreach_runs ADD COLUMN IF NOT EXISTS overdue_count INT;
ALTER TABLE outreach_runs ADD COLUMN IF NOT EXISTS oldest_due_at TIMESTAMPTZ;

COMMENT ON COLUMN outreach_runs.overdue_count IS
  'Recipients whose next_due_at had already passed when this tick made its decision.';
COMMENT ON COLUMN outreach_runs.oldest_due_at IS
  'The earliest next_due_at still unsent at decision time; now() - this = worst-case lag.';

-- The backlog query filters on campaign + state + next_due_at on every tick, so give it an index
-- rather than a sequential scan over the whole recipient table.
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_due
  ON campaign_recipients (campaign_id, next_due_at)
  WHERE do_not_send = false AND next_due_at IS NOT NULL;
