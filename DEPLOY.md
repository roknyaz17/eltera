# Деплой Eltera Assessment

Прод: **https://assestment.eltera-company.ru**
Сервер: `root@72.56.37.116` (Ubuntu 24.04, 2 vCPU / 2 GB RAM).

## Архитектура на сервере

```
Интернет ──HTTPS──▶ host-nginx (80/443, Let's Encrypt)
                        │
                        ├─ /            → статика web-app/ (SPA)
                        │                 nginx на лету вставляет в <head>
                        │                 <script>window.ELTERA_API_BASE="/api"</script>
                        │
                        └─ /api/        → 127.0.0.1:8001 (контейнер api)

Docker (deploy/docker-compose.yml):
  eltera-assess-db   postgres:16-alpine  (том eltera_assess_pgdata)
  eltera-assess-api  FastAPI/uvicorn     127.0.0.1:8001 → :8000
```

- Код лежит в **git-чекауте** `/opt/eltera-assessment` (main).
- `backend/.env` — **не в git** (gitignore), создаётся один раз на сервере.
- Фронт обращается к API как `/api` (same-origin) — благодаря `sub_filter` в nginx
  не нужно править закоммиченный `index.html`, и всё переживает `git pull`.
- Статика (`/assets/*`, `result-screen.png`) физически в `web-app/public/`.

## Обычный деплой (обновление)

Всё делает один скрипт — тянет main и раскатывает:

```bash
ssh root@72.56.37.116 'bash /opt/eltera-assessment/deploy/deploy.sh'
```

Шаги внутри [deploy/deploy.sh](deploy/deploy.sh): `git reset --hard origin/main` →
`docker compose build api` → `up -d` → `alembic upgrade head` → `python -m app.seed`
→ `restart api` → `nginx -s reload` → health-check. Идемпотентно.

Порядок работы: изменения коммитим в `main` и пушим на GitHub, затем запускаем
скрипт — он подтягивает свежий `main` на сервере.

## Первичный бутстрап сервера (делается один раз)

Уже выполнено на 72.56.37.116. Инструкция — на случай переезда/пересоздания.
Предполагается, что DNS `assestment.eltera-company.ru` уже указывает на IP сервера.

```bash
# 1. Пакеты
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx git curl ca-certificates
curl -fsSL https://get.docker.com | sh          # docker + compose plugin

# 2. Код
git clone https://github.com/roknyaz17/eltera /opt/eltera-assessment

# 3. backend/.env — секреты + БАЗОВЫЕ ПУТИ на прод-домен.
#    Скопировать из backend/.env.example и выставить ключи; критично:
#      DEBUG=false
#      APP_PUBLIC_URL=https://assestment.eltera-company.ru
#      HH_REDIRECT_URI=https://assestment.eltera-company.ru/api/hh/callback
#      MONETA_PUBLIC_URL=https://assestment.eltera-company.ru
#    (DATABASE_URL внутри контейнера переопределяется compose-ом на db:5432.)
nano /opt/eltera-assessment/backend/.env

# 4. host-nginx: сайт из репозитория
ln -sf /opt/eltera-assessment/deploy/nginx-eltera.conf /etc/nginx/sites-available/eltera
ln -sf /etc/nginx/sites-available/eltera /etc/nginx/sites-enabled/eltera
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5. TLS (Let's Encrypt). Допишет 443-блок и HTTP→HTTPS редирект в конфиг.
certbot --nginx -d assestment.eltera-company.ru \
        --non-interactive --agree-tos -m knyazeff17@gmail.com --redirect

# 6. Первый деплой
bash /opt/eltera-assessment/deploy/deploy.sh
```

> После `certbot` в `/etc/nginx/sites-available/eltera` появляется управляемый
> Certbot-ом TLS-блок. Не перезаписывайте файл целиком копией из репозитория —
> потеряете сертификатные строки. Правьте точечно и делайте `systemctl reload nginx`.

## Полезное

```bash
# Логи
docker compose -f deploy/docker-compose.yml logs api --tail 100 -f
# Статус
docker compose -f deploy/docker-compose.yml ps
# Ручная миграция/сид
docker compose -f deploy/docker-compose.yml exec -T api python -m alembic upgrade head
docker compose -f deploy/docker-compose.yml exec -T api python -m app.seed
# Обновление TLS (крон certbot делает сам)
certbot renew --dry-run
```

Сид-пользователь: `recruiter@eltera.ai` (вход по коду на email, пароля нет).
