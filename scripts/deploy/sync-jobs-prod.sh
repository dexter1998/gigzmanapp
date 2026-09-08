#!/usr/bin/env bash
#
# Re-exports the local jobs corpus and pushes it to production in one step.
#
# The sweep and crawl keep running, so this is meant to be re-run periodically rather than once.
# Both halves are safe to repeat: companies key on domain, and listing source_hash is recomputed
# in SQL to match lib/jobs/store.ts, so a second run updates rows instead of duplicating them.
#
#   ./scripts/deploy/sync-jobs-prod.sh
set -euo pipefail

DB="${JOBS_LOCAL_DB:-postgres://gigzman:gigzman_dev_local@localhost:5432/gigzman_dev}"
EXPORT_DIR="${JOBS_EXPORT_DIR:-$HOME/Desktop/mantis-gosom-data/export}"

cd "$(dirname "$0")/../.."
mkdir -p "$EXPORT_DIR"

echo "==> exporting from local" >&2
psql "$DB" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT domain, company_name, category, lat, lng, city_slug, country_code, favicon_url,
         careers_url, extraction_method, ats_platform, golden_tier, scrape_status, scrape_error,
         scraped_at, next_refresh_at
    FROM job_companies
) TO '$EXPORT_DIR/companies.csv' CSV HEADER"

psql "$DB" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT c.domain, l.title, l.apply_url, l.location, l.description, l.job_family, l.seniority,
         l.seniority_rank, l.work_mode, l.employment_type, l.min_experience_years,
         l.max_experience_years, l.ctc_min_inr, l.ctc_max_inr, l.ctc_source, l.ctc_confidence,
         l.posted_at, l.is_open, l.first_seen_at, l.last_seen_at
    FROM job_listings l
    JOIN job_companies c ON c.id = l.company_id
   WHERE l.is_open
) TO '$EXPORT_DIR/listings.csv' CSV HEADER"

echo "==> loading into production" >&2
exec "$(dirname "$0")/load-jobs-prod.sh" "$EXPORT_DIR"
