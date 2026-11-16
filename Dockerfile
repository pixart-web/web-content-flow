# syntax=docker/dockerfile:1
# L7: private-server edition (APP_MODE=server). Built inside Linux so the
# Next.js server, argon2 and sharp get their Linux binaries.
#   docker build --build-arg APP_URL=https://wcf.example.com -t web-content-flow:server .

FROM node:24.14.0-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /src
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG APP_URL
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:1/build pnpm prisma:generate \
 && APP_URL="$APP_URL" node scripts/build-server.mjs

FROM node:24.14.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /src/dist/server ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "web/server.js"]
