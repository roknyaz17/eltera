# Реализация вкладки «Вакансии» (HeadHunter)

Документ фиксирует реализацию по ТЗ [vacancies-hh-spec.md](vacancies-hh-spec.md):
схему данных, API, формулы и правила видимости. Источник истины — PostgreSQL,
наполняемый импортом и синхронизацией HH. Демо/seed-данные на вкладке не
используются: при отсутствии данных показывается честное пустое состояние.

## 1. Схема данных

Существующие таблицы: `hh_connections` (подключение на организацию),
`vacancies`, `users`, `organizations`, таблицы кандидатов/оценок.

### Расширение `vacancies`
- `added_by_user_id` → `users.id` (SET NULL) — кто импортировал/выбрал вакансию.
- `first_response_at` (timestamptz) — момент первого отклика (для «времени до отклика»).
- `closed_at` (date) — дата закрытия (для «закрыт за период»).
- Уникальный индекс `uq_vacancies_org_source_external` на
  `(organization_id, source, external_id)` — защита от дублей импорта. У ручных
  вакансий `external_id IS NULL`, поэтому под уникальность они не попадают.

### Новые таблицы (миграция `e7f2a1b9c3d5`)
- **`hh_vacancy_selections`** — персональная видимость: `(vacancy_id, user_id)`
  уникальна. Кто добавил вакансию в свой список.
- **`hh_vacancy_snapshots`** — снимок счётчиков на день: `(vacancy_id, captured_on)`
  уникален. Поля: `responses_total`, `new_responses`, `suitable_total`, `status`.
  Основа метрик за период.
- **`hh_response_events`** — события во времени: `event_type` (`response` /
  `status_change` / `closed`), `external_id` (negotiation id HH), `state`,
  `candidate_*`, `occurred_at`. Дедуп по `(vacancy_id, external_id, event_type)`.
- **`hh_candidate_links`** — связь HH-отклика с локальным кандидатом и оценкой:
  `person_id`, `resume_id`, `is_fit`, `score`. База метрики «Подходит под профиль».

Все таблицы несут `organization_id`; все выборки фильтруются по нему.

## 2. Правила расчётов (зафиксированы в `services/vacancies.py`)

- **Подходящие (числитель конверсии):** HH-кандидаты этой вакансии, принятые на
  работу — `candidate_profiles.source='hh' AND vacancy_id=… AND stage='accepted'`.
  То есть «пришёл с hh → переведён в кандидаты → принят».
- **Конверсия:** `conversion = suitable / responses_period * 100` (округление до 0.1).
  Единая формула для карточек и таблицы. Пороги: низкая `< 10%`, хорошая `>= 30%`
  (`CONVERSION_LOW`, `CONVERSION_GOOD`).
- **Отклики за период:** дельта по снимкам — `latest.responses_total − baseline`,
  где `baseline` — последний снимок строго до начала окна (иначе 0). Так период
  7/14/30 считается по истории, а не по текущему состоянию.
- **Подходит под профиль:** только `hh_candidate_links.is_fit = true` (реальные
  HH-кандидаты), за период — по `created_at`.
- **Оценок отправлено:** `count(assessment_links)` с `vacancy_id` за период
  (`created_at >= window_start`).
- **Закрыт за период:** `status = closed` и `closed_at` попадает в окно.
- **Воронка подбора (по каждой вакансии):** `GET /vacancies/{id}/funnel?period=` →
  6 шагов за период, каждый режется по своему timestamp (периоды 7/14/30 честные):
  1) Отклики (`responses_period`), 2) Оценка отправлена (`assessment_links.created_at`),
  3) Прошли оценку (`assessment_sessions` со статусом submitted/scored/reviewed по
  `submitted_at`), 4) Подходят, 5) Интервью, 6) Приняты. Шаги 4–6 берутся из
  `candidate_stage_events` (история переходов стадий, distinct по `person_id`), а не
  из текущего `candidate_profiles.stage` — иначе «за период» посчитать нельзя.
  «Подходят» = переходы в `fit` или `conditional`. См. `services.vacancies.vacancy_funnel`.
  В списке карточек воронка отдаётся **инлайн** в `/vacancies/kpi` (поле `funnel` у
  каждой вакансии) — батчем `attach_funnels`: +4 групповых запроса на весь список,
  а не запрос-на-карточку. Отдельный `/funnel` остаётся для точечного запроса.

### candidate_stage_events (история воронки кандидата)

`CandidateProfile` хранит только ТЕКУЩУЮ стадию. Для воронки «за период» нужна история
переходов с отметкой времени — её ведёт таблица `candidate_stage_events`
(`from_stage → to_stage`, `vacancy_id` на момент перехода, `created_at`). Запись идёт
через `crud.candidate._record_stage_change` во всех точках смены стадии: создание
кандидата, `update_candidate` (в т.ч. меню «три точки» в UI), авто-продвижение в
`record_result`. Миграция `b9e3d7f2a1c4` создаёт таблицу и **бэкафиллит** стартовое
событие (`NULL → current_stage`, дата = `applied_at`/`created_at`) на каждый
существующий профиль, чтобы воронка не начиналась с нуля.

## 3. Видимость (изоляция)

`visible_vacancies_stmt(user)`:
- всегда `vacancies.organization_id = user.organization_id`;
- `admin` — все вакансии организации;
- `recruiter` / `manager` — только `added_by_user_id = user.id` или вакансии из
  его `hh_vacancy_selections`.

Подключение HH (`hh.get_connection`) разрешается по организации текущего
пользователя из JWT-контекста (`get_current_org`), а не по «первой» организации.

## 4. Период 7 / 14 / 30

`parse_period('7d'|'14d'|'30d') → days`, дефолт `7d`. Период приходит query-
параметром во все endpoint'ы метрик и влияет на KPI, таблицу, drill-down и отклики.

## 5. API (`/api/vacancies`, все под auth)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/vacancies?period=&status=&source=` | список вакансий с метриками за период |
| GET | `/vacancies/kpi?period=` | KPI-карточки + метрики всех вакансий |
| GET | `/vacancies/kpi/{card}?period=` | drill-down список по карточке |
| POST | `/vacancies/import/hh` | импорт выбранных вакансий (`{external_ids:[]}`) |
| POST | `/vacancies/sync/hh` | синхронизация HH-вакансий организации |
| GET | `/vacancies/{id}/metrics?period=` | метрики одной вакансии |
| GET | `/vacancies/{id}/responses?period=` | отклики (события) за период |
| GET | `/vacancies/{id}/candidates?fit=` | кандидаты вакансии (опц. только подходящие) |
| GET | `/vacancies/tests` | тесты для назначения (candidate/universal, до 500) |
| PATCH | `/vacancies/{id}/default-test` | тест по умолчанию для вакансии (`{test_id}`) |
| POST | `/vacancies/{id}/responses/{event_id}/convert` | перевод отклика в кандидата (`{test_id?}`) |

### Перевод отклика → кандидат (3 эффекта одной операции)

`POST /vacancies/{id}/responses/{event_id}/convert` за один вызов:
1. создаёт **кандидата** (Person + CandidateProfile, `source=hh`, привязка к
   вакансии, ответственный = текущий пользователь, стадия `assessment_sent`) —
   появляется на вкладке «Кандидаты»;
2. назначает **тест** (выбранный → дефолтный у вакансии → первый кандидатский) и
   создаёт `AssessmentLink`;
3. отправляет **ссылку на тест в чат HH** (`POST /negotiations/{nid}/messages`,
   best-effort; `chat_sent` в ответе показывает успех).

Связь фиксируется в `hh_candidate_links` (повторная конвертация того же отклика
блокируется). Тест по умолчанию хранится в `vacancies.default_test_id` и
подставляется предвыбранным; рекрутёр может сменить его при конвертации.

Карточки (`card`): `active_no_responses`, `low_conversion`, `good_conversion`,
`total_responses`, `assessments_sent`, `fit_profile`, `closed_in_period`.

Существующие HH-endpoint'ы (`/api/hh/status|connect|callback|disconnect|vacancies`)
сохранены: OAuth-флоу и чтение активных вакансий кабинета.

## 6. Frontend

- Не подключён HH → честное пустое состояние + кнопка «Подключить hh.ru».
- Подключён → реальные KPI из `/vacancies/kpi`, переключатель периода 7/14/30,
  кликабельные карточки (drill-down модалка), таблица эффективности.
- Модалка «Добавить из HeadHunter»: список активных вакансий кабинета, поиск по
  названию, мультивыбор, `POST /vacancies/import/hh`. Дубли не создаются.
- «Обновить из hh.ru» → `POST /vacancies/sync/hh` + перезагрузка метрик.

## 7. Безопасность

- OAuth и токены — только на backend (`hh_connections`), фронту не отдаются.
- `state` обязателен и одноразовый (обнуляется после callback).
- Все запросы изолированы по организации; при роли ниже admin — и по пользователю.
- Ошибки HH логируются без секретов; синхронизация откликов best-effort
  (отказ HH не роняет страницу).

## 8. Известные ограничения / следующие шаги

- `hh_candidate_links` (и `is_fit`) пока не наполняются автоматически: связывание
  HH-откликов с локальными кандидатами и их оценками — отдельный пайплайн.
  До его реализации «Подходит под профиль» = 0 (честный ноль, не демо).
- Снимки/события пишутся при импорте и ручной синхронизации; фоновая
  периодическая актуализация (cron/APScheduler) — рекомендованный следующий шаг.
- Отклики тянутся по ВСЕМ стадиям воронки работодателя HH: обходим коллекции
  `/negotiations/{state}` (`response`, `consider`, `phone_interview`,
  `assessment`, `interview`, `offer`, `hired`, `discard_*`). У каждого отклика
  сохраняется текущая стадия (`employer_state` → `hh_response_events.state`),
  при повторной синхронизации стадия обновляется. В UI отклика стадия
  показывается цветным бейджем. `per_page` у списков работодателя ограничен 50.
