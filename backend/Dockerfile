# ---- deps: install full dependencies (incl. devDependencies) ----
# Isolated as its own stage so Docker can cache this layer independently —
# it only re-runs if package.json/package-lock.json actually change.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile TypeScript, generate Prisma client ----
# Needs devDependencies (TypeScript, Nest CLI, Prisma CLI) — this stage
# is also what the `migrate` service in docker-compose.yml targets,
# since `prisma migrate deploy` needs the Prisma CLI, which is a
# devDependency and won't exist in the slim runtime stage below.
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: minimal final image for actually running the app ----
# Reinstalls production-only dependencies from scratch (leaner than
# copying deps' full node_modules), and copies over only what's needed
# to run: compiled JS and the generated Prisma client.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Run as the non-root `node` user (built into the official image) rather
# than root — standard container security practice, not optional for
# anything beyond local throwaway use.
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]