"""Отправка обращений из раздела «Поддержка» в Telegram через бота.

Сообщение различается по типу обращения (срочное / обычное / предложение):
у каждого свой заголовок, приоритет и SLA.
"""
import html
import logging

import httpx

from app.core.config import get_settings
from app.schemas.support import SupportResult, SupportTicket

logger = logging.getLogger("eltera.support")

# Метаданные по типу обращения: эмодзи, заголовок, приоритет, SLA.
TYPE_META: dict[str, dict[str, str]] = {
    "urgent": {
        "emoji": "🚨",
        "title": "СРОЧНАЯ ЗАЯВКА",
        "priority": "Высокий",
        "sla": "в течение суток",
        "footer": "❗️ Требует немедленного внимания дежурной команды.",
    },
    "normal": {
        "emoji": "📩",
        "title": "Вопрос по сервису",
        "priority": "Обычный",
        "sla": "в рабочем порядке",
        "footer": "Заявка попадёт в очередь поддержки.",
    },
    "idea": {
        "emoji": "💡",
        "title": "Предложение по улучшению",
        "priority": "Низкий",
        "sla": "1–30 рабочих дней",
        "footer": "Идея уйдёт в продуктовый backlog.",
    },
}


def build_message(ticket: SupportTicket) -> str:
    """Собирает HTML-сообщение для Telegram в зависимости от типа обращения."""
    meta = TYPE_META.get(ticket.type, TYPE_META["normal"])
    esc = html.escape
    subject = esc(ticket.subject.strip()) or "—"
    description = esc(ticket.description.strip()) or "—"

    lines = [
        f"{meta['emoji']} <b>{meta['title']}</b>",
        "",
        f"<b>Тема:</b> {subject}",
        f"<b>Приоритет:</b> {meta['priority']}",
        f"<b>SLA:</b> {meta['sla']}",
    ]
    sender_bits = []
    if ticket.from_name:
        sender_bits.append(esc(ticket.from_name.strip()))
    if ticket.from_email:
        sender_bits.append(esc(ticket.from_email.strip()))
    if sender_bits:
        lines.append(f"<b>От:</b> {' · '.join(sender_bits)}")
    lines += [
        "",
        f"<b>Описание:</b>\n{description}",
        "",
        f"<i>{meta['footer']}</i>",
    ]
    return "\n".join(lines)


async def send_ticket(ticket: SupportTicket) -> SupportResult:
    """Отправляет обращение в Telegram. Если бот не настроен — ok=True, sent=False."""
    settings = get_settings()
    token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    text = build_message(ticket)

    if not token or not chat_id:
        logger.warning("Telegram не настроен (нет токена/chat_id) — обращение не отправлено")
        return SupportResult(
            ok=True,
            sent=False,
            detail="Обращение принято, но Telegram-бот не настроен на сервере.",
        )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code == 200 and resp.json().get("ok"):
            return SupportResult(ok=True, sent=True, detail="Обращение отправлено в Telegram.")
        logger.error("Telegram API ответил %s: %s", resp.status_code, resp.text)
        return SupportResult(ok=False, sent=False, detail="Telegram отклонил сообщение.")
    except Exception:  # noqa: BLE001 — не роняем эндпоинт из-за сети
        logger.exception("Не удалось отправить обращение в Telegram")
        return SupportResult(ok=False, sent=False, detail="Не удалось связаться с Telegram.")
