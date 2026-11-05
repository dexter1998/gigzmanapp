#!/usr/bin/env bash
#
# Points production at a committed version of the hosted voice agents (docs/voice-agent-contract.md):
# VOICE_CALLER_APP_VERSION and VOICE_TEST_APP_VERSION on the App Runner service. Every other
# variable is kept as it is; update-service re-deploys the :latest image with the new environment.
#
#   ./scripts/deploy/set-voice-versions.sh <caller-version> <test-version>
set -euo pipefail

AWS="$HOME/claude-tools/aws/venv/bin/aws"
cd "$(dirname "$0")/../.."
[[ "${1:-}" =~ ^[0-9]+$ && "${2:-}" =~ ^[0-9]+$ ]] || { echo "usage: $0 <caller-version> <test-version>" >&2; exit 1; }
val() { grep -E "^$1=" .env.local | head -1 | sed -E 's/^[^=]*=//; s/^"//; s/"$//'; }
export AWS_ACCESS_KEY_ID=$(val AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(val AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=ap-south-1
export V_CALLER="$1" V_TEST="$2"

ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
$AWS apprunner describe-service --service-arn "$ARN" --query 'Service.SourceConfiguration' --output json > "$TMP/src.json"
python3 - "$TMP/src.json" <<'PY'
import json, os, sys
p = sys.argv[1]; s = json.load(open(p))
env = s["ImageRepository"]["ImageConfiguration"].setdefault("RuntimeEnvironmentVariables", {})
print(f"    was: caller={env.get('VOICE_CALLER_APP_VERSION')} test={env.get('VOICE_TEST_APP_VERSION')}")
env["VOICE_CALLER_APP_VERSION"] = os.environ["V_CALLER"]
env["VOICE_TEST_APP_VERSION"] = os.environ["V_TEST"]
json.dump(s, open(p, "w"))
PY
$AWS apprunner update-service --service-arn "$ARN" --source-configuration "file://$TMP/src.json" --query 'OperationId' --output text >/dev/null
echo "==> env updated; waiting for RUNNING"
sleep 30
until [ "$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)" = "RUNNING" ]; do sleep 15; done
echo "==> done: VOICE_CALLER_APP_VERSION=$V_CALLER VOICE_TEST_APP_VERSION=$V_TEST"
