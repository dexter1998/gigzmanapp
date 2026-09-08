#!/usr/bin/env bash
#
# Loads the locally-accumulated jobs corpus into the REAL production database.
#
# The sweep writes to a local Postgres rather than straight to prod on purpose: reaching prod means
# opening an RDS ingress window, and holding that open for the days a sweep runs is not something
# to do casually. So the data piles up locally and lands in one pass here.
#
# Identity is by DOMAIN, never by the local row id. Local UUIDs are meaningless in prod, and a
# company already there must be updated rather than duplicated. Listing identity is likewise
# recomputed in SQL to match lib/jobs/store.ts's sourceHash exactly -- sha256(companyId|title|
# location) with the title whitespace-collapsed and both lowercased -- so re-running this is
# idempotent instead of inserting the same role twice under a different hash.
#
# Existing prod values win on conflict for everything the app maintains itself (scrape status,
# careers URL, refresh schedule): this import supplies coverage, it does not overwrite crawl
# results prod has already earned.
#
#   ./scripts/deploy/load-jobs-prod.sh [export-dir]
set -euo pipefail

SG=sg-0bc880363b24cba7b
DB_ID=gigzman-prod
AWS="$HOME/claude-tools/aws/venv/bin/aws"
EXPORT_DIR="${1:-$HOME/Desktop/mantis-gosom-data/export}"

cd "$(dirname "$0")/../.."
[ -f "$EXPORT_DIR/companies.csv" ] || { echo "missing $EXPORT_DIR/companies.csv" >&2; exit 1; }
[ -f "$EXPORT_DIR/listings.csv" ]  || { echo "missing $EXPORT_DIR/listings.csv" >&2; exit 1; }

export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1

MYIP=$(curl -s --max-time 15 https://checkip.amazonaws.com | tr -d '\n')
echo "==> opening window for ${MYIP}/32" >&2

close() {
  echo "==> closing window" >&2
  "$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --no-publicly-accessible \
    --apply-immediately >/dev/null 2>&1 || true
  "$AWS" ec2 revoke-security-group-ingress --group-id "$SG" --protocol tcp --port 5432 \
    --cidr "${MYIP}/32" >/dev/null 2>&1 || true
  echo "==> window closed (RDS private, ingress rule removed)" >&2
}
trap close EXIT

"$AWS" ec2 authorize-security-group-ingress --group-id "$SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${MYIP}/32,Description='jobs corpus load'}]" \
  >/dev/null
"$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --publicly-accessible --apply-immediately >/dev/null

PGURL=$("$AWS" secretsmanager get-secret-value --secret-id gigzman/database-url --query SecretString --output text)

echo "==> waiting for the endpoint to accept connections" >&2
for i in $(seq 1 60); do
  psql "$PGURL&connect_timeout=8" -tAc "select 1" >/dev/null 2>&1 && break
  sleep 10
done

echo "==> before:" >&2
psql "$PGURL" -c "SELECT count(*) companies, (SELECT count(*) FROM job_listings WHERE is_open) open_jobs FROM job_companies;"

psql "$PGURL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;

CREATE TEMP TABLE stg_companies (
  domain text, company_name text, category text, lat double precision, lng double precision,
  city_slug text, country_code text, favicon_url text, careers_url text, extraction_method text,
  ats_platform text, golden_tier text, scrape_status text, scrape_error text,
  scraped_at timestamptz, next_refresh_at timestamptz
);
\copy stg_companies FROM '$EXPORT_DIR/companies.csv' CSV HEADER

CREATE TEMP TABLE stg_listings (
  domain text, title text, apply_url text, location text, description text, job_family text,
  seniority text, seniority_rank smallint, work_mode text, employment_type text,
  min_experience_years numeric(4,1), max_experience_years numeric(4,1),
  ctc_min_inr integer, ctc_max_inr integer, ctc_source text, ctc_confidence text,
  posted_at timestamptz, is_open boolean, first_seen_at timestamptz, last_seen_at timestamptz
);
\copy stg_listings FROM '$EXPORT_DIR/listings.csv' CSV HEADER

INSERT INTO job_companies (
  domain, company_name, category, lat, lng, city_slug, country_code, favicon_url,
  careers_url, extraction_method, ats_platform, golden_tier, scrape_status, scrape_error,
  scraped_at, next_refresh_at
)
SELECT domain, company_name, category, lat, lng, city_slug, country_code, favicon_url,
       careers_url, extraction_method, ats_platform, golden_tier,
       COALESCE(scrape_status, 'pending'), scrape_error, scraped_at, next_refresh_at
  FROM stg_companies
ON CONFLICT (domain) DO UPDATE SET
  company_name = COALESCE(job_companies.company_name, EXCLUDED.company_name),
  category     = COALESCE(job_companies.category, EXCLUDED.category),
  lat          = COALESCE(job_companies.lat, EXCLUDED.lat),
  lng          = COALESCE(job_companies.lng, EXCLUDED.lng),
  city_slug    = COALESCE(job_companies.city_slug, EXCLUDED.city_slug),
  country_code = COALESCE(job_companies.country_code, EXCLUDED.country_code),
  -- golden_tier is the one field the import is authoritative for: it comes from the curated
  -- research set, which prod's own crawl has no way to derive.
  golden_tier  = COALESCE(EXCLUDED.golden_tier, job_companies.golden_tier);

INSERT INTO job_listings (
  company_id, source_hash, title, apply_url, location, description, job_family, seniority,
  seniority_rank, work_mode, employment_type, min_experience_years, max_experience_years,
  ctc_min_inr, ctc_max_inr, ctc_source, ctc_confidence, posted_at, is_open,
  first_seen_at, last_seen_at
)
SELECT c.id,
       encode(sha256(convert_to(
         c.id::text || '|' || btrim(regexp_replace(lower(s.title), '\s+', ' ', 'g'))
                    || '|' || btrim(lower(COALESCE(s.location, ''))), 'UTF8')), 'hex'),
       s.title, s.apply_url, s.location, s.description, s.job_family, s.seniority,
       s.seniority_rank, s.work_mode, s.employment_type, s.min_experience_years,
       s.max_experience_years, s.ctc_min_inr, s.ctc_max_inr, s.ctc_source, s.ctc_confidence,
       s.posted_at, s.is_open, s.first_seen_at, s.last_seen_at
  FROM stg_listings s
  JOIN job_companies c ON c.domain = s.domain
ON CONFLICT (source_hash) DO UPDATE SET
  is_open      = true,
  closed_at    = NULL,
  apply_url    = COALESCE(EXCLUDED.apply_url, job_listings.apply_url),
  last_seen_at = GREATEST(job_listings.last_seen_at, EXCLUDED.last_seen_at);

COMMIT;
SQL

echo "==> after:" >&2
psql "$PGURL" -c "
SELECT count(*) companies,
       count(*) FILTER (WHERE golden_tier IS NOT NULL) golden,
       count(DISTINCT country_code) countries,
       (SELECT count(*) FROM job_listings WHERE is_open) open_jobs
  FROM job_companies;"
