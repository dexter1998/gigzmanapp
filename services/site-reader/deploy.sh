#!/usr/bin/env bash
# Deploys the site reader to the AWS enrichment box (leadgen-scraper) as a systemd service.
#
#   ./services/site-reader/deploy.sh
#
# The key lives in Secrets Manager (gigzman/site-reader-key; created on first run). It never goes
# into an SSM command (those are kept in command history): the bundle and a 0600 env file travel
# through private S3 objects behind 10-minute presigned URLs, deleted after the install.
set -euo pipefail
cd "$(dirname "$0")/../.."
INSTANCE=i-07db90d90e9785886
BUCKET=dhando-leads-warehouse
PREFIX=deploy/site-reader
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_DEFAULT_REGION=ap-south-1
AWS="$HOME/claude-tools/aws/venv/bin/aws"; [ -x "$AWS" ] || AWS=aws

./services/site-reader/build.sh

if ! KEY=$($AWS secretsmanager get-secret-value --secret-id gigzman/site-reader-key --query SecretString --output text 2>/dev/null); then
  KEY=$(openssl rand -hex 32)
  $AWS secretsmanager create-secret --name gigzman/site-reader-key --description "x-reader-key for the Mantis site reader on leadgen-scraper" --secret-string "$KEY" >/dev/null
  echo "==> created secret gigzman/site-reader-key"
fi

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
printf 'READER_KEY=%s\nPORT=8787\nREADER_CONCURRENCY=64\nUV_THREADPOOL_SIZE=64\nNODE_ENV=production\n' "$KEY" > "$TMP/env"
$AWS s3 cp services/site-reader/dist/site-reader.mjs "s3://$BUCKET/$PREFIX/site-reader.mjs" --sse AES256 --only-show-errors
$AWS s3 cp "$TMP/env" "s3://$BUCKET/$PREFIX/env" --sse AES256 --only-show-errors
BUNDLE_URL=$($AWS s3 presign "s3://$BUCKET/$PREFIX/site-reader.mjs" --expires-in 600)
ENV_URL=$($AWS s3 presign "s3://$BUCKET/$PREFIX/env" --expires-in 600)

cat > "$TMP/install.sh" <<INSTALL
set -e
mkdir -p /opt/mantis-reader
curl -fsS "$BUNDLE_URL" -o /opt/mantis-reader/site-reader.mjs.new
curl -fsS "$ENV_URL" -o /opt/mantis-reader/env.new
chmod 600 /opt/mantis-reader/env.new
mv /opt/mantis-reader/site-reader.mjs.new /opt/mantis-reader/site-reader.mjs
mv /opt/mantis-reader/env.new /opt/mantis-reader/env
cat > /etc/systemd/system/mantis-site-reader.service <<'UNIT'
[Unit]
Description=Mantis site reader (V2 Qualifier website reads)
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/opt/mantis-reader/env
ExecStart=/usr/bin/node /opt/mantis-reader/site-reader.mjs
Restart=always
RestartSec=3
MemoryMax=6G
DynamicUser=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now mantis-site-reader
systemctl restart mantis-site-reader
sleep 2
systemctl is-active mantis-site-reader
curl -fsS http://127.0.0.1:8787/health
INSTALL
B64=$(base64 < "$TMP/install.sh" | tr -d '\n')
CID=$($AWS ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
  --parameters "commands=[\"echo $B64 | base64 -d | bash\"]" --query Command.CommandId --output text)
for i in $(seq 1 30); do
  ST=$($AWS ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)
  case "$ST" in Success|Failed|TimedOut|Cancelled) break;; esac; sleep 2
done
$AWS ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
$AWS s3 rm "s3://$BUCKET/$PREFIX/env" --only-show-errors
[ "$ST" = Success ]
