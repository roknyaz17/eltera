# Eltera — бэкенд вкладки «Кандидаты»

Backend для вкладки **«Кандидаты»** платформы Eltera.
Стек: **FastAPI** + асинхронный **SQLAlchemy 2.0** + **Alembic**.

> Полная схема БД (19+ таблиц) описана в [docs/DATABASE.md](docs/DATABASE.md):
> люди + профили, тесты с версионированием, сессии оценки, AI-скоринг.
> API реализован пока для вкладки **«Кандидаты»** (этап 1).

## Структура

```
backend/
├── app/
│   ├── main.py              # точка входа FastAPI, CORS, роутеры
│   ├── core/
│   │   ├── config.py        # настройки из .env (Pydantic Settings)
│   │   └── database.py      # async engine, сессии, Base
│   ├── models/              # ORM-модели по слоям
│   │   ├── enums.py         # доменные перечисления
│   │   ├── base.py          # id/timestamp-хелперы
│   │   ├── organization.py  # Organization, User
│   │   ├── catalog.py       # Competency, Department, Vacancy
│   │   ├── test.py          # Test/TestVersion/Question/.. (версионирование)
│   │   ├── person.py        # Person + CandidateProfile + EmployeeProfile
│   │   └── assessment.py    # Link, Session, Answer, AiScoringJob
│   ├── schemas/candidate.py # Pydantic-схемы вкладки «Кандидаты»
│   ├── crud/candidate.py    # запросы (последняя сессия, фильтры, статистика)
│   ├── services/scoring.py  # правила рекомендаций
│   ├── api/routes/          # эндпоинты /api/candidates
│   └── seed.py              # демо-данные (полный граф)
├── alembic/                 # миграции (async env.py)
├── docs/DATABASE.md         # описание схемы БД
├── alembic.ini
├── requirements.txt
└── .env.example
```

## Запуск

```powershell
cd backend

# 1. Виртуальное окружение
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Зависимости
pip install -r requirements.txt

# 3. Настройки (по умолчанию SQLite — без установки СУБД)
copy .env.example .env

# 4. Миграции
alembic upgrade head

# 5. Демо-данные (необязательно)
python -m app.seed

# 6. Запуск сервера
uvicorn app.main:app --reload
```

Документация API: <http://localhost:8000/docs>

## База данных

По умолчанию — **SQLite** (`candidates.db`), работает «из коробки».
Для **PostgreSQL** укажите в `.env`:

```
DATABASE_URL=postgresql+asyncpg://eltera:eltera@localhost:5432/eltera
```

После смены БД повторите `alembic upgrade head`.

## Эндпоинты

| Метод  | Путь                         | Описание                              |
|--------|------------------------------|---------------------------------------|
| GET    | `/api/candidates`            | Список (фильтры, поиск, пагинация, сортировка) |
| GET    | `/api/candidates/stats`      | KPI, распределения, по вакансиям, «требуют внимания» |
| GET    | `/api/candidates/heatmap`    | Тепловая карта: вакансии × источники   |
| GET    | `/api/candidates/{id}`       | Карточка кандидата с компетенциями     |
| POST   | `/api/candidates`            | Добавить кандидата                     |
| PATCH  | `/api/candidates/{id}`       | Частичное обновление                   |
| DELETE | `/api/candidates/{id}`       | Удалить                                |
| GET    | `/api/tests`                 | Список тестов (для выбора при создании ссылки) |
| POST   | `/api/links`                 | Создать ссылку-приглашение на тест     |
| GET    | `/api/assess/{token}`        | Получить тест по токену (без баллов)   |
| POST   | `/api/assess/{token}/submit` | Отправить ответы → подсчёт + AI-оценка |
| GET    | `/health`                    | Проверка работоспособности             |

### Поток прохождения теста

```
POST /api/candidates                 → завели кандидата
POST /api/links {test_id, person_id} → получили token (ссылка)
GET  /api/assess/{token}             → кандидат видит вопросы (без баллов)
POST /api/assess/{token}/submit      → ответы оцениваются:
        single/multiple/scale — по баллам вариантов сразу,
        open — через AI (Anthropic или fallback),
   создаётся assessment_session + ответы + баллы по компетенциям,
   ссылка закрывается, кандидат двигается по воронке (fit/conditional/not_fit).
```

Демо-тест **«Оператор call-центра»** — 10 вопросов всех 4 типов
(`single_choice`, `multiple_choice`, `open`, `scale`), создаётся сидом.

### AI-оценка открытых ответов

Открытые ответы (и нарратив PDF-отчёта) генерирует модель OpenAI, если задан
`OPENAI_API_KEY` в `.env` (`AI_MODEL` — выбор модели, по умолчанию `gpt-4o-mini`).
Без ключа используется детерминированный fallback,
поэтому поток работает и без внешних вызовов.

Кандидат = `Person` + `CandidateProfile`; результат оценки берётся из последней
`assessment_session` этого человека (тип `candidate`). В списке отдаётся сводка,
в карточке `/{id}` — ещё и баллы по компетенциям.

### Параметры `GET /api/candidates`

`page`, `size`, `sort_by` (`full_name|percent|stage|created_at`),
`order` (`asc|desc`), `search` (имя/email), `vacancy_id`, `source`, `stage`
(`new|assessment_sent|in_progress|interview|fit|conditional|not_fit|accepted|stuck`),
`city`, `selection_type`, `responsible_user_id`, `min_percent`, `max_percent`.

### Создание миграций

```powershell
alembic revision --autogenerate -m "описание"
alembic upgrade head
```
