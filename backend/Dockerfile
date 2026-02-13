FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages ./packages
COPY backend ./backend

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=backend
RUN npm run db:generate --workspace=backend

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV AI_PROMPT_PATH=/app/prompt.md
ENV AI_PROMPT_PATH=/app/prompt.md

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json
COPY prompt.md ./prompt.md
COPY prompt.md ./prompt.md

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
