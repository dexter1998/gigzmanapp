set -uo pipefail
cd /Users/dextermorgan/Desktop/gigzmanapp
LOG="$HOME/7day-push.log"
MULTI="/Users/dextermorgan/Desktop/gigzmanapp/scripts/creatives/mantis-multi.html"
STALL=300          # log 5 min na bade to job hang maan lo
POLL=15

say(){ echo "[$(TZ=Asia/Kolkata date '+%m-%d %H:%M IST')] $*" | tee -a "$LOG"; }

# Runs a job and kills it if it stops making progress.
#
# A total-duration cap would be wrong: a real tick legitimately runs two hours plus. What is never
# legitimate is the log going quiet, because the tick prints a line every 500 sends -- roughly every
# 30 seconds. On 2026-10-13 at 13:04 the tunnel died mid-tick and a postgres call never returned;
# postgres.js has no statement timeout, so the process sat alive and silent. The watchdog runs its
# jobs synchronously, so it waited on that corpse for ELEVEN HOURS: day 2 stopped 21,179 short and
# day 3 would never have started. Catching a connection *error* was not enough, because a hang
# raises nothing to catch.
run_watched() {
  local label="$1"; shift
  "$@" >>"$LOG" 2>&1 &
  local pid=$! last size waited=0
  last=$(wc -c <"$LOG")
  while kill -0 "$pid" 2>/dev/null; do
    sleep "$POLL"
    size=$(wc -c <"$LOG")
    if [ "$size" -ne "$last" ]; then last=$size; waited=0; else waited=$((waited+POLL)); fi
    if [ "$waited" -ge "$STALL" ]; then
      say "$label STALLED ${STALL}s - maar ke aage badh rahe hain"
      kill -9 "$pid" 2>/dev/null
      pkill -9 -f 'send-7day-tick|send-day1-retry' 2>/dev/null
      wait "$pid" 2>/dev/null
      return 124
    fi
  done
  wait "$pid"; return $?
}

# A stall means the tunnel is gone, so rebuild it from scratch rather than trusting prod-tunnel.sh's
# "already up" -- the local listener keeps accepting long after the SSM session upstream has died.
reset_tunnel() {
  bash scripts/prod-tunnel.sh --stop >>"$LOG" 2>&1
  sleep 2
  bash scripts/prod-tunnel.sh >>"$LOG" 2>&1
}

say "watchdog up - tick har 30 min, window 09-20 IST, stall guard ${STALL}s"
END=$(( $(date +%s) + 7*86400 ))
while [ "$(date +%s)" -lt "$END" ]; do
  H=$(TZ=Asia/Kolkata date +%H); H=${H#0}
  if [ "$H" -ge 9 ] && [ "$H" -lt 20 ]; then
    for job in "retry:scripts/send-day1-retry.ts $MULTI" "tick:scripts/send-7day-tick.ts"; do
      label=${job%%:*}; script=${job#*:}
      say "$label"
      if ! run_watched "$label" bash scripts/ses.sh $script --send; then
        say "$label fail/stall - tunnel reset karke dobara"
        reset_tunnel
        run_watched "$label" bash scripts/ses.sh $script --send
        say "$label 2nd exit=$?"
      fi
    done
  else
    say "window ke bahar (${H}:00)"
  fi
  sleep 1800
done
say "7 din poore"
