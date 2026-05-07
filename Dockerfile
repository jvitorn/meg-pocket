# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://meg:meg@postgres:5432/meg_pocket?schema=public" \
    DIRECT_URL="postgresql://meg:meg@postgres:5432/meg_pocket?schema=public" \
    NEXTAUTH_SECRET="meg-pocket-local-build-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
    GOOGLE_CLIENT_ID="local-google-client-id" \
    GOOGLE_CLIENT_SECRET="local-google-client-secret" \
    STORAGE_DRIVER="local" \
    STORAGE_BUCKET="personagens" \
    STORAGE_LOCAL_DIR="/app/storage/local/public" \
    STORAGE_LOCAL_PUBLIC_URL="http://storage"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl postgresql-client \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV MEG_POCKET_STATIC_BESTIARY=1
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /app/storage/local/public \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
