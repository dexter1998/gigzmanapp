#!/usr/bin/env bash
#
# General launch of V2 (chat, leads, campaigns, Inbox, AI voice calls) for every account — 2026-10-23.
#
# Order matters: the new image is pushed BEFORE the env flips, so the old code never runs with
# V2_EMAILS=* or V2_OUTREACH_SEND=1.
#   1. prod schema (additive, idempotent)
#   2. build + push the working tree as :latest  (deploy-app.sh's build, without its rollout)
#   3. App Runner env: V2 open to all, sending on, AI/lead/voice/site-reader config  → deploys :latest
#   4. an explicit redeploy (update-service alone does not re-pull :latest — learned the same day)
#   5. EventBridge schedule for /api/cron/v2-outreach every 5 min (replies sync + due sends + call results)
#   6. smoke test
#
# Values come from .env.local / Secrets Manager and are never printed.
#   CONFIRM=yes ./scripts/deploy/go-live-v2.sh
set -euo pipefail

AWS="$HOME/claude-tools/aws/venv/bin/aws"
ACCOUNT=248746142729
REGION=ap-south-1
REPO=gigzman-app
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com

cd "$(dirname "$0")/../.."
# aws-cli would try to FETCH any https:// parameter value (cli_follow_urlparam); the cron URL must be passed as text.
CFG=$(mktemp); printf "[default]\ncli_follow_urlparam = false\n" > "$CFG"; export AWS_CONFIG_FILE="$CFG"
val() { grep -E "^$1=" .env.local | head -1 | sed -E 's/^[^=]*=//; s/^"//; s/"$//'; }
export AWS_ACCESS_KEY_ID=$(val AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(val AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$REGION
ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
SERVICE_URL=$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.ServiceUrl' --output text)

# Runtime values for prod (names only ever echoed)
export E_ANTHROPIC=$(val ANTHROPIC_API_KEY) E_EXA=$(val EXA_API_KEY) E_APOLLO=$(val APOLLO_API_KEY) E_GITHUB=$(val GITHUB_TOKEN)
export E_SARVAM_KEY=$(val SARVAM_API_KEY) E_SARVAM_ORG=$(val SARVAM_ORG_ID) E_SARVAM_WS=$(val SARVAM_WORKSPACE_ID)
export E_SARVAM_CONN=$(val SARVAM_CONNECTION_ID) E_SARVAM_FROM=$(val SARVAM_FROM_NUMBER)
export E_VC_ID=$(val VOICE_CALLER_APP_ID) E_VC_VER=$(val VOICE_CALLER_APP_VERSION) E_VT_ID=$(val VOICE_TEST_APP_ID) E_VT_VER=$(val VOICE_TEST_APP_VERSION)
export E_READER_KEY=$($AWS secretsmanager get-secret-value --secret-id gigzman/site-reader-key --query SecretString --output text)
for v in E_ANTHROPIC E_EXA E_SARVAM_KEY E_SARVAM_ORG E_SARVAM_WS E_SARVAM_CONN E_SARVAM_FROM E_VC_ID E_VT_ID E_READER_KEY; do
  [ -n "${!v}" ] || { echo "missing value for $v" >&2; exit 1; }
done
MAPS_KEY=$($AWS secretsmanager get-secret-value --secret-id gigzman/maps-browser-key --query SecretString --output text \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"])')
[ -n "$MAPS_KEY" ] || { echo "no maps browser key" >&2; exit 1; }

TAG="$(git rev-parse --short HEAD)-v2live-$(date +%Y%m%d%H%M)"
echo "==> account $($AWS sts get-caller-identity --query Account --output text) · service gigzman-app · image $TAG"
echo "This opens V2 to EVERY account and turns real sending ON in production."
OK="${CONFIRM:-}"; [ -n "$OK" ] || read -r -p "Type 'yes' to continue: " OK
[ "$OK" = "yes" ] || { echo "aborted"; exit 1; }

echo "==> 1/6 prod schema"
./scripts/deploy/apply-schema-prod.sh

echo "==> 1b/6 site reader: rebuild + redeploy on the scraper box (returns page text for extra columns)"
./services/site-reader/build.sh
./services/site-reader/deploy.sh

echo "==> 2/6 build + push $TAG"
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$MAPS_KEY" \
  -t "$REGISTRY/$REPO:$TAG" -t "$REGISTRY/$REPO:latest" .
$AWS ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
docker push "$REGISTRY/$REPO:$TAG"
docker push "$REGISTRY/$REPO:latest"

echo "==> 3/6 App Runner env (V2 for all, sending on)"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
$AWS apprunner describe-service --service-arn "$ARN" --query 'Service.SourceConfiguration' --output json > "$TMP/src.json"
python3 - "$TMP/src.json" <<'PY'
import json, os, sys
p = sys.argv[1]; s = json.load(open(p))
env = s["ImageRepository"]["ImageConfiguration"].setdefault("RuntimeEnvironmentVariables", {})
fixed = {"V2_EMAILS": "*", "V2_OUTREACH_SEND": "1", "V2_READER_URL": "http://172.31.14.17:8787"}
mapped = {
    "ANTHROPIC_API_KEY": "E_ANTHROPIC", "EXA_API_KEY": "E_EXA", "APOLLO_API_KEY": "E_APOLLO", "GITHUB_TOKEN": "E_GITHUB",
    "SARVAM_API_KEY": "E_SARVAM_KEY", "SARVAM_ORG_ID": "E_SARVAM_ORG", "SARVAM_WORKSPACE_ID": "E_SARVAM_WS",
    "SARVAM_CONNECTION_ID": "E_SARVAM_CONN", "SARVAM_FROM_NUMBER": "E_SARVAM_FROM",
    "VOICE_CALLER_APP_ID": "E_VC_ID", "VOICE_CALLER_APP_VERSION": "E_VC_VER",
    "VOICE_TEST_APP_ID": "E_VT_ID", "VOICE_TEST_APP_VERSION": "E_VT_VER", "V2_READER_KEY": "E_READER_KEY",
}
env.update(fixed)
for k, v in mapped.items():
    if os.environ.get(v): env[k] = os.environ[v]
# test-only switches must never be set in prod
for k in ("V2_OUTREACH_REDIRECT", "V2_VOICE_REDIRECT_PHONE", "V2_SAVED_ONLY", "FETCHD_URL", "FETCHD_TOKEN"):
    env.pop(k, None)
json.dump(s, open(p, "w"))
PY
$AWS apprunner update-service --service-arn "$ARN" --source-configuration "file://$TMP/src.json" --query 'OperationId' --output text >/dev/null
rm -f "$TMP/src.json"
sleep 30
until [ "$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)" = "RUNNING" ]; do sleep 15; done

echo "==> 4/6 redeploy to pull :latest"
$AWS apprunner start-deployment --service-arn "$ARN" --query 'OperationId' --output text >/dev/null
sleep 30
until [ "$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)" = "RUNNING" ]; do sleep 15; done

echo "==> 5/6 v2-outreach schedule"
CONN_ARN=$($AWS events describe-connection --name mantis-cron-conn --query ConnectionArn --output text)
ROLE_ARN=$($AWS events list-targets-by-rule --rule mantis-outreach-daily --query 'Targets[0].RoleArn' --output text)
if ! $AWS events describe-api-destination --name mantis-v2-outreach-cron >/dev/null 2>&1; then
  $AWS events create-api-destination --name mantis-v2-outreach-cron --connection-arn "$CONN_ARN" \
    --invocation-endpoint "https://$SERVICE_URL/api/cron/v2-outreach" --http-method GET \
    --invocation-rate-limit-per-second 1 >/dev/null
fi
DEST_ARN=$($AWS events describe-api-destination --name mantis-v2-outreach-cron --query ApiDestinationArn --output text)
# the scheduler role was scoped to the old destination only; allow the new one too
ROLE_NAME=${ROLE_ARN##*/}
POL=$(mktemp); printf '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"events:InvokeApiDestination","Resource":["arn:aws:events:%s:%s:api-destination/mantis-outreach-cron/*","arn:aws:events:%s:%s:api-destination/mantis-v2-outreach-cron/*"]}]}' "$REGION" "$ACCOUNT" "$REGION" "$ACCOUNT" > "$POL"
$AWS iam put-role-policy --role-name "$ROLE_NAME" --policy-name invoke-api-destination --policy-document "file://$POL"; rm -f "$POL"
$AWS events put-rule --name mantis-v2-outreach --schedule-expression 'rate(5 minutes)' --state ENABLED \
  --description 'V2 outreach tick: inbox sync, due sends, AI call results' >/dev/null
$AWS events put-targets --rule mantis-v2-outreach \
  --targets "Id=v2-outreach-cron,Arn=$DEST_ARN,RoleArn=$ROLE_ARN,HttpParameters={QueryStringParameters={}}" >/dev/null

echo "==> 6/6 smoke test"
for u in / /leads /login /privacy /terms /pricing; do
  printf "    %-10s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://mantisai.in$u")"
done
printf "    cron without secret → %s (expect 401)\n" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -H 'x-vercel-cron: 1' https://mantisai.in/api/cron/v2-outreach)"
echo "done: $TAG"
