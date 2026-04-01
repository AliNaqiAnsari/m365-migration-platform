# ============================================================
# M365 Migration API — Production Docker Image
# Multi-stage build for minimal image size
# ============================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/graph-client/package.json packages/graph-client/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/graph-client/node_modules ./packages/graph-client/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json tsconfig.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma client and build
RUN cd packages/database && npx prisma generate
RUN cd apps/api && npx tsc -p tsconfig.json

# Stage 3: Production image
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

# Copy only what's needed for production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Re-generate Prisma client for alpine target
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY packages/database/package.json packages/database/
RUN cd packages/database && npx prisma generate

USER appuser

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# dumb-init forwards SIGTERM properly for graceful shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health/live || exit 1
