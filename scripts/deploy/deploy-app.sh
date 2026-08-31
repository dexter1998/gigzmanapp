#!/usr/bin/env bash
#
# Builds the app image, pushes it to ECR, and tells App Runner to roll it out.
#
# linux/amd64 explicitly: this machine is arm64 and App Runner only runs x86_64, so a default
# `docker build` here produces an image that pushes fine and then fails to start -- as an
# exec-format error inside a health check, which reads like an app bug rather than a build one.
#
# The browser Maps key enters as a build arg because NEXT_PUBLIC_* values are compiled into the
# client bundle and cannot be supplied at runtime. It ships in the page source either way; it is
# browser-exposed by design, not a secret being leaked into a layer.
#
#   ./scripts/deploy/deploy-app.sh
set -euo pipefail

S=/private/tmp/claude-501/-Users-dextermorgan-Desktop-Dhando/f4b8911d-8c40-4884-b910-f503393a74e8/scratchpad
AWS=$S/awsvenv/bin/aws
ACCOUNT=248746142729
REGION=ap-south-1
REPO=gigzman-app
REGISTRY=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com

cd "$(dirname "$0")/../.."
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=$REGION

MAPS_KEY=$($AWS secretsmanager get-secret-value --secret-id gigzman/maps-browser-key --query SecretString --output text 2>/dev/null \
  || grep -E '^NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
TAG=$(git rev-parse --short HEAD)

echo "==> building ${REPO}:${TAG} (linux/amd64)"
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$MAPS_KEY" \
  -t "$REGISTRY/$REPO:$TAG" -t "$REGISTRY/$REPO:latest" .

echo "==> pushing to ECR"
$AWS ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
docker push "$REGISTRY/$REPO:$TAG"
docker push "$REGISTRY/$REPO:latest"

echo "==> rolling out on App Runner"
ARN=$($AWS apprunner list-services --query 'ServiceSummaryList[?ServiceName==`gigzman-app`].ServiceArn' --output text)
$AWS apprunner start-deployment --service-arn "$ARN" --query 'OperationId' --output text

echo "==> waiting for the service to come back to RUNNING"
for i in $(seq 1 60); do
  ST=$($AWS apprunner describe-service --service-arn "$ARN" --query 'Service.Status' --output text)
  echo "    $ST"
  [ "$ST" = "RUNNING" ] && break
  sleep 20
done

echo "==> smoke test"
for u in / /leads /leads/website-development/in/gurgaon /leads/website-development/gb/manchester; do
  printf "    %-46s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://mantisai.in$u")"
done
