#!/usr/bin/env bash
# One extractor for the box and the app. The AWS enrichment box runs
# webdev-leads/v2/scripts/enrich2.mjs; Mantis V2's Qualifier imports the same file from
# lib/v2/enricher/. Edit the canonical copy, then run this to bring the app's copy in line.
set -euo pipefail
SRC="${ENRICH_SRC:-$HOME/Desktop/webdev-leads/v2/scripts/enrich2.mjs}"
DST="$(cd "$(dirname "$0")/.." && pwd)/lib/v2/enricher/enrich2.mjs"
# The shebang is dropped: it is only legal on line 1, and the app imports this file, never runs it.
{ echo "// VENDORED from webdev-leads/v2/scripts/enrich2.mjs by scripts/sync-enricher.sh — edit the source, not this copy."; sed '1{/^#!/d;}' "$SRC"; } > "$DST"
echo "synced $(wc -l < "$DST") lines -> $DST"
