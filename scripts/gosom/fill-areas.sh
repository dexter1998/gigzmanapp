#!/usr/bin/env bash
#
# Scrapes each thin city until its areas can carry real pages, then moves on.
#
# The target is qualifying leads *per area*, not per city. A city page can look healthy while every
# area beneath it is too thin to publish -- which is exactly the state London was in: 4,392 places
# and not one locality above the bar. So a city is "done" when enough of its areas clear the target,
# and a city already there is skipped rather than re-scraped.
#
# Fast mode only. The box is a t3.micro and full mode opens a Chromium page per place, which wedges
# it and takes the SSM agent down with it -- after which every command returns Undeliverable and it
# all looks like a code bug.
#
#   ./scripts/gosom/fill-areas.sh                      # every thin city
#   ./scripts/gosom/fill-areas.sh london sydney        # just these
#   TARGET=40 NEEDED=3 ./scripts/gosom/fill-areas.sh   # tune the bar
set -uo pipefail
cd "$(dirname "$0")/../.."

TARGET=${TARGET:-40}     # qualifying leads an area needs (two pages of twenty)
NEEDED=${NEEDED:-3}      # areas at target before a city counts as done
ROUNDS=${ROUNDS:-2}      # scrape passes per city before giving up on it

export DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | sed -E 's/^[^=]*=//')
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export GOSOM_EC2_INSTANCE_ID=$(grep -E '^GOSOM_EC2_INSTANCE_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export SCRAPER_REGION=ap-south-1

CITIES=${*:-"london sydney melbourne austin toronto bristol birmingham glasgow liverpool manchester leeds"}

at_target() {  # how many areas of $1 already clear TARGET
  psql "$DATABASE_URL" -tAc "
    SELECT count(*) FROM (
      SELECT area_slug, count(*) FILTER (WHERE has_website = false) q
      FROM leads WHERE city_slug = '$1' AND area_slug IS NOT NULL AND is_competitor = false
      GROUP BY 1
    ) t WHERE q >= $TARGET" 2>/dev/null | tr -d ' '
}

for city in $CITIES; do
  have=$(at_target "$city")
  if [ "${have:-0}" -ge "$NEEDED" ]; then
    echo "== $city: already ${have} areas at ${TARGET}+, skipping"
    continue
  fi

  for round in $(seq 1 "$ROUNDS"); do
    echo "== $city round ${round}/${ROUNDS} (at ${have:-0}/${NEEDED} areas)"
    GEO=$(npx tsx scripts/gosom/plan-city.ts "$city" 2>&1 >/tmp/q-$city.txt | grep '^GEO=' | cut -d= -f2)
    [ -z "$GEO" ] && { echo "   no geo for $city, skipping"; break; }

    # zoom 12 on the first pass to spread across the city, 14 on the second to go deeper into the
    # centre where the density -- and most of the website gap -- actually is.
    ZOOM=$([ "$round" = "1" ] && echo 12 || echo 14)
    npx tsx scripts/gosom/run-on-instance.ts "/tmp/q-$city.txt" "/tmp/gosom-$city-$round.json" 2 2 \
      --fast --geo="$GEO" --zoom=$ZOOM 2>&1 | tail -3
    [ -s "/tmp/gosom-$city-$round.json" ] || { echo "   nothing came back"; break; }

    npx tsx scripts/gosom/ingest.ts "/tmp/gosom-$city-$round.json" "$city" 2>&1 | tail -4
    have=$(at_target "$city")
    echo "   -> ${have} areas at ${TARGET}+"
    [ "${have:-0}" -ge "$NEEDED" ] && { echo "   $city done"; break; }
  done
done

echo; echo "== final"
npx tsx scripts/gosom/area-status.ts "$TARGET"
