#!/usr/bin/env bash
#
# Grow gigzman-prod's storage and turn on storage autoscaling.
#
# Why (2026-10-21): the instance hit `storage-full` (20 GB, 0 bytes free). Every query then
# failed with `read ECONNRESET` and mantisai.in was effectively down (landing map showed no pins,
# /api/public/leads returned 500). RDS storage can only grow, never shrink.
#
#   ./scripts/deploy/grow-rds-storage.sh            # 40 GB, autoscaling up to 100 GB
#   ./scripts/deploy/grow-rds-storage.sh 60 200     # custom size / ceiling
set -euo pipefail

DB_ID=gigzman-prod
NEW_GB="${1:-40}"
MAX_GB="${2:-100}"
REGION=ap-south-1

cd "$(dirname "$0")/../.."
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=$REGION

AWS=aws
[ -x "$HOME/claude-tools/aws/venv/bin/aws" ] && ! aws --version >/dev/null 2>&1 && AWS="$HOME/claude-tools/aws/venv/bin/aws"

state() {
  "$AWS" rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].[DBInstanceStatus,AllocatedStorage,MaxAllocatedStorage,PendingModifiedValues.AllocatedStorage]' --output text
}
free_mb() {
  "$AWS" cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name FreeStorageSpace \
    --dimensions Name=DBInstanceIdentifier,Value="$DB_ID" \
    --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '15 min ago' +%Y-%m-%dT%H:%M:%SZ)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --period 300 --statistics Minimum \
    --query 'sort_by(Datapoints,&Timestamp)[-1].Minimum' --output text | awk '{ if ($1=="None") print "?"; else printf "%.0f", $1/1048576 }'
}

echo "==> account: $("$AWS" sts get-caller-identity --query Account --output text)   region: $REGION"
read -r STATUS ALLOC MAX PENDING <<<"$(state)"
echo "==> $DB_ID now: status=$STATUS  storage=${ALLOC}GB  autoscaling-max=${MAX}  free≈$(free_mb) MB"

if [ "$ALLOC" -ge "$NEW_GB" ]; then
  echo "==> already ${ALLOC}GB (>= ${NEW_GB}GB) — nothing to do"; exit 0
fi

echo
echo "This will grow $DB_ID from ${ALLOC}GB to ${NEW_GB}GB and allow autoscaling up to ${MAX_GB}GB."
echo "It cannot be undone (RDS storage only grows). The database stays online."
read -r -p "Type 'yes' to continue: " OK
[ "$OK" = "yes" ] || { echo "aborted"; exit 1; }

"$AWS" rds modify-db-instance --db-instance-identifier "$DB_ID" \
  --allocated-storage "$NEW_GB" --max-allocated-storage "$MAX_GB" --apply-immediately \
  --query 'DBInstance.[DBInstanceStatus,PendingModifiedValues.AllocatedStorage]' --output text

echo "==> requested. Watching every 30s (Ctrl-C is safe — the change continues in AWS)…"
for i in $(seq 1 60); do
  sleep 30
  read -r STATUS ALLOC MAX PENDING <<<"$(state)"
  echo "   $(date +%H:%M:%S)  status=$STATUS  storage=${ALLOC}GB  pending=${PENDING}  free≈$(free_mb) MB"
  if [ "$ALLOC" -ge "$NEW_GB" ] && [ "$STATUS" != "storage-full" ] && [ "$STATUS" != "modifying" ]; then
    echo "==> done: ${ALLOC}GB, status=$STATUS"
    break
  fi
done
echo "==> (storage-optimization may keep running in the background for a while — the DB is usable once status is 'available')"
