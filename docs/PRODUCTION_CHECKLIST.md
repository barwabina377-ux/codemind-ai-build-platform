# Production Checklist

## Infrastructure & Compute
- [ ] VPS provisioned with at least 8GB RAM (Gradle builds are memory intensive).
- [ ] Docker engine is installed and running on the host.
- [ ] `ubuntu:22.04` image is pre-pulled to avoid timeout during the first worker execution.

## Storage
- [ ] `cloud_storage` volume is mapped to a persistent SSD (not ephemeral storage).
- [ ] Automated cleanup cron job is configured (e.g., delete extracted workspaces older than 24h to prevent disk exhaustion).

## Security
- [ ] Firewall limits access to Port 3000 (if direct) or only allows Nginx proxy (Ports 80/443).
- [ ] The `ZipSecurity.ts` middleware is actively rejecting ZIPs containing malicious path traversal patterns (`../`).
- [ ] Docker worker execution is restricted with `--rm` flag to guarantee ephemeral builds.
- [ ] Rate limits are active to prevent DoS via mass ZIP uploads.

## API & Integrations
- [ ] `GEMINI_API_KEY` is securely set in the `.env` file on the VPS.
- [ ] The reverse proxy (Nginx or Caddy) supports WebSockets/Chunked Encoding for real-time build logs.

## Monitoring
- [ ] The `/api/admin/stats` and `/api/admin/workers` endpoints are monitored.
- [ ] Alerts are configured for when Disk Usage > 80% (Artifacts can consume disk quickly).
