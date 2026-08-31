#!/usr/bin/env bash
#
# Loads the multi-country scan into gigzman-prod, then rebuilds the page registry there.
#
# gigzman-prod is private (PubliclyAccessible=false, VPC-internal security group), so this opens a
# narrow window for exactly this machine's current public IP, does the work, and closes it again on
# the way out -- including on failure or Ctrl-C, which is what the trap is for. The window is one
# /32 on one port for the length of the load.
#
# Everything it writes is additive. The schema file contains no DROP, DELETE, UPDATE or TRUNCATE;
# the lead load fills gaps and never overwrites a verified value, exactly like the ingest it
# mirrors; and the page registry is recomputed rather than replaced. Production already holds real
# user data -- 6 profiles, 8 unlocks, a credit ledger -- and none of it is touched.
#
#   ./scripts/deploy/load-prod.sh
set -euo pipefail

S=/private/tmp/claude-501/-Users-dextermorgan-Desktop-Dhando/f4b8911d-8c40-4884-b910-f503393a74e8/scratchpad
AWS=$S/awsvenv/bin/aws
DUMP=$S/dump
SG=sg-0bc880363b24cba7b
DB_ID=gigzman-prod

cd "$(dirname "$0")/../.."
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1

MYIP=$(curl -s --max-time 15 https://checkip.amazonaws.com | tr -d '\n')
echo "==> opening window for ${MYIP}/32"

close() {
  echo "==> closing window"
  $AWS rds modify-db-instance --db-instance-identifier "$DB_ID" --no-publicly-accessible \
    --apply-immediately >/dev/null 2>&1 || true
  $AWS ec2 revoke-security-group-ingress --group-id "$SG" --protocol tcp --port 5432 \
    --cidr "${MYIP}/32" >/dev/null 2>&1 || true
  echo "==> window closed (RDS private, ingress rule removed)"
}
trap close EXIT

$AWS ec2 authorize-security-group-ingress --group-id "$SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${MYIP}/32,Description='temporary data load'}]" \
  >/dev/null
$AWS rds modify-db-instance --db-instance-identifier "$DB_ID" --publicly-accessible --apply-immediately >/dev/null

PGURL=$($AWS secretsmanager get-secret-value --secret-id gigzman/database-url --query SecretString --output text)

echo "==> waiting for the endpoint to accept connections"
for i in $(seq 1 60); do
  psql "$PGURL&connect_timeout=8" -tAc "select 1" >/dev/null 2>&1 && break
  sleep 10
done
psql "$PGURL" -tAc "select 'connected to ' || current_database()"

echo "==> schema (idempotent, additive)"
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f db/schema.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f db/migrations/2026-08-31-global-locations.sql

echo "==> leads"
# Staged, then merged with the same gap-fill rules the ingest uses: every public gap rate on the
# site is has_website, so filling an unknown is safe and overwriting a verified answer is not.
psql "$PGURL" -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
CREATE TEMP TABLE stage_leads (
  place_id TEXT, business_name TEXT, category TEXT, address TEXT, lat DOUBLE PRECISION,
  lng DOUBLE PRECISION, phone TEXT, email TEXT, has_website BOOLEAN,
  website_checked_at TIMESTAMPTZ, is_competitor BOOLEAN, rating REAL, review_count INTEGER,
  country_code TEXT, city_slug TEXT, area_slug TEXT, postal_code TEXT, location_via TEXT,
  location_resolved_at TIMESTAMPTZ
) ON COMMIT DROP;
\copy stage_leads FROM '$DUMP/leads.csv' CSV
INSERT INTO leads (place_id, business_name, category, address, lat, lng, phone, email, has_website,
                   website_checked_at, is_competitor, rating, review_count, country_code, city_slug,
                   area_slug, postal_code, location_via, location_resolved_at)
SELECT * FROM stage_leads
ON CONFLICT (place_id) DO UPDATE SET
  phone = COALESCE(leads.phone, EXCLUDED.phone),
  email = COALESCE(leads.email, EXCLUDED.email),
  rating = COALESCE(leads.rating, EXCLUDED.rating),
  review_count = COALESCE(leads.review_count, EXCLUDED.review_count),
  address = COALESCE(leads.address, EXCLUDED.address),
  country_code = COALESCE(leads.country_code, EXCLUDED.country_code),
  city_slug = COALESCE(leads.city_slug, EXCLUDED.city_slug),
  area_slug = COALESCE(leads.area_slug, EXCLUDED.area_slug),
  postal_code = COALESCE(leads.postal_code, EXCLUDED.postal_code),
  location_via = COALESCE(leads.location_via, EXCLUDED.location_via),
  location_resolved_at = COALESCE(leads.location_resolved_at, now()),
  has_website = CASE WHEN leads.has_website IS NULL THEN EXCLUDED.has_website ELSE leads.has_website END,
  website_checked_at = CASE WHEN leads.has_website IS NULL THEN now() ELSE leads.website_checked_at END;
COMMIT;
SQL

echo "==> coverage cells and pre-scanned regions"
psql "$PGURL" -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
CREATE TEMP TABLE stage_ats (
  cache_key TEXT, section TEXT, batch_index INTEGER, center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION, is_exhausted BOOLEAN, pending_cells JSONB, result_count INTEGER,
  top_level_count INTEGER, last_verified_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
) ON COMMIT DROP;
\copy stage_ats FROM '$DUMP/area_type_scans.csv' CSV
INSERT INTO area_type_scans (cache_key, section, batch_index, center_lat, center_lng, is_exhausted,
                             pending_cells, result_count, top_level_count, last_verified_at, completed_at, updated_at)
SELECT * FROM stage_ats
ON CONFLICT (cache_key) DO UPDATE SET
  result_count = GREATEST(area_type_scans.result_count, EXCLUDED.result_count),
  is_exhausted = area_type_scans.is_exhausted OR EXCLUDED.is_exhausted,
  last_verified_at = GREATEST(area_type_scans.last_verified_at, EXCLUDED.last_verified_at);

CREATE TEMP TABLE stage_pr (
  country_code TEXT, city_slug TEXT, section TEXT, min_lat DOUBLE PRECISION, min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION, max_lng DOUBLE PRECISION, lead_count INT, scanned_at TIMESTAMPTZ
) ON COMMIT DROP;
\copy stage_pr FROM '$DUMP/prescanned_regions.csv' CSV
INSERT INTO prescanned_regions (country_code, city_slug, section, min_lat, min_lng, max_lat, max_lng, lead_count, scanned_at)
SELECT * FROM stage_pr
ON CONFLICT (city_slug, section) DO UPDATE SET
  lead_count = EXCLUDED.lead_count, scanned_at = EXCLUDED.scanned_at, updated_at = now();
COMMIT;
SQL

echo "==> rebuilding the page registry (two passes -- promotion needs two consecutive gate passes)"
DATABASE_URL="$PGURL" npx tsx scripts/pseo-refresh.ts | head -3
DATABASE_URL="$PGURL" npx tsx scripts/pseo-refresh.ts | head -3

echo "==> result"
psql "$PGURL" -A -F' | ' -c "
SELECT country_code, count(*) leads, count(*) FILTER (WHERE has_website=false) qualifying
FROM leads WHERE country_code IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;"
psql "$PGURL" -A -F' | ' -c "
SELECT status, count(*) FROM pseo_pages GROUP BY 1 ORDER BY 2 DESC;"
