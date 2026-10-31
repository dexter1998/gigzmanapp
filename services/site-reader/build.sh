#!/usr/bin/env bash
# Bundles the site reader into one ESM file (no node_modules needed on the box).
# esbuild is fetched on demand (not a repo dependency).
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=services/site-reader/dist/site-reader.mjs
mkdir -p "$(dirname "$OUT")"
npx --yes esbuild@0.24.0 services/site-reader/server.ts --bundle --platform=node --target=node22 --format=esm \
  --outfile="$OUT" --banner:js="import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url); process.env.ENRICH2_EMBEDDED = '1';" --log-level=warning
echo "built $OUT ($(wc -c < "$OUT") bytes)"
