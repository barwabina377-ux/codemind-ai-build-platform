#!/bin/bash
set -euo pipefail
echo "=== CodeMind AI - Oracle Cloud ARM64 ==="
[ "$(uname -m)" = "aarch64" ] || { echo "ERROR: ARM64 only"; exit 1; }
if ! command -v docker &>/dev/null; then curl -fsSL https://get.docker.com|sh; systemctl enable docker && systemctl start docker; fi
apt-get install -y docker-compose-plugin 2>/dev/null||true
ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw allow 3000/tcp; ufw --force enable 2>/dev/null||true
mkdir -p /data/storage/{workspace,uploads,projects,artifacts,logs,cache,workers,chat_uploads} /opt/android-sdk
cat > /root/docker-compose.yml << 'COMP'
version: "3.9"
services:
  app:
    image: ghcr.io/barwabina377-ux/codemind-ai-build-platform:latest
    container_name: codemind
    restart: unless-stopped
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      - PORT=3000
      - ANDROID_SDK_ROOT=/opt/android-sdk
    volumes:
      - /data/storage/workspace:/app/cloud_storage/workspace
      - /data/storage/uploads:/app/cloud_storage/uploads
      - /data/storage/projects:/app/cloud_storage/projects
      - /data/storage/artifacts:/app/cloud_storage/artifacts
      - /data/storage/logs:/app/cloud_storage/logs
      - /data/storage/cache:/app/cloud_storage/cache
      - /data/storage/workers:/app/cloud_storage/workers
      - /data/storage/chat_uploads:/app/cloud_storage/chat_uploads
      - /opt/android-sdk:/opt/android-sdk
COMP
cd /root && docker compose pull && docker compose up -d
sleep 5; docker exec codemind android-sdk-setup 2>&1|tail -10||true
IP=$(curl -s ifconfig.me 2>/dev/null||echo "YOUR_IP")
echo ""; echo "=============================================="
echo "  CodeMind AI LIVE: http://$IP:3000"
echo "  docker logs -f codemind"
echo "=============================================="
