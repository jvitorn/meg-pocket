# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://meg:meg@postgres:5432/meg_pocket?schema=public" \
    DIRECT_URL="postgresql://meg:meg@postgres:5432/meg_pocket?schema=public" \
    NEXTAUTH_SECRET="meg-pocket-local-build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
    STORAGE_DRIVER="local" \
    STORAGE_BUCKET="personagens" \
    STORAGE_LOCAL_DIR="/app/uploads" \
    STORAGE_LOCAL_PUBLIC_URL="/uploads"

RUN apk add --no-cache ca-certificates openssl

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

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV MEG_POCKET_STATIC_BESTIARY=1
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
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
