#!/usr/bin/env bash
# Pull the latest code from main and rebuild the app (the site stays up until the new one is ready).
set -euo pipefail
cd "$(dirname "$0")"
git -C ../.. pull --ff-only
sudo docker compose up -d --build app
sudo docker image prune -f >/dev/null
sudo docker compose ps
