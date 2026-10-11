# SanaD on a single always-on VM (Oracle Cloud Always Free, Ampere A1 / arm64).
# Debian ships a native arm64 Chromium, which Puppeteer uses for the PDFs
# (Chrome for Testing has no Linux arm64 build).
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY vendor vendor
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate --config=server/prisma.config.ts \
 && npm run build:client \
 && npm run build:server \
 && npm prune --omit=dev

FROM node:24-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-color-emoji ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PDF_DISABLE_SANDBOX=true \
    TRUST_PROXY_HOPS=1
COPY --from=build /app /app
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy --config=server/prisma.config.ts && node server/dist/index.js"]
