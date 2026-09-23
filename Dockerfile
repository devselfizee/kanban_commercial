# Image de production pour Coolify.
#
# Build multi-étapes : les dépendances de build et les sources ne sont pas
# embarquées dans l'image finale, qui ne contient que la sortie « standalone »
# de Next.js, le client Prisma et les migrations.

# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma a besoin d'OpenSSL pour ses moteurs.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Le client Prisma est généré au build : il dépend du schéma, pas de la base.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Le seed est transpilé en JavaScript pour pouvoir être exécuté en production
# sans embarquer `tsx`.
RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=esm \
      --packages=external --outfile=prisma/seed.mjs

# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Sortie standalone : serveur Node minimal et dépendances strictement nécessaires.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations et CLI Prisma, nécessaires au démarrage pour `migrate deploy`.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# `tsx` reste une dépendance de développement : le seed est embarqué compilé,
# ce qui évite d'installer un transpileur dans l'image de production.
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.mjs ./prisma/seed.mjs

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Les migrations sont appliquées avant le démarrage du serveur.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
