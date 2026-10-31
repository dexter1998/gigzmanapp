#!/bin/bash
# Loads the Apollo export (CSV from Athena, presigned URL in $1) into scrape_domains as campaign
# 'mantis-enrich'. Existing domains are left alone (they already belong to another campaign).
set -e
cd /opt/mantis-bulk
curl -fsS "$1" -o apollo.csv
psql "$DBURL" -v ON_ERROR_STOP=1 <<SQL
CREATE TEMP TABLE ap (domain text, website text, company text, category text, country text, city text);
\copy ap FROM '/opt/mantis-bulk/apollo.csv' CSV HEADER
INSERT INTO scrape_domains (domain, website, company, category, country, city, first_source, campaigns, status)
  SELECT DISTINCT ON (domain) domain, website, company, nullif(category,''), country, nullif(city,''), 'apollo', 'mantis-enrich', 'unknown'
  FROM ap WHERE domain <> '' ON CONFLICT (domain) DO NOTHING;
SELECT count(*) FROM scrape_domains WHERE campaigns='mantis-enrich';
SQL
