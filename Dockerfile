# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
    STORAGE_DRIVER="local" \
    STORAGE_BUCKET="personagens" \
    STORAGE_LOCAL_DIR="/app/uploads" \
    STORAGE_LOCAL_PUBLIC_URL="/uploads"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
        wget \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

FROM base AS maintenance

ENV NODE_ENV=production \
    HOSTNAME="0.0.0.0"

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts

RUN mkdir -p /app/uploads

FROM base AS builder

ARG NEXT_REACT_COMPILER=false
ENV NEXT_REACT_COMPILER=${NEXT_REACT_COMPILER}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build:docker

FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN groupadd --system nodejs \
    && useradd --system --gid nodejs --home-dir /app nextjs \
    && mkdir -p /app/uploads \
    && chown -R nextjs:nodejs /app/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
