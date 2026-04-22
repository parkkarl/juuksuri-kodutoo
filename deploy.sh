#!/usr/bin/env bash
# Deploy script — tõmba uus kood serverisse, käivita migratsioonid, restart.
# Jooksuta SERVERIS /opt/juuksuri-kodutoo/ kaustas.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> git pull"
git pull origin main

echo "==> docker compose build"
docker compose build

echo "==> docker compose up -d"
docker compose up -d

echo "==> oota, kuni app start'ib..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec juuksur-app true >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> jooksuta migratsioonid"
docker exec juuksur-app bun run src/db/migrate.ts

echo "==> jooksuta admin seed"
docker exec juuksur-app bun run src/db/seed.ts

echo "==> tervisekontroll"
sleep 2
curl -fsS http://127.0.0.1:3100/health && echo ""

echo "==> valmis. Logid: docker logs juuksur-app --tail 30"
