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

def _sender_line(ticket: SupportTicket) -> str | None:
    """Строка «От:» из имени и email отправителя (email — из регистрации)."""
    esc = html.escape
    bits = []
    if ticket.from_name:
        bits.append(esc(ticket.from_name.strip()))
    if ticket.from_email:
        bits.append(esc(ticket.from_email.strip()))
    return f"<b>От:</b> {' · '.join(bits)}" if bits else None


def _build_urgent(subject: str, description: str, sender: str | None) -> str:
    """Срочная заявка: «алертовый» формат — кричащий заголовок, акцент на немедленном действии."""
    lines = [
        "🚨🚨 <b>СРОЧНАЯ ЗАЯВКА</b> 🚨🚨",
        "━━━━━━━━━━━━━━━━━━",
        f"⚠️ <b>Проблема:</b> {subject}",
        "🔴 <b>Приоритет:</b> ВЫСОКИЙ",
        "⏱ <b>SLA:</b> реакция в течение суток",
    ]
    if sender:
        lines.append(f"👤 {sender}")
    lines += [
        "",
        f"<b>Что произошло:</b>\n{description}",
        "",
        "❗️ <b>Требуется немедленное внимание дежурной команды.</b>",
    ]
    return "\n".join(lines)


def _build_normal(subject: str, description: str, sender: str | None) -> str:
    """Обычная заявка: спокойный деловой формат — вопрос в очередь поддержки."""
    lines = [
        "📩 <b>Вопрос по сервису</b>",
        "",
        f"<b>Тема:</b> {subject}",
        "<b>Приоритет:</b> обычный",
        "<b>SLA:</b> в рабочем порядке",
    ]
    if sender:
        lines.append(sender)
    lines += [
        "",
        f"<b>Описание:</b>\n{description}",
        "",
        "<i>Заявка добавлена в очередь поддержки.</i>",
    ]
    return "\n".join(lines)


def _build_idea(subject: str, description: str, sender: str | None) -> str:
    """Предложение: продуктовый формат — идея в backlog, дружелюбный тон."""
    lines = [
        "💡 <b>Предложение по улучшению</b>",
        "",
        f"✨ <b>Суть идеи:</b> {subject}",
        "🟢 <b>Приоритет:</b> низкий",
        "📅 <b>Срок рассмотрения:</b> 1–30 рабочих дней",
    ]
    if sender:
        lines.append(f"🙋 {sender}")
    lines += [
        "",
        f"<b>Подробности:</b>\n{description}",
        "",
        "<i>Идея отправлена в продуктовый backlog. Спасибо за обратную связь! 🙌</i>",
    ]
    return "\n".join(lines)


# Каждому типу — свой билдер сообщения (своя структура и подача).
TYPE_BUILDERS = {
    "urgent": _build_urgent,
    "normal": _build_normal,
    "idea": _build_idea,
}


def build_message(ticket: SupportTicket) -> str:
    """Собирает HTML-сообщение для Telegram по своему шаблону под каждый тип обращения."""
    esc = html.escape
    subject = esc(ticket.subject.strip()) or "—"
    description = esc(ticket.description.strip()) or "—"
    sender = _sender_line(ticket)
    builder = TYPE_BUILDERS.get(ticket.type, _build_normal)
    return builder(subject, description, sender)


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
