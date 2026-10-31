#!/usr/bin/env bash
#
# Adds the follow-on paid-API keys to the production App Runner service (2026-10-23):
# EXA_API_KEY_NEXT and APOLLO_API_KEY_NEXT, read from .env.local and never printed.
# lib/v2/sources/key-chain.ts uses them once the current key runs out of credits.
# update-service re-deploys the :latest image with the new environment.
#
#   ./scripts/deploy/add-next-api-keys.sh
set -euo pipefail

AWS="$HOME/claude-tools/aws/venv/bin/aws"
cd "$(dirname "$0")/../.."
val() { grep -E "^$1=" .env.local | head -1 | sed -E 's/^[^=]*=//; s/^"//; s/"$//'; }
export AWS_ACCESS_KEY_ID=$(val AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(val AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=ap-south-1
export E_EXA_NEXT=$(val EXA_API_KEY_NEXT) E_APOLLO_NEXT=$(val APOLLO_API_KEY_NEXT)
[ -n "$E_EXA_NEXT" ] && [ -n "$E_APOLLO_NEXT" ] || { echo "missing *_NEXT keys in .env.local" >&2; exit 1; }

ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
$AWS apprunner describe-service --service-arn "$ARN" --query 'Service.SourceConfiguration' --output json > "$TMP/src.json"
python3 - "$TMP/src.json" <<'PY'
import json, os, sys
p = sys.argv[1]; s = json.load(open(p))
env = s["ImageRepository"]["ImageConfiguration"].setdefault("RuntimeEnvironmentVariables", {})
env["EXA_API_KEY_NEXT"] = os.environ["E_EXA_NEXT"]
env["APOLLO_API_KEY_NEXT"] = os.environ["E_APOLLO_NEXT"]
json.dump(s, open(p, "w"))
PY
$AWS apprunner update-service --service-arn "$ARN" --source-configuration "file://$TMP/src.json" --query 'OperationId' --output text >/dev/null
echo "==> env updated; waiting for RUNNING"
sleep 30
until [ "$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)" = "RUNNING" ]; do sleep 15; done
echo "==> done (names only: EXA_API_KEY_NEXT, APOLLO_API_KEY_NEXT)"
