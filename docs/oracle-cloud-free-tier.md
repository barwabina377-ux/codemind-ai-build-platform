# Oracle Cloud Free Tier — CodeMind AI

## Specs (Always Free)
- Shape: VM.Standard.A1.Flex (ARM64 Ampere)
- Up to 4 OCPU | 24 GB RAM
- 200 GB block storage | 10 TB/month bandwidth

## Quick Deploy

### 1. Create Instance
[Oracle Cloud Console → Compute → Instances](https://cloud.oracle.com/compute/instances)
- Image: Ubuntu 22.04/24.04 ARM64
- Shape: VM.Standard.A1.Flex (4 OCPU, 24 GB RAM)
- Boot: 50-100 GB
- Advanced → Cloud-init: paste `deploy/oracle-cloud/cloud-init.yaml`

### 2. Wait (~5 min)
```bash
ssh ubuntu@<PUBLIC_IP> "tail -f /tmp/codemind-status.txt"
```

### 3. Access
```
http://<PUBLIC_IP>:3000
```

## Manual Deploy
```bash
ssh ubuntu@<PUBLIC_IP>
git clone https://github.com/barwabina377-ux/codemind-ai-build-platform.git /tmp/cm
cd /tmp/cm && sudo ./deploy/oracle-cloud/setup.sh
```

## ARM64 Build Architecture
| Component | Runtime | Speed |
|-----------|---------|-------|
| Java 17 | ARM64 native | Fast |
| Gradle | ARM64 native | Fast |
| SDK platforms | Arch-independent | Fast |
| sdkmanager | box64 emulated | Setup only |

## Docker Images
- `ghcr.io/.../codemind-ai-build-platform:latest` — Multi-arch
- `ghcr.io/.../codemind-ai-build-platform:linux-arm64` — Oracle Ampere
- `ghcr.io/.../codemind-ai-build-platform:linux-amd64` — Intel/AMD

## Commands
```bash
docker logs -f codemind     # Live logs
docker stats codemind        # Resources
docker exec codemind android-sdk-setup  # Reinstall SDK
```

## SSL (Nginx)
```bash
apt install -y nginx certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN
```
