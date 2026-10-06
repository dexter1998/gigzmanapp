#!/usr/bin/env bash
# Opens an SSM port-forward to the private gigzman-prod RDS on 127.0.0.1:5433. The RDS has no
# public address, so every prod query needs this first.
#
#   ./scripts/prod-tunnel.sh            # open (idempotent)
#   ./scripts/prod-tunnel.sh --stop
#
# Deliberately prints no credentials and puts none in the environment. Scripts get their
# connection from lib/db-prod.ts, which reads the secret in-process; psql takes the same values
# via `eval "$(npx tsx scripts/prod-psql-env.ts)"` if a shell session is genuinely needed.
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-dhando-dev}"
export AWS_REGION="${AWS_REGION:-ap-south-1}"

JUMP_HOST=i-07303fa06c7451299
LOCAL_PORT=5433
SECRET_ID=gigzman/database-url
PID_FILE="${TMPDIR:-/tmp}/gigzman-prod-tunnel.pid"

if [[ "${1:-}" == "--stop" ]]; then
  [[ -f "$PID_FILE" ]] && kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "tunnel stopped" >&2
  exit 0
fi

if ! nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
  # Only the hostname is read here; the password stays in the secret.
  host=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString \
           --output text | sed -E 's#^postgres://[^@]+@([^:/]+).*#\1#')

  # The jump host is an on-demand t3.micro and is often found stopped; starting it is cheap and
  # idempotent, and skipping the check produces a silent connection failure instead of an error.
  state=$(aws ec2 describe-instances --instance-ids "$JUMP_HOST" \
            --query 'Reservations[0].Instances[0].State.Name' --output text)
  if [[ "$state" != "running" ]]; then
    echo "jump host $state — starting" >&2
    aws ec2 start-instances --instance-ids "$JUMP_HOST" >/dev/null
    aws ec2 wait instance-running --instance-ids "$JUMP_HOST"
  fi
  # SSM needs its agent online, which lags the instance state by a while.
  for _ in $(seq 1 30); do
    ping=$(aws ssm describe-instance-information \
             --filters "Key=InstanceIds,Values=$JUMP_HOST" \
             --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || echo None)
    [[ "$ping" == "Online" ]] && break
    sleep 5
  done
  [[ "$ping" == "Online" ]] || { echo "SSM agent not Online (PingStatus=$ping)" >&2; exit 1; }

  aws ssm start-session --target "$JUMP_HOST" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "host=$host,portNumber=5432,localPortNumber=$LOCAL_PORT" \
    >/dev/null 2>&1 &
  echo $! > "$PID_FILE"

  for _ in $(seq 1 30); do
    nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null && break
    sleep 1
  done
  nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null || { echo "tunnel failed to open" >&2; exit 1; }
  echo "tunnel up on 127.0.0.1:$LOCAL_PORT -> $host:5432" >&2
else
  echo "tunnel already up on 127.0.0.1:$LOCAL_PORT" >&2
fi
