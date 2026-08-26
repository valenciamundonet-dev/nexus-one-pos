# ─────────────────────────────────────────────────────────────
# Nexus One POS v2.9.73 — Docker image
# Multi-stage build: deps → build → production runtime
# Uses Bun as primary runtime, Node.js 20 as fallback base
# ─────────────────────────────────────────────────────────────

# --- Stage 1: Install dependencies ---
FROM oven/bun:1.1.38-alpine AS deps
WORKDIR /app

# Copy lockfiles first for layer caching
COPY package.json bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile --production=false 2>/dev/null || \
    npm install --legacy-peer-deps

# --- Stage 2: Build ---
FROM oven/bun:1.1.38-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Generate Prisma client
RUN bunx prisma generate 2>/dev/null || npx prisma generate

# Push schema to create dev.db (SQLite WAL)
RUN bunx prisma db push --skip-generate 2>/dev/null || \
    npx prisma db push --skip-generate 2>/dev/null || true

# Build Next.js
RUN bun run build 2>/dev/null || npm run build

# --- Stage 3: Production runtime ---
FROM oven/bun:1.1.38-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV APP_PORT=3000
ENV PRINTER_AGENT_PORT=9100

# Create non-root user for security
RUN addgroup --system --gid 1001 nexus && \
    adduser --system --uid 1001 nexus

# Copy built application
COPY --from=builder /app/.next/standalone ./ 2>/dev/null || true
COPY --from=builder /app/.next/static ./.next/static 2>/dev/null || true
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/printer-agent ./printer-agent

# Create data directory for uploads and DB
RUN mkdir -p /app/data /app/prisma && chown -R nexus:nexus /app

USER nexus

EXPOSE ${APP_PORT} ${PRINTER_AGENT_PORT}

# Health check for the main app
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${APP_PORT}/api/diagnostics || exit 1

# Start both services via shell
CMD ["sh", "-c", "PRINTER_AGENT_PORT=${PRINTER_AGENT_PORT} node printer-agent/agent.js & bun run start"]
