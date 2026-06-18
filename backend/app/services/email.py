"""Отправка писем-приглашений (оценки, адаптация, 360, отчёты).

SMTP через stdlib (smtplib) в отдельном потоке, чтобы не блокировать event loop.
Если SMTP не настроен — письмо не уходит, пишем в лог (как с Telegram).
Шаблон письма выбирается по категории теста и роли получателя.
"""
from __future__ import annotations

import asyncio
import html
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger("eltera.email")


def is_configured() -> bool:
    s = get_settings()
    return bool(s.smtp_host and s.smtp_from)


def _assess_url(token: str) -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/#/assess/{token}"


def _send_sync(to: str, subject: str, html_body: str, text_body: str) -> bool:
    s = get_settings()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = s.smtp_from
    msg["To"] = to
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    try:
        if s.smtp_ssl:
            with smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=15) as srv:
                if s.smtp_user:
                    srv.login(s.smtp_user, s.smtp_password or "")
                srv.send_message(msg)
        else:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as srv:
                if s.smtp_tls:
                    srv.starttls()
                if s.smtp_user:
                    srv.login(s.smtp_user, s.smtp_password or "")
                srv.send_message(msg)
        return True
    except Exception:  # noqa: BLE001 — письмо не должно ронять бизнес-логику
        logger.exception("Не удалось отправить письмо на %s", to)
        return False


async def send_email(to: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Отправляет письмо. Возвращает True, если ушло; False — если SMTP не настроен/ошибка."""
    if not to:
        return False
    if not is_configured():
        logger.warning("SMTP не настроен — письмо «%s» для %s не отправлено", subject, to)
        return False
    return await asyncio.to_thread(_send_sync, to, subject, html_body, text_body or _strip(html_body))


def _strip(s: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", s).strip()


# ─────────────────────────── Шаблоны писем ───────────────────────────

_BRAND = "Eltera"
_ACCENT = "#1E5BFF"


def _wrap(title: str, intro: str, button_label: str, url: str, footer: str) -> str:
    """Минималистичный брендовый HTML-шаблон письма."""
    return f"""\
<div style="background:#0A0F1E;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#111A33;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08)">
    <div style="padding:22px 28px;border-bottom:1px solid rgba(255,255,255,.08)">
      <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px">{_BRAND}</span>
      <span style="color:#8899BB;font-size:12px;margin-left:8px">Assessment Intelligence</span>
    </div>
    <div style="padding:28px">
      <h1 style="color:#E6F2FF;font-size:20px;margin:0 0 14px">{title}</h1>
      <p style="color:#C7D2E8;font-size:14px;line-height:1.6;margin:0 0 24px">{intro}</p>
      <a href="{url}" style="display:inline-block;background:{_ACCENT};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 26px;border-radius:9px">{button_label}</a>
      <p style="color:#6C7A99;font-size:12px;line-height:1.6;margin:24px 0 0">
        Если кнопка не открывается, скопируйте ссылку:<br>
        <a href="{url}" style="color:#7EB3FF;word-break:break-all">{url}</a>
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.08);color:#6C7A99;font-size:11px">{footer}</div>
  </div>
</div>"""


_ROLE_TITLES = {
    "self": "Самооценка 360°",
    "manager": "Оценка 360°: ваш подчинённый",
    "peer": "Оценка 360°: ваш коллега",
    "report": "Оценка 360°: ваш руководитель",
}


def build_invite(
    *, full_name: str | None, test_title: str, category: str | None,
    recipient_type: str, rater_role: str | None, subject_name: str | None, token: str,
) -> tuple[str, str]:
    """Возвращает (subject, html) под контекст оценки."""
    url = _assess_url(token)
    name = html.escape((full_name or "").split(" ")[1] if full_name and len(full_name.split(" ")) > 1 else (full_name or ""))
    greeting = f"Здравствуйте, {name}!" if name else "Здравствуйте!"
    cat = (category or "").lower()

    if cat.startswith("адаптац"):
        subject = f"{_BRAND}: опрос адаптации — «{test_title}»"
        intro = (f"{greeting} Поделитесь, как проходит ваш период адаптации. "
                 f"Это короткий опрос «{html.escape(test_title)}» — займёт пару минут "
                 f"и поможет команде вовремя поддержать вас.")
        return subject, _wrap("Как проходит адаптация?", intro, "Пройти опрос", url,
                              "Опрос конфиденциален и важен для улучшения процесса адаптации.")

    if cat == "360" or rater_role:
        role = rater_role or "peer"
        title = _ROLE_TITLES.get(role, "Оценка 360°")
        if role == "self":
            intro = f"{greeting} Вам предложена самооценка по методике 360°. Оцените себя честно — это основа для сравнения с обратной связью коллег."
        else:
            who = f" {html.escape(subject_name)}" if subject_name else " коллегу"
            intro = f"{greeting} Вас попросили дать обратную связь по методике 360° на{who}. Ответы анонимны и агрегируются в сводный отчёт."
        subject = f"{_BRAND}: {title}"
        return subject, _wrap(title, intro, "Дать оценку", url, "Оценка 360° анонимна для оцениваемого.")

    if recipient_type == "employee":
        subject = f"{_BRAND}: вам назначена оценка — «{test_title}»"
        intro = f"{greeting} Вам назначена оценка «{html.escape(test_title)}». Пройдите её в удобное время — результат увидит только HR и ваш руководитель."
        return subject, _wrap("Назначена оценка", intro, "Пройти оценку", url,
                              "Результаты используются для развития и не передаются третьим лицам.")

    # Кандидат
    subject = f"{_BRAND}: приглашение пройти оценку — «{test_title}»"
    intro = f"{greeting} Благодарим за интерес к вакансии. Пожалуйста, пройдите оценку «{html.escape(test_title)}» — это поможет нам принять решение быстрее."
    return subject, _wrap("Приглашение на оценку", intro, "Пройти оценку", url,
                          "Если вы не откликались на вакансию, просто проигнорируйте это письмо.")


async def send_invite(*, to: str, full_name: str | None, test_title: str, category: str | None,
                      recipient_type: str, rater_role: str | None, subject_name: str | None,
                      token: str) -> bool:
    if not to:
        return False
    subject, body = build_invite(
        full_name=full_name, test_title=test_title, category=category,
        recipient_type=recipient_type, rater_role=rater_role,
        subject_name=subject_name, token=token,
    )
    return await send_email(to, subject, body)


def _app_url(path: str = "") -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/{path.lstrip('/')}" if path else base


def hr_recipient() -> str | None:
    s = get_settings()
    return s.hr_notify_email or s.smtp_from


async def send_report_ready(*, full_name: str, recipient_type: str, test_title: str,
                            percent: int, view: str) -> bool:
    """Письмо HR: человек завершил оценку, отчёт готов."""
    to = hr_recipient()
    if not to:
        return False
    who = "Кандидат" if recipient_type != "employee" else "Сотрудник"
    url = _app_url(f"#/app/{view}")
    name = html.escape(full_name or "—")
    subject = f"{_BRAND}: {who.lower()} {name} прошёл оценку — {percent}%"
    intro = (f"<b>{name}</b> ({who.lower()}) завершил оценку «{html.escape(test_title)}». "
             f"Результат: <b>{percent}%</b>. Отчёт с разбором по компетенциям и рекомендациями готов.")
    body = _wrap("Отчёт готов", intro, "Открыть в Eltera", url, "Уведомление для HR-команды.")
    return await send_email(to, subject, body)


async def send_welcome(*, to: str, full_name: str | None) -> bool:
    """Welcome-письмо сотруднику при добавлении в систему."""
    if not to:
        return False
    name = html.escape((full_name or "").split(" ")[1] if full_name and len(full_name.split(" ")) > 1 else (full_name or ""))
    greeting = f"Здравствуйте, {name}!" if name else "Здравствуйте!"
    intro = (f"{greeting} Вас добавили в платформу оценки и развития <b>{_BRAND}</b>. "
             f"Здесь будут приходить опросы адаптации и оценки — со ссылкой прямо в письме. "
             f"Это занимает пару минут и помогает команде вовремя вас поддержать.")
    body = _wrap("Добро пожаловать в Eltera", intro, "Открыть Eltera", _app_url(), "Если это письмо пришло по ошибке — просто проигнорируйте его.")
    return await send_email(to, f"{_BRAND}: добро пожаловать", body)
