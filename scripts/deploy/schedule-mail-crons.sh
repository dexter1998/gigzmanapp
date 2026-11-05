#!/usr/bin/env bash
#
# EventBridge schedules for the opt-in mail: /api/cron/lead-alerts and /api/cron/user-mail, both
# hourly at :30 UTC, which is :00 IST. Hourly is only the tick: lead alerts send in the 10:00, 15:00
# and 20:00 IST slots, user mail between 09:00 and 21:00 IST, and both stop at the day's warm-up cap
# (lib/email/streams.ts).
#
# Same connection (mantis-cron-conn, which carries the CRON_SECRET header) and scheduler role as the
# outreach crons. put-role-policy REPLACES the role's inline policy, so it lists every destination,
# the two outreach ones included; dropping them would silently stop outreach.
#
#   ./scripts/deploy/schedule-mail-crons.sh
set -euo pipefail
AWS="$HOME/claude-tools/aws/venv/bin/aws"
ACCOUNT=248746142729
REGION=ap-south-1
cd "$(dirname "$0")/../.."
# aws-cli would try to FETCH any https:// parameter value (cli_follow_urlparam); the cron URL must be passed as text.
CFG=$(mktemp); printf "[default]\ncli_follow_urlparam = false\n" > "$CFG"; export AWS_CONFIG_FILE="$CFG"
val() { grep -E "^$1=" .env.local | sed -E 's/^[^=]*=//; s/"//g'; }
export AWS_ACCESS_KEY_ID=$(val AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(val AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$REGION

ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
SERVICE_URL=$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.ServiceUrl' --output text)
CONN_ARN=$($AWS events describe-connection --name mantis-cron-conn --query ConnectionArn --output text)
ROLE_ARN=$($AWS events list-targets-by-rule --rule mantis-outreach-daily --query 'Targets[0].RoleArn' --output text)

POL=$(mktemp)
printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"events:InvokeApiDestination","Resource":[%s]}]}' \
  "$(for d in mantis-outreach-cron mantis-v2-outreach-cron mantis-lead-alerts-cron mantis-user-mail-cron; do
       printf '"arn:aws:events:%s:%s:api-destination/%s/*",' "$REGION" "$ACCOUNT" "$d"; done | sed 's/,$//')" > "$POL"
$AWS iam put-role-policy --role-name "${ROLE_ARN##*/}" --policy-name invoke-api-destination --policy-document "file://$POL"
rm -f "$POL"

for job in lead-alerts user-mail; do
  dest="mantis-$job-cron"
  if ! $AWS events describe-api-destination --name "$dest" >/dev/null 2>&1; then
    $AWS events create-api-destination --name "$dest" --connection-arn "$CONN_ARN" \
      --invocation-endpoint "https://$SERVICE_URL/api/cron/$job" --http-method GET \
      --invocation-rate-limit-per-second 1 >/dev/null
  fi
  DEST_ARN=$($AWS events describe-api-destination --name "$dest" --query ApiDestinationArn --output text)
  $AWS events put-rule --name "mantis-$job" --schedule-expression 'cron(30 * * * ? *)' --state ENABLED \
    --description "Mantis opt-in mail tick: /api/cron/$job (hourly at :00 IST)" >/dev/null
  $AWS events put-targets --rule "mantis-$job" \
    --targets "Id=$job,Arn=$DEST_ARN,RoleArn=$ROLE_ARN,HttpParameters={QueryStringParameters={}}" >/dev/null
  echo "==> mantis-$job → https://$SERVICE_URL/api/cron/$job"
done
