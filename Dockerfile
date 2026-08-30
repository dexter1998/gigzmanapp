# Build and runtime are both pinned to the same LTS major the app is developed against.
# linux/amd64 on purpose: App Runner only runs x86_64 images.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are compiled into the client bundle at build time — they cannot be
# supplied later as runtime env vars, so the browser Maps key has to enter here as a build arg.
# It is a browser-exposed key by design (it ships in the page source on Vercel today too);
# nothing secret passes through build args.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Standalone output carries its own pruned node_modules; static assets and public/ are served by
# the same node process (no CDN in front yet, App Runner terminates TLS).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# next/image writes optimized copies under .next/cache at runtime. The COPYs above land owned by
# root while the server runs as node, and the failed mkdir surfaces as an unhandledRejection —
# which on modern Node is a process crash, not a warning.
RUN mkdir -p .next/cache && chown -R node:node .next/cache
USER node
EXPOSE 3000
# Forced at exec time, not via ENV: App Runner injects its own HOSTNAME (the instance hostname)
# over any ENV set here, and Next's standalone server binds to whatever HOSTNAME says — so the
# app came up on one interface while the TCP health check knocked on another, and every deploy
# failed "healthy app, failed health check".
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
