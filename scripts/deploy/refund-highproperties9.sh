#!/usr/bin/env bash
#
# One-off refund: highproperties9@gmail.com spent 60 credits (56 billed_places_call + 4
# job_area_scan) on 2026-09-06 discovering 6 real businesses that turned out to have zero
# extractable job listings -- a genuine product-limitation outcome, not user error. Approved as a
# goodwill refund. credit_ledger's unique index on (reason, ref) makes this safe to run twice.
#
#   ./scripts/deploy/refund-highproperties9.sh
set -euo pipefail

SG=sg-0bc880363b24cba7b
DB_ID=gigzman-prod
AWS="$HOME/claude-tools/aws/venv/bin/aws"

cd "$(dirname "$0")/../.."
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
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${MYIP}/32,Description='one-off refund'}]" \
  >/dev/null
"$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --publicly-accessible --apply-immediately >/dev/null

PGURL=$("$AWS" secretsmanager get-secret-value --secret-id gigzman/database-url --query SecretString --output text)

echo "==> waiting for the endpoint to accept connections" >&2
for i in $(seq 1 60); do
  psql "$PGURL&connect_timeout=8" -tAc "select 1" >/dev/null 2>&1 && break
  sleep 10
done

psql "$PGURL" -v ON_ERROR_STOP=1 -c "
WITH ins AS (
  INSERT INTO credit_ledger (user_email, reason, amount, ref)
  VALUES ('highproperties9@gmail.com', 'refund', 60, 'jobs-discover-zero-yield-2026-09-06')
  ON CONFLICT DO NOTHING
  RETURNING 1
)
UPDATE user_profiles SET credits = credits + 60, updated_at = now()
WHERE email = 'highproperties9@gmail.com' AND EXISTS (SELECT 1 FROM ins)
RETURNING email, credits;
"
