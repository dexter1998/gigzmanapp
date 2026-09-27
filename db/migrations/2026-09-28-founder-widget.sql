-- "Talk to founder" widget: an embeddable chat the founder actually answers.
--
-- Deliberately NOT built on contact_messages. That table is a one-way intake form — a row lands,
-- someone reads it, and the reply happens in email where the product can never show it again. The
-- whole point here is that a reply comes back into the widget the visitor already has open, so
-- this needs a thread with two sides and a read state.
--
-- Multi-site by design: one widget script goes on mantisai.in, gigzman.com and anywhere else, and
-- every conversation lands in one admin inbox tagged with where it came from.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-09-28-founder-widget.sql

BEGIN;

-- One row per site the widget is embedded on.
--
-- Rows are created on first contact rather than registered up front: the embed is a single script
-- tag with a `data-site` slug, and requiring a database row before it works would mean every new
-- landing page needs a deploy-time step someone will forget. `origins` accumulates the Origin
-- headers actually seen, so the admin can see where a slug is really being used — which is also
-- how a stolen snippet shows itself.
CREATE TABLE IF NOT EXISTS widget_sites (
  slug TEXT PRIMARY KEY,                       -- data-site="..." from the embed
  name TEXT,                                   -- admin-facing label; defaults to the slug
  origins TEXT[] NOT NULL DEFAULT '{}',        -- every Origin this slug has posted from
  is_blocked BOOLEAN NOT NULL DEFAULT false,   -- kill switch for a slug being abused
  thread_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Everyone who has ever written in, whether or not they have an account.
--
-- Kept apart from user_profiles on purpose. That table is the product's account record — a row in
-- it means a login exists, credits exist, billing may exist. Most people who write to the founder
-- are audience, not customers, and inventing half-accounts for them would corrupt every user
-- count, every lifecycle email segment and every admin number that reads user_profiles today.
--
-- `is_registered_user` is recomputed on every contact rather than frozen at first sight: someone
-- who writes in as audience and signs up next week should show as a customer the next time they
-- appear, without a backfill.
-- Both an email and a phone are required, always. A founder conversation is worth following up on
-- by whichever channel actually reaches the person, and in India that is usually WhatsApp — a
-- thread with only an email is a lead that cannot be chased. Anything already known (a signed-in
-- user's email, a profile phone) is prefilled, so "mandatory" only ever asks for what is missing.
CREATE TABLE IF NOT EXISTS widget_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,                  -- lowercased; the identity this table is keyed on
  phone TEXT NOT NULL,                         -- E.164 including country code, digits only
  country_code TEXT NOT NULL,                  -- kept apart so the admin can dial/WhatsApp directly
  name TEXT,
  is_registered_user BOOLEAN NOT NULL DEFAULT false,
  user_email TEXT,                             -- the matching user_profiles.email, when there is one
  first_site TEXT,                             -- which site they first wrote from
  thread_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_contacts_user ON widget_contacts(is_registered_user, last_seen_at DESC);

-- One conversation. A visitor may have several over time; the widget shows them under "Messages".
CREATE TABLE IF NOT EXISTS widget_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug TEXT NOT NULL REFERENCES widget_sites(slug),
  -- Set when the visitor was signed in to the dashboard: the widget skips asking for details it
  -- already has. NULL for anyone arriving from a public page.
  user_email TEXT,
  contact_id UUID REFERENCES widget_contacts(id),
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,                 -- E.164, country code included
  subject TEXT,                                -- first line of the first message, for the inbox list
  -- How an anonymous visitor proves this thread is theirs on a later visit. Held in the widget's
  -- own storage, never in a cookie the host page can read.
  visitor_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',         -- open | closed
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sender TEXT NOT NULL DEFAULT 'visitor', -- visitor | admin
  -- Read state is per side and drives every notification decision: an email is only worth sending
  -- to someone who has not already seen the message in the widget.
  visitor_last_read_at TIMESTAMPTZ,
  admin_last_read_at TIMESTAMPTZ,
  -- Throttles. A back-and-forth conversation must cost one email, not one per message.
  last_emailed_visitor_at TIMESTAMPTZ,
  last_emailed_admin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_threads_site ON widget_threads(site_slug, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_threads_unread
  ON widget_threads(last_message_at DESC)
  WHERE last_sender = 'visitor';
CREATE INDEX IF NOT EXISTS idx_widget_threads_user ON widget_threads(user_email) WHERE user_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS widget_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES widget_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,                        -- visitor | admin
  body TEXT NOT NULL,
  -- Set once the delayed notification for this message has been dealt with, so the cron that sends
  -- them can tell "not yet due" apart from "already sent" without a second table.
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_messages_thread ON widget_messages(thread_id, created_at);
-- The cron's working set: admin replies still waiting on their delayed email.
CREATE INDEX IF NOT EXISTS idx_widget_messages_pending
  ON widget_messages(created_at)
  WHERE notified_at IS NULL;

COMMIT;
