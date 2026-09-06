#!/usr/bin/env bash
#
# Applies db/schema.sql to the REAL production database (gigzman-prod RDS), not the stale
# Neon/Vercel environment this repo's vercel.json / db/apply-schema.sh still points at.
#
# gigzman-prod is private (PubliclyAccessible=false, VPC-internal security group) -- this opens a
# narrow window for exactly this machine's current public IP, applies schema, and closes it again
# on the way out (including on failure or Ctrl-C, via the trap). Same pattern as
# scripts/deploy/load-prod.sh, minus the leads/pSEO reload -- schema only.
#
# schema.sql is additive-only (no DROP/DELETE/UPDATE/TRUNCATE) -- safe to run repeatedly.
#
#   ./scripts/deploy/apply-schema-prod.sh
set -euo pipefail

SG=sg-0bc880363b24cba7b
DB_ID=gigzman-prod
AWS="$HOME/claude-tools/aws/venv/bin/aws"

cd "$(dirname "$0")/../.."
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1

MYIP=$(curl -s --max-time 15 https://checkip.amazonaws.com | tr -d '\n')
echo "==> opening window for ${MYIP}/32"

close() {
  echo "==> closing window"
  "$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --no-publicly-accessible \
    --apply-immediately >/dev/null 2>&1 || true
  "$AWS" ec2 revoke-security-group-ingress --group-id "$SG" --protocol tcp --port 5432 \
    --cidr "${MYIP}/32" >/dev/null 2>&1 || true
  echo "==> window closed (RDS private, ingress rule removed)"
}
trap close EXIT

"$AWS" ec2 authorize-security-group-ingress --group-id "$SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${MYIP}/32,Description='temporary schema apply'}]" \
  >/dev/null
"$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --publicly-accessible --apply-immediately >/dev/null

PGURL=$("$AWS" secretsmanager get-secret-value --secret-id gigzman/database-url --query SecretString --output text)

echo "==> waiting for the endpoint to accept connections"
for i in $(seq 1 60); do
  psql "$PGURL&connect_timeout=8" -tAc "select 1" >/dev/null 2>&1 && break
  sleep 10
done
psql "$PGURL" -tAc "select 'connected to ' || current_database()"

echo "==> schema (idempotent, additive)"
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f db/schema.sql

echo "==> confirming the jobs-mode + campaign-step objects landed"
psql "$PGURL" -A -F' | ' -c "
  SELECT 'user_profiles.dashboard_mode' AS object, count(*) > 0 AS present
    FROM information_schema.columns
   WHERE table_name = 'user_profiles' AND column_name = 'dashboard_mode'
  UNION ALL
  SELECT 'leads.website_url', count(*) > 0
    FROM information_schema.columns
   WHERE table_name = 'leads' AND column_name = 'website_url'
  UNION ALL
  SELECT 'table job_companies', count(*) > 0 FROM information_schema.tables WHERE table_name = 'job_companies'
  UNION ALL
  SELECT 'table job_listings', count(*) > 0 FROM information_schema.tables WHERE table_name = 'job_listings'
  UNION ALL
  SELECT 'table applicant_profiles', count(*) > 0 FROM information_schema.tables WHERE table_name = 'applicant_profiles'
  UNION ALL
  SELECT 'table job_applications', count(*) > 0 FROM information_schema.tables WHERE table_name = 'job_applications'
  UNION ALL
  SELECT 'table campaign_steps', count(*) > 0 FROM information_schema.tables WHERE table_name = 'campaign_steps'
;"

echo "==> done"
