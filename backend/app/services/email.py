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
from email.header import Header
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

from app.core.config import get_settings

logger = logging.getLogger("eltera.email")


def is_configured() -> bool:
    s = get_settings()
    return bool(s.smtp_host and s.smtp_from)


def _assess_url(token: str) -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/#/assess/{token}"


def _fmt_addr(value: str) -> tuple[str, str]:
    """Возвращает (заголовок, чистый_адрес). Display-имя кодируем в RFC2047,
    чтобы заголовок остался ASCII; чистый адрес передаём в конверт явно —
    тогда smtplib не требует SMTPUTF8 (его нет у многих SMTP, напр. reg.ru)."""
    name, addr = parseaddr(value or "")
    if name:
        try:
            name.encode("ascii")
            header = formataddr((name, addr))
        except UnicodeEncodeError:
            header = formataddr((str(Header(name, "utf-8")), addr))
    else:
        header = addr
    return header, addr


def _send_sync(to: str, subject: str, html_body: str, text_body: str) -> bool:
    s = get_settings()
    from_header, from_addr = _fmt_addr(s.smtp_from)
    to_header, to_addr = _fmt_addr(to)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = to_header
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    try:
        if s.smtp_ssl:
            with smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=15) as srv:
                if s.smtp_user:
                    srv.login(s.smtp_user, s.smtp_password or "")
                srv.send_message(msg, from_addr=from_addr, to_addrs=[to_addr])
        else:
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as srv:
                if s.smtp_tls:
                    srv.starttls()
                if s.smtp_user:
                    srv.login(s.smtp_user, s.smtp_password or "")
                srv.send_message(msg, from_addr=from_addr, to_addrs=[to_addr])
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


def render_email(
    *,
    title: str,
    intro: str,
    button_label: str | None = None,
    url: str | None = None,
    footer: str = "",
    show_link: bool = True,
    preheader: str | None = None,
    extra_html: str = "",
) -> str:
    """Брендовый HTML-шаблон письма на табличной вёрстке (для совместимости с почтовыми клиентами).

    Тёмная «карточка» с градиентным хедером, логотипом-маркой, градиентной кнопкой
    и аккуратным футером. `button_label`/`url` опциональны — без них кнопка не рисуется.
    """
    has_button = bool(button_label and url)
    preheader = preheader or title

    button_html = ""
    if has_button:
        button_html = f"""\
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px">
                  <tr>
                    <td align="center" style="border-radius:11px;background:linear-gradient(135deg,#2F6BFF 0%,#1E5BFF 50%,#6A3DFF 100%);box-shadow:0 8px 22px rgba(30,91,255,.40)">
                      <a href="{url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:15px 34px;border-radius:11px">{button_label}&nbsp;&rarr;</a>
                    </td>
                  </tr>
                </table>"""

    link_html = ""
    if has_button and show_link:
        link_html = f"""\
              <p style="color:#5E6E92;font-size:12px;line-height:1.6;margin:22px 0 0">
                Если кнопка не открывается, скопируйте ссылку в браузер:<br>
                <a href="{url}" style="color:#7EB3FF;word-break:break-all;text-decoration:none">{url}</a>
              </p>"""

    return f"""\
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
</head>
<body style="margin:0;padding:0;background:#070B16;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070B16;font-size:1px;line-height:1px">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070B16;background-image:radial-gradient(900px 380px at 50% -120px,#16224A 0%,rgba(7,11,22,0) 70%)">
  <tr>
    <td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background:#0F1730;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.07);box-shadow:0 24px 60px rgba(0,0,0,.45)">
        <tr>
          <td style="height:4px;padding:0;background:linear-gradient(90deg,#2F6BFF 0%,#6A3DFF 55%,#28D2C8 100%);font-size:0;line-height:0">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:26px 32px 22px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td width="38" height="38" align="center" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#2F6BFF,#6A3DFF);color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;line-height:38px;text-align:center">E</td>
                    <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif">
                      <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.4px;line-height:1.1">{_BRAND}</div>
                      <div style="color:#7C8BB0;font-size:11px;letter-spacing:.6px;text-transform:uppercase">Assessment Intelligence</div>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;font-size:0;line-height:0"><div style="height:1px;background:rgba(255,255,255,.07)"></div></td>
        </tr>
        <tr>
          <td style="padding:26px 32px 30px;font-family:Arial,Helvetica,sans-serif">
            <h1 style="color:#EAF2FF;font-size:21px;font-weight:700;margin:0 0 14px;line-height:1.3">{title}</h1>
            <p style="color:#C2CFE6;font-size:14.5px;line-height:1.65;margin:0 0 24px">{intro}</p>
            {extra_html}
            {button_html}
            {link_html}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 22px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.06);font-family:Arial,Helvetica,sans-serif">
            <p style="color:#5E6E92;font-size:11.5px;line-height:1.6;margin:0">{footer}</p>
            <p style="color:#3E4A66;font-size:11px;line-height:1.6;margin:8px 0 0">© {_BRAND} · Assessment Intelligence</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def _wrap(title: str, intro: str, button_label: str, url: str, footer: str) -> str:
    """Обратно-совместимая обёртка над :func:`render_email`."""
    return render_email(title=title, intro=intro, button_label=button_label, url=url, footer=footer)


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


def _first_name(full_name: str | None) -> str:
    """Имя для приветствия: второе слово ФИО (имя) или всё, что есть."""
    parts = (full_name or "").split(" ")
    return html.escape(parts[1] if len(parts) > 1 else (full_name or ""))


def _greeting(full_name: str | None) -> str:
    name = _first_name(full_name)
    return f"Здравствуйте, {name}!" if name else "Здравствуйте!"


def _money(amount, currency: str = "RUB") -> str:
    """«3 900 ₽» из Decimal/float. Целые суммы — без копеек."""
    sign = {"RUB": "₽", "USD": "$", "EUR": "€"}.get(currency, currency)
    try:
        val = float(amount)
    except (TypeError, ValueError):
        return f"{amount} {sign}"
    body = f"{val:,.0f}" if val == int(val) else f"{val:,.2f}"
    return f"{body.replace(',', ' ')} {sign}"


# ─────────────────────────── Биллинг ───────────────────────────


async def send_payment_receipt(*, to: str, full_name: str | None, pack: int,
                               amount, currency: str, balance: int) -> bool:
    """Квитанция: платёж прошёл, баланс пополнен."""
    if not to:
        return False
    intro = (f"{_greeting(full_name)} Оплата прошла успешно. На баланс зачислено "
             f"<b>{pack}</b> оценок на сумму <b>{_money(amount, currency)}</b>. "
             f"Текущий баланс: <b>{balance}</b> оценок.")
    body = _wrap("Платёж получен", intro, "Открыть Eltera", _app_url("#/app/settings"),
                 "Квитанция об оплате. Спасибо, что пользуетесь Eltera.")
    return await send_email(to, f"{_BRAND}: баланс пополнен на {pack} оценок", body)


async def send_payment_failed(*, to: str, full_name: str | None, pack: int,
                              amount, currency: str, reason: str | None = None) -> bool:
    """Уведомление: платёж не прошёл, баланс не изменился."""
    if not to:
        return False
    intro = (f"{_greeting(full_name)} К сожалению, оплата пакета на <b>{pack}</b> оценок "
             f"({_money(amount, currency)}) не была завершена. Баланс не изменился — "
             f"вы можете попробовать оплатить ещё раз.")
    body = _wrap("Платёж не прошёл", intro, "Повторить оплату", _app_url("#/app/settings"),
                 "Если средства всё же были списаны — напишите в поддержку, мы разберёмся.")
    return await send_email(to, f"{_BRAND}: платёж не прошёл", body)


# ─────────────────────────── Напоминания ───────────────────────────

_REMINDER_PREFIX = {1: "Напоминаем", 2: "Напоминаем ещё раз", 3: "Последнее напоминание"}


async def send_assessment_reminder(*, to: str, full_name: str | None, test_title: str,
                                   category: str | None, recipient_type: str,
                                   token: str, attempt: int) -> bool:
    """Напоминание о незавершённой оценке (до 3 раз, пока тест не пройден)."""
    if not to:
        return False
    url = _assess_url(token)
    prefix = _REMINDER_PREFIX.get(attempt, "Напоминаем")
    title_esc = html.escape(test_title)
    last = " Это последнее напоминание." if attempt >= 3 else ""
    if recipient_type == "employee":
        subject = f"{_BRAND}: {prefix.lower()} — оценка «{test_title}» ещё не пройдена"
        intro = (f"{_greeting(full_name)} {prefix}: вам назначена оценка «{title_esc}», "
                 f"и она пока не пройдена. Это займёт пару минут — результат увидит только "
                 f"HR и ваш руководитель.{last}")
    else:
        subject = f"{_BRAND}: {prefix.lower()} — пройдите оценку «{test_title}»"
        intro = (f"{_greeting(full_name)} {prefix}: оценка «{title_esc}» по вакансии "
                 f"ещё ждёт вас. Пройдите её, чтобы мы могли продолжить рассмотрение.{last}")
    body = _wrap("Оценка ещё не пройдена", intro, "Пройти оценку", url,
                 "Если вы уже проходите оценку — просто закончите её, и напоминания прекратятся.")
    return await send_email(to, subject, body)
