FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip ca-certificates curl gnupg && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/worker ./src/worker
COPY --from=builder /app/tsconfig.json ./
RUN mkdir -p cloud_storage/{workspace,uploads,projects,artifacts,logs,cache,workers,chat_uploads}
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
