# syntax=docker/dockerfile:1

########## Stage 1: deps ##########
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

########## Stage 2: build ##########
FROM deps AS build
WORKDIR /app
COPY tsconfig.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY src ./src
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

########## Stage 3: runtime ##########
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodeapp \
    && useradd --system --uid 1001 --gid nodeapp --create-home nodeapp

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma

USER nodeapp
EXPOSE 3001
CMD ["node", "dist/server.js"]
