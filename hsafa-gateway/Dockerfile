FROM node:20-alpine AS base

RUN apk add --no-cache openssl && npm install -g pnpm

WORKDIR /app

FROM base AS dependencies

COPY package.json ./
COPY prisma ./prisma

RUN pnpm install && pnpm prisma generate

FROM base AS development

COPY --from=dependencies /app/node_modules ./node_modules
COPY . ./

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . ./

RUN pnpm run build

FROM base AS production

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
