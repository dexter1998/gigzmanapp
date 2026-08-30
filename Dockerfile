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
USER node
EXPOSE 3000
CMD ["node", "server.js"]
