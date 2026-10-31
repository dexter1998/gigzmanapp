#!/usr/bin/env bash
# Runs scripts/deploy/delete-qa-accounts.ts against production (temporary RDS window, as query-prod.sh).
set -euo pipefail
SG=sg-0bc880363b24cba7b; DB_ID=gigzman-prod; AWS="$HOME/claude-tools/aws/venv/bin/aws"
cd "$(dirname "$0")/../.."
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1
MYIP=$(curl -s --max-time 15 https://checkip.amazonaws.com | tr -d '\n')
close() { "$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --no-publicly-accessible --apply-immediately >/dev/null 2>&1 || true
  "$AWS" ec2 revoke-security-group-ingress --group-id "$SG" --protocol tcp --port 5432 --cidr "${MYIP}/32" >/dev/null 2>&1 || true; echo "==> window closed" >&2; }
trap close EXIT
for i in $(seq 1 30); do [ "$("$AWS" rds describe-db-instances --db-instance-identifier "$DB_ID" --query 'DBInstances[0].DBInstanceStatus' --output text)" = available ] && break; sleep 10; done
"$AWS" ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${MYIP}/32,Description='qa account cleanup'}]" >/dev/null 2>&1 || true
"$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" --publicly-accessible --apply-immediately >/dev/null
PGURL=$("$AWS" secretsmanager get-secret-value --secret-id gigzman/database-url --query SecretString --output text)
for i in $(seq 1 60); do psql "$PGURL&connect_timeout=8" -tAc "select 1" >/dev/null 2>&1 && break; sleep 10; done
DATABASE_URL="$PGURL" npx tsx --tsconfig tsconfig.json scripts/deploy/delete-qa-accounts.ts
