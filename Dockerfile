FROM node:22-slim AS builder
ARG TARGETARCH
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-slim
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless unzip zip curl ca-certificates gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN if [ "$TARGETARCH" = "arm64" ]; then \
      apt-get update && apt-get install -y --no-install-recommends wget && \
      mkdir -p /opt/box64 && cd /opt/box64 && \
      BOX64_DEB=$(wget -qO- https://api.github.com/repos/ptitSeb/box64/releases/latest | \
        grep -o '"browser_download_url": ".*box64.*_arm64\.deb"' | head -1 | cut -d'"' -f4) && \
      wget -q "$BOX64_DEB" -O box64.deb && dpkg -i box64.deb || true && \
      apt-get clean && rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/worker ./src/worker
COPY --from=builder /app/tsconfig.json ./
COPY deploy/oracle-cloud/android-sdk-arm64.sh /usr/local/bin/android-sdk-setup

RUN mkdir -p cloud_storage/{workspace,uploads,projects,artifacts,logs,cache,workers,chat_uploads} && \
    chmod +x /usr/local/bin/android-sdk-setup

ENV NODE_ENV=production PORT=3000
ENV ANDROID_SDK_ROOT=/opt/android-sdk
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
