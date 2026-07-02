#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Деплой Eltera Assessment на продакшн-сервере (assestment.eltera-company.ru).
#
# Что делает: тянет main из git, пересобирает api, поднимает контейнеры,
# накатывает миграции, сидит библиотеку, перезапускает api и перечитывает nginx.
# Идемпотентно — можно запускать сколько угодно раз.
#
# Запуск на сервере:   bash /opt/eltera-assessment/deploy/deploy.sh
# Одной строкой с локали:
#   ssh root@72.56.37.116 'bash /opt/eltera-assessment/deploy/deploy.sh'
#
# Первичный бутстрап сервера (docker/nginx/certbot/clone/.env) — см. DEPLOY.md.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/eltera-assessment}"
DOMAIN="${DOMAIN:-eltera-ai.ru}"
COMPOSE="docker compose -f deploy/docker-compose.yml"

cd "$REPO_DIR"

echo "==> [1/8] git: fetch + hard reset на origin/main"
git fetch --all --prune
git reset --hard origin/main
echo "    HEAD: $(git log --oneline -1)"

echo "==> [2/8] проверка backend/.env"
if [ ! -f backend/.env ]; then
  echo "ОШИБКА: backend/.env не найден. Создайте его (см. DEPLOY.md) и повторите." >&2
  exit 1
fi

echo "==> [3/8] docker: сборка образа api"
$COMPOSE build api

echo "==> [4/8] docker: поднятие стека (db + api)"
$COMPOSE up -d

echo "==> [5/8] ожидание готовности api"
for i in $(seq 1 30); do
  if $COMPOSE exec -T api python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> [6/8] alembic upgrade head + сид библиотеки (idempotent)"
$COMPOSE exec -T api python -m alembic upgrade head
$COMPOSE exec -T api python -m app.seed

echo "==> [7/8] рестарт api (стартовый tick — уже по мигрированной схеме) + reload nginx"
$COMPOSE restart api
nginx -t && systemctl reload nginx

echo "==> [8/8] проверка"
sleep 4
curl -fsS -o /dev/null -w "    api /docs : %{http_code}\n" http://127.0.0.1:8001/docs || true
curl -fsS -o /dev/null -w "    site     : %{http_code}\n" "https://${DOMAIN}/" || true
curl -fsS -o /dev/null -w "    api /api : %{http_code}\n" "https://${DOMAIN}/api/auth/tariffs" || true

echo "✅ Готово: https://${DOMAIN}"
