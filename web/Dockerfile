# ---- deps: install everything, including devDependencies ----
# Its own stage so the layer is cached on package*.json alone, matching
# backend/Dockerfile.
FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile the Next.js app ----
FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked in, not read at runtime. NEXT_PUBLIC_* values are substituted into the
# client bundle at build time, so this is the address the browser will use —
# not a container name. `localhost:3000` is right for docker compose on a
# laptop, where the API is published on the host; a deployment overrides it
# with --build-arg.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_AI_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AI_URL=$NEXT_PUBLIC_AI_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime: the standalone server and nothing else ----
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# `standalone` already contains the server and the node_modules it needs.
# static/ and public/ are not inside it and have to come across separately:
# without them the pages render and every stylesheet and image 404s.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node

EXPOSE 3001

# Same reasoning as ai/Dockerfile: no curl in the image, and the runtime it
# already has can make the request.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
