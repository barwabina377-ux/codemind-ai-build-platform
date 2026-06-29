# Deployment Guide

## Using Docker Compose (Recommended)

1. Clone the repository to the VPS:
```bash
git clone <repository_url> codemind-platform
cd codemind-platform
```

2. Configure Environment:
Copy the `.env.example` to `.env` and fill in necessary keys.
```bash
cp .env.example .env
nano .env
```

3. Copy the Docker Compose file from `docs/docker-compose.yml` to the root:
```bash
cp docs/docker-compose.yml .
```

4. Build and start the platform:
```bash
docker compose up -d --build
```

5. Verify logs:
```bash
docker compose logs -f
```

## Manual Node.js Deployment (Alternative)
If not using docker-compose for the main app, you can run it via PM2.
```bash
npm install
npm run build
npm install -g pm2
pm2 start npm --name "cloud-build" -- run start
pm2 save
```
*Note: Make sure the host machine has Docker installed so the app can spawn worker containers!*
