#!/usr/bin/env bash
# Copies locally-seeded content to gigzman-prod (2026-10-24): blog posts of the given clusters, the
# full blog_links graph (blog-links.ts recomputes it over every post, so it is replaced, not merged),
# and funded_startups. Goes through the in-VPC site-reader box via SSM (the RDS public window fails on
# carrier-NAT networks); the box fetches the DB URL itself — it never appears in a command.
#
#   ./scripts/deploy/sync-content-prod.sh growth
set -euo pipefail
cd "$(dirname "$0")/../.."
CLUSTERS="${1:-growth}"
INSTANCE=i-07db90d90e9785886
BUCKET=dhando-leads-warehouse
PREFIX=deploy/content-sync
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1
LOCAL="$(grep -E '^DATABASE_URL' .env.local | sed -E 's/^[^=]*=//; s/"//g')"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

IN_LIST="'$(echo "$CLUSTERS" | sed "s/,/','/g")'"
psql "$LOCAL" -q -c "\copy (SELECT * FROM blog_posts WHERE cluster IN ($IN_LIST)) TO '$TMP/posts.csv' CSV"
psql "$LOCAL" -q -c "\copy (SELECT * FROM blog_links) TO '$TMP/links.csv' CSV"
psql "$LOCAL" -q -c "\copy (SELECT * FROM funded_startups) TO '$TMP/funded.csv' CSV"
echo "==> local: $(wc -l < "$TMP/posts.csv") posts, $(wc -l < "$TMP/links.csv") links, $(wc -l < "$TMP/funded.csv") funded rows"
sed -n '/CREATE TABLE IF NOT EXISTS funded_startups/,/idx_funded_startups_city/p' db/schema.sql > "$TMP/schema.sql"

cat > "$TMP/load.sql" <<'SQL'
\set ON_ERROR_STOP on
\i /opt/content-sync/schema.sql
BEGIN;
CREATE TEMP TABLE tp (LIKE blog_posts) ON COMMIT DROP;
\copy tp FROM '/opt/content-sync/posts.csv' CSV
INSERT INTO blog_posts SELECT * FROM tp
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, meta_description = EXCLUDED.meta_description,
  category = EXCLUDED.category, cluster = EXCLUDED.cluster, tags = EXCLUDED.tags, author_slug = EXCLUDED.author_slug,
  hero_variant = EXCLUDED.hero_variant, read_minutes = EXCLUDED.read_minutes, body = EXCLUDED.body, faqs = EXCLUDED.faqs,
  status = EXCLUDED.status, featured = EXCLUDED.featured, published_at = EXCLUDED.published_at,
  content_updated_at = EXCLUDED.content_updated_at, updated_at = now(), hero_image = EXCLUDED.hero_image, hero_alt = EXCLUDED.hero_alt;
CREATE TEMP TABLE tl (LIKE blog_links) ON COMMIT DROP;
\copy tl FROM '/opt/content-sync/links.csv' CSV
DELETE FROM blog_links;
INSERT INTO blog_links SELECT * FROM tl;
CREATE TEMP TABLE tf (LIKE funded_startups) ON COMMIT DROP;
\copy tf FROM '/opt/content-sync/funded.csv' CSV
INSERT INTO funded_startups SELECT * FROM tf ON CONFLICT (company_key) DO NOTHING;
COMMIT;
SELECT (SELECT count(*) FROM blog_posts) AS posts, (SELECT count(*) FROM blog_links) AS links, (SELECT count(*) FROM funded_startups) AS funded;
SQL

URLS=()
for f in posts.csv links.csv funded.csv schema.sql load.sql; do
  aws s3 cp "$TMP/$f" "s3://$BUCKET/$PREFIX/$f" --sse AES256 --only-show-errors
  URLS+=("$f=$(aws s3 presign "s3://$BUCKET/$PREFIX/$f" --expires-in 600)")
done
python3 - "${URLS[@]}" > "$TMP/cmd.json" <<'PY'
import json, sys
c = ["set -e", "mkdir -p /opt/content-sync && cd /opt/content-sync"]
for kv in sys.argv[1:]:
    name, url = kv.split("=", 1)
    c.append(f"curl -fsS '{url}' -o {name}")
c += ["U=$(aws secretsmanager get-secret-value --region ap-south-1 --secret-id gigzman/database-url --query SecretString --output text)",
      "psql \"$U\" -f load.sql", "rm -f /opt/content-sync/*.csv"]
print(json.dumps({"commands": c}))
PY
ID=$(aws ssm send-command --instance-ids $INSTANCE --document-name AWS-RunShellScript --parameters "file://$TMP/cmd.json" --query Command.CommandId --output text)
for i in $(seq 1 30); do sleep 4; S=$(aws ssm get-command-invocation --command-id "$ID" --instance-id $INSTANCE --query Status --output text); [ "$S" != InProgress ] && break; done
aws ssm get-command-invocation --command-id "$ID" --instance-id $INSTANCE --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
for f in posts.csv links.csv funded.csv schema.sql load.sql; do aws s3 rm "s3://$BUCKET/$PREFIX/$f" --only-show-errors; done
