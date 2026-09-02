#!/usr/bin/env bash
# The publish gate for a blog batch. Run this instead of the seed script directly.
#
# Order matters. Block shapes are enforced by the Block union in lib/blog/blocks.ts, and the seed
# writes JSONB — so a malformed block seeds without complaint and only shows up as a wrong icon or
# a missing attribution on the live page. tsc is the only thing that catches it, so it runs first.
#
#   ./scripts/blog-publish.sh seed-batch-7
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "usage: $0 <seed-script-name>"; exit 2; }

echo "── 1/4 typecheck (block shapes) ──"
npx tsc --noEmit

echo "── 2/4 seed ──"
set -a; . ./.env.local; set +a
npx tsx "scripts/$1.ts"

echo "── 3/4 cross-links ──"
npx tsx scripts/blog-links.ts

echo "── 4/4 audit ──"
npx tsx scripts/blog-audit.ts
