"""Настройки приложения, читаются из переменных окружения / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Eltera Candidates API"
    debug: bool = True

    # Async-драйвер обязателен: sqlite+aiosqlite или postgresql+asyncpg
    database_url: str = "sqlite+aiosqlite:///./candidates.db"

    # Разрешённые источники для CORS
    cors_origins: list[str] = ["*"]

    api_prefix: str = "/api"

    # JWT-аутентификация. В проде ОБЯЗАТЕЛЬНО задать JWT_SECRET в окружении.
    jwt_secret: str = "dev-insecure-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_min: int = 30        # время жизни access-токена, минут
    refresh_token_ttl_days: int = 30      # время жизни refresh-токена, дней

    # Отдельная админ-панель (управление профилями/направлениями/компетенциями).
    # Вход по одному спец-логину/паролю, не связан с аккаунтами организаций.
    # Пока ADMIN_PANEL_PASSWORD не задан — вход в панель запрещён.
    admin_panel_user: str = "admin"
    admin_panel_password: str | None = None
    admin_panel_token_ttl_hours: int = 8  # время жизни токена панели, часов

    # Глобальный выключатель ИИ. False — ИИ не вызывается вообще
    # (детерминированный fallback / «Доделать»), даже если задан ключ.
    ai_enabled: bool = True

    # AI (OpenAI-совместимый провайдер): оценка открытых ответов и генерация
    # нарратива отчёта. Если ключ не задан — детерминированный fallback / «Доделать».
    openai_api_key: str | None = None
    ai_model: str = "gpt-4o-mini"

    # Базовый URL OpenAI-совместимого API. Для Timeweb Cloud AI (агент DeepSeek)
    # укажите эндпоинт агента, например:
    # https://agent.timeweb.cloud/api/v1/cloud-ai/agents/<agent-id>/v1
    # Пусто/None — используется стандартный api.openai.com.
    openai_base_url: str | None = None

    # Цены модели для расчёта себестоимости вызовов ИИ (USD за 1M токенов) и курс
    # ₽/$. Используются только для метрики eltera_ai_cost_rub_total. Дефолты — под
    # gpt-4o-mini; при смене модели/провайдера переопределите через .env.
    ai_price_input_usd_per_1m: float = 0.15
    ai_price_output_usd_per_1m: float = 0.60
    usd_rub_rate: float = 90.0

    # Telegram-бот для уведомлений из раздела «Поддержка».
    # TELEGRAM_BOT_TOKEN — токен бота от @BotFather.
    # TELEGRAM_CHAT_ID — id чата/канала/группы, куда падают обращения
    # (для группы — отрицательное число, можно узнать через @getidsbot).
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None

    # SMTP для писем-приглашений (оценки, адаптация, 360, отчёты).
    # Если smtp_host/smtp_from не заданы — письма не уходят (пишем в лог).
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None        # адрес отправителя, напр. "Eltera <hr@company.ru>"
    smtp_tls: bool = True               # STARTTLS (для 465 поставьте smtp_ssl=true)
    smtp_ssl: bool = False              # прямой SSL (порт 465)

    # Публичный адрес фронтенда — из него собираются ссылки в письмах:
    # {app_public_url}/#/assess/{token}
    app_public_url: str = "http://localhost:4173"

    # Куда слать HR-уведомления (оценка пройдена / отчёт готов).
    # Если не задано — используется smtp_from.
    hr_notify_email: str | None = None
    # Слать ли welcome-письмо сотрудникам при импорте.
    welcome_email_on_import: bool = True

    # HeadHunter OAuth (интеграция вкладки «Вакансии»). Приложение регистрируется
    # на dev.hh.ru/admin. Без client_id/secret кнопка «Подключить hh.ru» неактивна.
    hh_client_id: str | None = None
    hh_client_secret: str | None = None
    # Должен ТОЧНО совпадать с Redirect URI, прописанным в приложении HH.
    hh_redirect_uri: str = "http://localhost:8000/api/hh/callback"
    # HH требует осмысленный User-Agent: "AppName/version (contact-email)".
    hh_user_agent: str = "Eltera/1.0 (eltera_assestment@eltera-company.ru)"

    # ── Платёжный провайдер MONETA.RU / PayAnyWay (пополнение баланса оценок) ──
    # MONETA_ACCOUNT_ID — номер расширенного счёта магазина (MNT_ID).
    # MONETA_INTEGRITY_CODE — «код проверки целостности данных» из настроек
    # магазина: секрет, которым подписываются запрос и уведомления (НИКОГДА не
    # отдаём на фронт). Без account_id+integrity_code оплата работает в
    # демо-режиме (имитация без реального провайдера).
    moneta_account_id: str | None = None
    moneta_integrity_code: str | None = None
    # Тестовый режим: списания/зачисления не происходят на стороне Монеты
    # (MNT_TEST_MODE=1). По умолчанию True — переключить в проде на False.
    moneta_test_mode: bool = True
    # URL платёжной формы MONETA.Assistant. Боевой: payanyway.ru, демо: demo.moneta.ru.
    moneta_assistant_url: str = "https://www.payanyway.ru/assistant.htm"
    moneta_currency: str = "RUB"
    # Публичный базовый URL бэкенда — из него Монета строит адрес webhook
    # (Pay URL / Check URL прописываются в кабинете магазина):
    #   {moneta_public_url}/api/billing/moneta/callback
    moneta_public_url: str = "http://localhost:8000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
