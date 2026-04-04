# ============================================================
# M365 Migration Worker — Production Docker Image
# Handles all migration workload processing
# ============================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/graph-client/package.json packages/graph-client/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/graph-client/node_modules ./packages/graph-client/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json tsconfig.json ./
COPY packages/ packages/
COPY apps/worker/ apps/worker/

# Generate Prisma client, build workspace packages, then build worker
RUN cd packages/database && npx prisma generate
RUN cd packages/database && npx tsc
RUN cd packages/types && npx tsc
RUN cd packages/graph-client && npx tsc
RUN cd apps/worker && npx tsc

# Stage 3: Production image
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init openssl
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy workspace packages (pnpm symlinks in apps/worker/node_modules resolve to these)
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/graph-client/package.json ./packages/graph-client/package.json
COPY --from=builder /app/packages/graph-client/dist ./packages/graph-client/dist
COPY --from=builder /app/packages/graph-client/node_modules ./packages/graph-client/node_modules

# Copy database package and re-generate Prisma client for alpine target
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY packages/database/package.json packages/database/
RUN cd packages/database && npx prisma generate

USER appuser

ENV NODE_ENV=production
ENV HEALTH_PORT=8080
EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/worker/dist/main.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health/live || exit 1
