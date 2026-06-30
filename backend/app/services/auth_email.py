"""Email helpers specific to auth verification flows."""
from __future__ import annotations

import html

from app.core.config import get_settings
from app.services.email import send_email

_BRAND = "Eltera"


def _app_url(path: str = "") -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/{path.lstrip('/')}" if path else base


def _wrap(title: str, intro: str, button_label: str, url: str, footer: str) -> str:
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
      <a href="{url}" style="display:inline-block;background:#1E5BFF;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 26px;border-radius:9px">{button_label}</a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.08);color:#6C7A99;font-size:11px">{footer}</div>
  </div>
</div>"""


_ACTIONS = {
    "registration": "подтверждения регистрации",
    "login": "подтверждения входа",
    "password_reset": "сброса пароля",
}
_TITLES = {
    "password_reset": "Сброс пароля",
}


async def send_auth_code(*, to: str, code: str, purpose: str, ttl_minutes: int) -> bool:
    if not to:
        return False
    action = _ACTIONS.get(purpose, "подтверждения")
    title = _TITLES.get(purpose, "Подтвердите email")
    subject = f"{_BRAND}: код {action}"
    intro = (
        f"Ваш одноразовый код для {action}: "
        f"<b style=\"font-size:28px;letter-spacing:.22em\">{html.escape(code)}</b><br><br>"
        f"Код действует {ttl_minutes} минут. Если вы не запрашивали его, просто проигнорируйте это письмо."
    )
    body = _wrap(
        title,
        intro,
        "Открыть Eltera",
        _app_url("#/login"),
        "Не пересылайте код другим людям. Сотрудники Eltera никогда не запрашивают его в переписке.",
    )
    return await send_email(to, subject, body, f"Код: {code}. Действует {ttl_minutes} минут.")
