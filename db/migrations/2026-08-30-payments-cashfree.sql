-- Cashfree credit-pack purchases (India / INR).
--
-- Additive and idempotent. Run before deploying the billing routes:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/2026-08-30-payments-cashfree.sql

BEGIN;

-- Every order we create, whether or not it is ever paid. Rows are written before the user is sent
-- to the gateway, so an abandoned checkout is still visible as `created` rather than vanishing —
-- that gap is exactly where payment bugs hide.
--
-- Money is stored in PAISE as an INTEGER, never rupees as a float: ₹3,499 is 349900 here. Cashfree
-- is sent the rupee value, but nothing in our own arithmetic ever touches a fractional currency
-- value, so no rounding can drift between what we charged and what we granted.
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cashfree',
  order_id TEXT NOT NULL UNIQUE,     -- our id, also Cashfree's order_id
  cf_payment_id TEXT,                -- Cashfree's own payment id, set when the webhook lands
  pack_id TEXT NOT NULL,             -- credit pack purchased (see lib/credits.ts)
  credits INTEGER NOT NULL,          -- credits this purchase grants, frozen at order time
  amount_paise INTEGER NOT NULL,     -- also frozen at order time
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',  -- created | paid | failed | dropped | expired
  raw JSONB,                         -- last webhook/verify payload, for support and disputes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);

-- credit_ledger was built only for spends: `amount` is documented as always negative and the
-- dedup key is (user_email, lead_id, reason), which cannot separate two purchases — both have a
-- NULL lead_id. `ref` carries the external id instead (a Cashfree order_id here), and the partial
-- unique index below is what makes a replayed webhook a no-op rather than a double credit.
ALTER TABLE credit_ledger ADD COLUMN IF NOT EXISTS ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_ref
  ON credit_ledger(reason, ref) WHERE ref IS NOT NULL;

COMMIT;
