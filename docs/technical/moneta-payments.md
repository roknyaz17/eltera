# Пополнение баланса через MONETA.RU (PayAnyWay)

Пополнение баланса оценок организации через провайдера **MONETA.Assistant**.
Баланс — серверный (леджер), деньги зачисляются только по проверенному
уведомлению об оплате. Документация провайдера: https://docs.moneta.ru/

## Архитектура

```
Фронт (Пополнить)
  └─ POST /api/billing/topup {pack, promo_code}
        → создаёт Payment(status=pending), считает сумму НА СЕРВЕРЕ
        → возвращает redirect_url на форму MONETA.Assistant (или null в демо)
  └─ window.location → форма Монеты (карта / СБП), оплата
        → success/fail/return URL → #/app/settings?pay=...&order=ID
  └─ handlePaymentReturn() опрашивает GET /api/billing/payments/{id}

Монета (сервер-сервер)
  └─ POST /api/billing/moneta/callback   (Pay URL / Check URL в кабинете)
        CHECK → XML с MNT_RESULT_CODE (402 готов / 200 оплачен / 500 нет)
        PAY   → проверка подписи + суммы → зачисление пакета → SUCCESS
```

Зачисление идёт **только** в обработчике PAY и **идемпотентно**: повторное
уведомление по оплаченному заказу отвечает `SUCCESS`, но баланс не меняет.

## Конфигурация (`.env`)

| Переменная | Назначение |
|---|---|
| `MONETA_ACCOUNT_ID` | MNT_ID — номер расширенного счёта магазина |
| `MONETA_INTEGRITY_CODE` | «Код проверки целостности данных» (секрет подписи) |
| `MONETA_TEST_MODE` | `true` — без реальных списаний (MNT_TEST_MODE=1) |
| `MONETA_ASSISTANT_URL` | `https://www.payanyway.ru/assistant.htm` (демо: `https://demo.moneta.ru/assistant.htm`) |
| `MONETA_CURRENCY` | `RUB` |
| `MONETA_PUBLIC_URL` | публичный адрес бэкенда для webhook |

Без `MONETA_ACCOUNT_ID`/`MONETA_INTEGRITY_CODE` — **демо-режим**: `redirect_url`
не выдаётся, оплата подтверждается имитацией (`/simulate`, доступно только в
тестовом/недонастроенном режиме).

В кабинете магазина пропишите **Pay URL** и **Check URL**:
`{MONETA_PUBLIC_URL}/api/billing/moneta/callback`

## Подписи (MD5, КОД = код проверки целостности данных)

```
запрос на оплату  MD5(MNT_ID + MNT_TRANSACTION_ID + MNT_AMOUNT + MNT_CURRENCY_CODE
                     + MNT_SUBSCRIBER_ID + MNT_TEST_MODE + КОД)
PAY-уведомление   MD5(MNT_ID + MNT_TRANSACTION_ID + MNT_OPERATION_ID + MNT_AMOUNT
                     + MNT_CURRENCY_CODE + MNT_SUBSCRIBER_ID + MNT_TEST_MODE + КОД)
CHECK             MD5(MNT_COMMAND + … те же поля … + КОД)
ответ магазина    MD5(MNT_RESULT_CODE + MNT_ID + MNT_TRANSACTION_ID + КОД)
```

Сумма — строкой с двумя знаками после точки; отсутствующие поля = пустая строка;
порядок полей менять нельзя. Реализация: `app/services/moneta.py`.

## Безопасность и устойчивость

- **Цена считается только на сервере** (клиент шлёт лишь номер пакета и промокод);
  подделать сумму нельзя — она сверяется в PAY с подписанной при создании заказа.
- **Подпись уведомления** проверяется `hmac.compare_digest` (constant-time);
  невалидная подпись → `FAIL` / XML 500, баланс не трогаем.
- **Идемпотентность**: статус заказа + `UNIQUE(operation_id)` исключают повторное
  зачисление. Монета повторяет уведомления до 24 ч — повторы безопасны.
- **Изоляция по организации**: все выборки и зачисления привязаны к `organization_id`.
- **Секрет** (`MONETA_INTEGRITY_CODE`) никогда не покидает бэкенд.
- **Реферальный бонус** (10% пригласившему) начисляется в обработчике PAY и не
  может уронить оплату (ошибки начисления логируются, но не откатывают платёж).

## Эндпоинты

| Метод | Путь | Авторизация | Назначение |
|---|---|---|---|
| GET | `/api/billing` | да | баланс, каталог пакетов, история платежей |
| POST | `/api/billing/topup` | да | создать платёж на пакет оценок, получить ссылку на оплату |
| POST | `/api/billing/tariff` | да | создать платёж на смену тарифа (сумма/токены — с сервера) |
| GET | `/api/billing/payments/{id}` | да | статус платежа (поллинг) |
| POST | `/api/billing/payments/{id}/cancel` | да | отменить ожидающий платёж |
| POST | `/api/billing/payments/{id}/simulate` | да | демо/тест: подтвердить без провайдера |
| POST | `/api/billing/debit` | да | списать оценки при отправке приглашения |
| GET·POST | `/api/billing/moneta/callback` | нет (подпись) | webhook CHECK / PAY |

## Данные

- `payments` — заказы (pending/paid/failed/canceled), `operation_id` уникален.
- `balance_entries` — знаковый леджер баланса оценок; баланс = сумма `amount`.

Миграция: `alembic/versions/20260625_c3e9a7b1d2f4_billing_moneta.py`.
