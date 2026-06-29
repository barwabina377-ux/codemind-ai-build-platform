# VPS Setup Guide for Remote Cloud Build Platform

## Recommended VPS Specifications
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 4+ Cores
- **RAM**: 8GB+ (16GB recommended for multiple workers)
- **Disk**: 50GB+ NVMe SSD

## 1. System Updates
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Docker & Docker Compose
```bash
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

## 3. Pre-pull the Ubuntu Docker Image for Workers
This speeds up the first build significantly.
```bash
docker pull ubuntu:22.04
```

## 4. Install Node.js (If running the backend outside Docker)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 5. Security & UFW Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp # Or 80/443 if using Nginx reverse proxy
sudo ufw enable
```
