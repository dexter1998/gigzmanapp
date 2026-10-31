#!/usr/bin/env bash
#
# Point production at Mantis's own Google Cloud project (glowing-jetty-512416-k4, tarun@mantisai.in)
# instead of the Dhando project, whose billing lapsed on 2026-10-22 (every geocode/Places call came
# back REQUEST_DENIED, so chat area lookups and lead discovery silently stopped).
#
# What it changes, and nothing else:
#   1. Secrets Manager gigzman/maps-browser-key -> the `mantis-browser` key (referrer-locked to mantisai.in).
#   2. A fresh image of the commit that is ALREADY live, rebuilt only so the new browser key is baked
#      in (NEXT_PUBLIC_* is compile-time). Built from a clean git worktree, so no uncommitted work ships.
#   3. App Runner env: GOOGLE_PLACES_API_KEY, GOOGLE_CLIENT_ID/SECRET, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
#      -> Mantis project values; MANTIS_* copies added for the primary/fallback code when it ships.
#      Updating the service config rolls out the new image in the same deployment.
#
# Values come from .env.local (MANTIS_GOOGLE_PLACES_API_KEY, NEXT_PUBLIC_MANTIS_GOOGLE_MAPS_API_KEY,
# MANTIS_GOOGLE_CLIENT_ID, MANTIS_GOOGLE_CLIENT_SECRET) and are never printed.
#
#   ./scripts/deploy/switch-google-to-mantis.sh          # asks for 'yes'
#   CONFIRM=yes ./scripts/deploy/switch-google-to-mantis.sh
set -euo pipefail

AWS="$HOME/claude-tools/aws/venv/bin/aws"
ACCOUNT=248746142729
REGION=ap-south-1
REPO=gigzman-app
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com
SECRET_ID=gigzman/maps-browser-key

cd "$(dirname "$0")/../.."
APP="$PWD"
val() { grep -E "^$1=" .env.local | head -1 | sed -E 's/^[^=]*=//; s/^"//; s/"$//'; }
export AWS_ACCESS_KEY_ID=$(val AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(val AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$REGION
export M_SERVER=$(val MANTIS_GOOGLE_PLACES_API_KEY) M_BROWSER=$(val NEXT_PUBLIC_MANTIS_GOOGLE_MAPS_API_KEY)
export M_CID=$(val MANTIS_GOOGLE_CLIENT_ID) M_CSECRET=$(val MANTIS_GOOGLE_CLIENT_SECRET)
for v in M_SERVER M_BROWSER M_CID M_CSECRET; do [ -n "${!v}" ] || { echo "missing $v in .env.local" >&2; exit 1; }; done

ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
LIVE=$($AWS ecr describe-images --repository-name $REPO --image-ids imageTag=latest --query 'imageDetails[0].imageTags' --output text | tr '\t' '\n' | grep -E '^[0-9a-f]{7,}$' | head -1)
[ -n "$LIVE" ] || { echo "could not tell which commit :latest is" >&2; exit 1; }

echo "==> account $($AWS sts get-caller-identity --query Account --output text), service gigzman-app, live commit $LIVE"
echo "This rebuilds $LIVE with the Mantis browser key and switches prod Google keys + OAuth client to the Mantis project."
OK="${CONFIRM:-}"
[ -n "$OK" ] || read -r -p "Type 'yes' to continue: " OK
[ "$OK" = "yes" ] || { echo "aborted"; exit 1; }

TMP=$(mktemp -d)
cleanup() { git -C "$APP" worktree remove --force "$TMP/src" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

echo "==> 1/3 Secrets Manager: $SECRET_ID -> mantis-browser key"
$AWS secretsmanager get-secret-value --secret-id $SECRET_ID --query SecretString --output text > "$TMP/s.json"
python3 - "$TMP/s.json" <<'PY'
import json, os, sys
p = sys.argv[1]; d = json.load(open(p))
d["previous_key_last4"] = d.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "")[-4:]
d["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = os.environ["M_BROWSER"]
d["note"] = "mantis-browser key, GCP project glowing-jetty-512416-k4 (tarun@mantisai.in); referrer-locked to mantisai.in, *.mantisai.in, localhost:3000. Switched 2026-10-23 (dhando-506016 billing lapsed)."
json.dump(d, open(p, "w"))
PY
$AWS secretsmanager put-secret-value --secret-id $SECRET_ID --secret-string "file://$TMP/s.json" --query VersionId --output text >/dev/null
rm -f "$TMP/s.json"

echo "==> 2/3 rebuilding $LIVE (clean worktree) with the new browser key"
git -C "$APP" worktree add --detach "$TMP/src" "$LIVE" >/dev/null
TAG="$LIVE-gcp"
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$M_BROWSER" \
  -t "$REGISTRY/$REPO:$TAG" -t "$REGISTRY/$REPO:latest" "$TMP/src"
$AWS ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
docker push "$REGISTRY/$REPO:$TAG"
docker push "$REGISTRY/$REPO:latest"

echo "==> 3/3 App Runner env -> Mantis project (this deploys :latest)"
$AWS apprunner describe-service --service-arn "$ARN" --query 'Service.SourceConfiguration' --output json > "$TMP/src.json"
python3 - "$TMP/src.json" <<'PY'
import json, os, sys
p = sys.argv[1]; s = json.load(open(p))
env = s["ImageRepository"]["ImageConfiguration"].setdefault("RuntimeEnvironmentVariables", {})
for k, v in {
    "GOOGLE_PLACES_API_KEY": "M_SERVER", "MANTIS_GOOGLE_PLACES_API_KEY": "M_SERVER",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": "M_BROWSER", "NEXT_PUBLIC_MANTIS_GOOGLE_MAPS_API_KEY": "M_BROWSER",
    "GOOGLE_CLIENT_ID": "M_CID", "MANTIS_GOOGLE_CLIENT_ID": "M_CID",
    "GOOGLE_CLIENT_SECRET": "M_CSECRET", "MANTIS_GOOGLE_CLIENT_SECRET": "M_CSECRET",
}.items():
    env[k] = os.environ[v]
json.dump(s, open(p, "w"))
PY
$AWS apprunner update-service --service-arn "$ARN" --source-configuration "file://$TMP/src.json" --query 'OperationId' --output text >/dev/null
rm -f "$TMP/src.json"

# update-service applied the env but kept serving the previously pulled :latest (first run, 2026-10-23:
# the push landed ~1 s before it and prod still had the old Maps key). A separate deployment pulls it.
echo "==> waiting for the config update, then redeploying to pull the new :latest"
sleep 30
until [ "$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)" = "RUNNING" ]; do sleep 15; done
$AWS apprunner start-deployment --service-arn "$ARN" --query 'OperationId' --output text >/dev/null

echo "==> waiting for RUNNING"
sleep 30
for i in $(seq 1 60); do
  ST=$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)
  echo "    $ST"; [ "$ST" = "RUNNING" ] && break; sleep 20
done

echo "==> smoke test"
for u in / /leads /login /privacy /terms; do
  printf "    %-10s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://mantisai.in$u")"
done
echo "done. Then check a chat area lookup (e.g. Gwalior), Google sign-in and the map on mantisai.in."
