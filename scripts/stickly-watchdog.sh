set -uo pipefail
cd /Users/dextermorgan/Desktop/gigzmanapp
LOG="$HOME/stickly-push.log"
HTML="/Users/dextermorgan/Desktop/gigzmanapp/scripts/creatives/stickly-star.html"
DEVS="/Users/dextermorgan/Desktop/gigzmanapp/scripts/creatives/devs-sendable.csv"
STALL=300; POLL=15
say(){ echo "[$(TZ=Asia/Kolkata date '+%m-%d %H:%M IST')] $*" | tee -a "$LOG"; }
run_watched() {
  "$@" >>"$LOG" 2>&1 &
  local pid=$! last size waited=0
  last=$(wc -c <"$LOG")
  while kill -0 "$pid" 2>/dev/null; do
    sleep "$POLL"; size=$(wc -c <"$LOG")
    if [ "$size" -ne "$last" ]; then last=$size; waited=0; else waited=$((waited+POLL)); fi
    if [ "$waited" -ge "$STALL" ]; then
      say "STALLED ${STALL}s - killing"
      kill -9 "$pid" 2>/dev/null; pkill -9 -f send-stickly-blast 2>/dev/null
      wait "$pid" 2>/dev/null; return 124
    fi
  done
  wait "$pid"; return $?
}
reset_tunnel(){ bash scripts/prod-tunnel.sh --stop >>"$LOG" 2>&1; sleep 2; bash scripts/prod-tunnel.sh >>"$LOG" 2>&1; }
say "stickly watchdog up - har 20 min, reserve 5000, 3 din"
END=$(( $(date +%s) + 3*86400 ))
while [ "$(date +%s)" -lt "$END" ]; do
  say "run"
  if ! run_watched bash scripts/ses.sh scripts/send-stickly-blast.ts "$HTML" "$DEVS" --send; then
    say "fail/stall - tunnel reset karke dobara"
    reset_tunnel
    run_watched bash scripts/ses.sh scripts/send-stickly-blast.ts "$HTML" "$DEVS" --send
    say "2nd exit=$?"
  fi
  sleep 1200
done
say "khatam"
