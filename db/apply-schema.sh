#!/usr/bin/env bash
# Apply db/schema.sql to an environment's database.
#
# schema.sql is written to be idempotent and additive -- every statement in it is
# CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS,
# with no DROP, DELETE, TRUNCATE, UPDATE or INSERT anywhere. Re-running it is a no-op, and it
# cannot modify or remove existing rows. That is what makes it safe to point at production.
#
# There is no migration runner in this project, so deploying code that depends on a new column
# means running this first -- otherwise the new code hits a column that isn't there. That has
# already bitten once: the local .env.local database is NOT the production one, so applying
# schema changes locally and pushing left production missing the column.
#
#   ./db/apply-schema.sh production
#   ./db/apply-schema.sh preview
#   ./db/apply-schema.sh local        # uses .env.local instead of pulling from Vercel
#
set -euo pipefail

ENVIRONMENT="${1:-}"
if [[ -z "$ENVIRONMENT" ]]; then
  echo "usage: $0 <production|preview|development|local>" >&2
  exit 2
fi

cd "$(dirname "$0")/.."

extract_url() {   # extract_url <file> -> prints DATABASE_URL value, unquoted
  grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$1" | head -1 \
    | sed -E 's/^[^=]*=//; s/^"//; s/"$//; s/^'"'"'//; s/'"'"'$//'
}

ENVFILE=""
cleanup() { [[ -n "$ENVFILE" && -f "$ENVFILE" ]] && rm -f "$ENVFILE"; }
trap cleanup EXIT

if [[ "$ENVIRONMENT" == "local" ]]; then
  DB_URL="$(extract_url .env.local)"
else
  # Pulled to a private temp file and deleted on exit -- this file holds every production secret,
  # not just the database URL.
  ENVFILE="$(mktemp -t gigzman-env)"
  chmod 600 "$ENVFILE"
  vercel env pull "$ENVFILE" --environment="$ENVIRONMENT" --yes >/dev/null
  DB_URL="$(extract_url "$ENVFILE")"
fi

if [[ -z "$DB_URL" ]]; then
  echo "no DATABASE_URL found for environment '$ENVIRONMENT'" >&2
  exit 1
fi

# Host only -- never print the URL itself, it carries the password.
echo "target: $ENVIRONMENT ($(echo "$DB_URL" | sed -E 's#.*@##; s#/.*##'))"

psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f db/schema.sql
echo "schema applied"

psql "$DB_URL" -A -F' | ' -c "
  SELECT 'area_scans.billed_places_calls' AS object,
         count(*) > 0 AS present
    FROM information_schema.columns
   WHERE table_name = 'area_scans' AND column_name = 'billed_places_calls'
  UNION ALL
  SELECT 'table email_unsubscribes', count(*) > 0
    FROM information_schema.tables WHERE table_name = 'email_unsubscribes'
  UNION ALL
  SELECT 'idx_area_scans_requester_recent', count(*) > 0
    FROM pg_indexes WHERE indexname = 'idx_area_scans_requester_recent';
"
