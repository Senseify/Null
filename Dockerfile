# Multi-stage production Dockerfile for NULL Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files for deterministic resolution
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/server/package.json ./apps/server/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/mobile/package.json ./apps/mobile/

# Install all dependencies including devDependencies for TypeScript build
RUN npm install

# Copy source and config files
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build all backend workspaces
RUN npm --workspace=packages/shared run build && \
    npm --workspace=packages/database run build && \
    npm --workspace=apps/server run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0

# Copy package descriptors for production install
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/server/package.json ./apps/server/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/mobile/package.json ./apps/mobile/

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/migrations ./packages/database/migrations
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Create persistent storage directories
RUN mkdir -p /app/uploads /app/data

EXPOSE 10000

CMD ["node", "apps/server/dist/index.js"]
