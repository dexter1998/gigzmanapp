#!/usr/bin/env bash
#
# First data for a city that has never been scanned by anything -- Places or gosom.
#
# fill-areas.sh assumes postal_code already exists on some leads so it can target districts; a
# brand-new city has none, so this always starts with one full city-wide sweep (all 106 phrases)
# to seed the archive, then hands off to district targeting for every country that has one (see
# AREA_STRATEGY in countries.ts). The UAE has none -- no postal system, no locality names this
# parser can read reliably -- so it gets a second city-wide sweep instead at a different zoom, to
# grow the CITY total rather than chase areas it structurally cannot have (MIN_AREAS is 0 there).
#
#   ./scripts/gosom/bootstrap-new-cities.sh                 # every city listed below
#   ./scripts/gosom/bootstrap-new-cities.sh dubai munich     # just these
set -uo pipefail
cd "$(dirname "$0")/../.."

export DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | sed -E 's/^[^=]*=//')
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRET_ACCESS_KEY=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export GOSOM_EC2_INSTANCE_ID=$(grep -E '^GOSOM_EC2_INSTANCE_ID=' .env.local | sed -E 's/^[^=]*=//; s/"//g')
export SCRAPER_REGION=ap-south-1

DEFAULT_CITIES="nagpur vadodara rajkot kanpur patna bhopal new-york los-angeles chicago miami dallas houston atlanta san-francisco san-jose boston washington-dc seattle philadelphia san-diego orlando minneapolis detroit portland las-vegas perth adelaide gold-coast newcastle-au canberra wollongong geelong hobart paris amsterdam madrid barcelona milan rome warsaw vienna brussels dublin lisbon stockholm copenhagen zurich prague budapest athens munich berlin hamburg cologne frankfurt stuttgart dusseldorf hannover leipzig dortmund essen nuremberg dubai abu-dhabi sharjah ajman ras-al-khaimah fujairah"
CITIES=${*:-$DEFAULT_CITIES}

geo_for() {
  npx tsx -e "
    import { CITY_BY_SLUG } from '@/lib/pseo/locations';
    const c = CITY_BY_SLUG.get('$1');
    if (!c) process.exit(2);
    console.log(c.centroid.lat + ',' + c.centroid.lng);
  " 2>/dev/null
}
is_ae() {
  npx tsx -e "
    import { CITY_BY_SLUG } from '@/lib/pseo/locations';
    console.log(CITY_BY_SLUG.get('$1')?.countryCode === 'ae' ? 'yes' : 'no');
  " 2>/dev/null
}

n=0
total=$(echo $CITIES | wc -w | tr -d ' ')
for city in $CITIES; do
  n=$((n+1))
  echo; echo "======== [$n/$total] $city ========"
  GEO=$(geo_for "$city")
  if [ -z "$GEO" ]; then echo "  unknown city, skipping"; continue; fi

  echo "-- phase 1: city-wide sweep (all phrases)"
  npx tsx scripts/gosom/plan-city.ts "$city" all > "/tmp/q-$city-city.txt" 2>/tmp/q-$city-city.err
  npx tsx scripts/gosom/run-on-instance.ts "/tmp/q-$city-city.txt" "/tmp/gosom-$city-city.json" 2 2 \
    --fast --geo="$GEO" --zoom=12 2>&1 | tail -3
  if [ -s "/tmp/gosom-$city-city.json" ]; then
    npx tsx scripts/gosom/ingest.ts "/tmp/gosom-$city-city.json" "$city" 2>&1 | tail -4
  else
    echo "  nothing came back, skipping rest of $city"
    continue
  fi

  if [ "$(is_ae "$city")" = "yes" ]; then
    echo "-- phase 2 (UAE, no area strategy): second city-wide pass at a deeper zoom"
    npx tsx scripts/gosom/run-on-instance.ts "/tmp/q-$city-city.txt" "/tmp/gosom-$city-city2.json" 2 2 \
      --fast --geo="$GEO" --zoom=14 2>&1 | tail -3
    [ -s "/tmp/gosom-$city-city2.json" ] && npx tsx scripts/gosom/ingest.ts "/tmp/gosom-$city-city2.json" "$city" 2>&1 | tail -4
  else
    echo "-- phase 2: district-targeted (now that postal codes exist)"
    GEO2=$(npx tsx scripts/gosom/plan-districts.ts "$city" 10 2>&1 >"/tmp/q-$city-d.txt" | grep '^GEO=' | cut -d= -f2)
    if [ -n "$GEO2" ]; then
      npx tsx scripts/gosom/run-on-instance.ts "/tmp/q-$city-d.txt" "/tmp/gosom-$city-d.json" 2 2 \
        --fast --geo="$GEO2" --zoom=14 2>&1 | tail -3
      [ -s "/tmp/gosom-$city-d.json" ] && npx tsx scripts/gosom/ingest.ts "/tmp/gosom-$city-d.json" "$city" 2>&1 | tail -4
    else
      echo "  no districts surfaced from phase 1 (thin data or no addressable postal codes here)"
    fi
  fi
done

echo; echo "======== all cities done, area status ========"
npx tsx scripts/gosom/area-status.ts 10 in,us,au,de,ae,fr,es,it,nl,pl,at,be,ie,pt,se,dk,ch,cz,hu,gr 2>&1 | head -80
