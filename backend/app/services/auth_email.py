"""Email helpers specific to auth verification flows."""
from __future__ import annotations

import html

from app.core.config import get_settings
from app.services.email import _BRAND, render_email, send_email


def _app_url(path: str = "") -> str:
    base = get_settings().app_public_url.rstrip("/")
    return f"{base}/{path.lstrip('/')}" if path else base


def _code_block(code: str) -> str:
    """Крупная «карточка» с одноразовым кодом и моноширинными разрядами."""
    digits = "".join(
        f'<span style="display:inline-block;color:#EAF2FF;font-family:\'Courier New\',monospace;'
        f'font-size:30px;font-weight:700;letter-spacing:.06em;padding:0 7px">{html.escape(ch)}</span>'
        for ch in code
    )
    return f"""\
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:6px 0 4px">
              <tr>
                <td align="center" style="padding:20px 16px;border-radius:14px;background:rgba(47,107,255,.10);border:1px solid rgba(47,107,255,.30)">
                  {digits}
                </td>
              </tr>
            </table>"""


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
        f"Ваш одноразовый код для {action}. Введите его на странице входа — "
        f"код действует <b style=\"color:#EAF2FF\">{ttl_minutes} минут</b>."
    )
    body = render_email(
        title=title,
        intro=intro,
        extra_html=_code_block(code) + (
            '<p style="color:#C2CFE6;font-size:14.5px;line-height:1.65;margin:18px 0 24px">'
            'Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>'
        ),
        button_label="Открыть Eltera",
        url=_app_url("#/login"),
        show_link=False,
        footer="Не пересылайте код другим людям. Сотрудники Eltera никогда не запрашивают его в переписке.",
    )
    return await send_email(to, subject, body, f"Код: {code}. Действует {ttl_minutes} минут.")
