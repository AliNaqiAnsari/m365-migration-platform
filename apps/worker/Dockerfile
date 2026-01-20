# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy packages
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/database/package.json ./packages/database/

# Copy worker app
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/database ./packages/database
COPY apps/worker ./apps/worker

# Build packages and worker
RUN pnpm --filter @m365-migration/types build
RUN pnpm --filter @m365-migration/utils build
RUN pnpm --filter @m365-migration/database generate
RUN pnpm --filter @m365-migration/worker build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built files
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/

# Copy workspace files for production install
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Set working directory to worker app
WORKDIR /app/apps/worker

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001
USER worker

CMD ["node", "dist/main.js"]
