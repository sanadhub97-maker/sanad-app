#!/usr/bin/env bash
# First-time setup on a fresh Ubuntu 24.04 (arm64) VM on Oracle Cloud.
# Run once:  curl -fsSL https://raw.githubusercontent.com/sanadhub97-maker/sanad-app/main/deploy/oracle/setup.sh | bash
set -euo pipefail

REPO="https://github.com/sanadhub97-maker/sanad-app.git"
DIR="$HOME/sanad-app"

echo "== Docker =="
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== Open ports 80 and 443 in the VM firewall =="
# Oracle's Ubuntu images ship iptables rules that drop everything but SSH.
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent git
sudo netfilter-persistent save

echo "== Code =="
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi

cd "$DIR/deploy/oracle"
if [ ! -f .env ]; then
  cp env.example .env
  IP=$(curl -fsSL https://api.ipify.org)
  sed -i "s/^SITE_HOST=.*/SITE_HOST=${IP//./-}.sslip.io/" .env
  echo
  echo "Created deploy/oracle/.env with SITE_HOST=${IP//./-}.sslip.io"
  echo "Now fill in the secrets:  nano $DIR/deploy/oracle/.env"
  echo "Then start the app:       cd $DIR/deploy/oracle && sudo docker compose up -d --build"
  exit 0
fi

sudo docker compose up -d --build
sudo docker compose ps
