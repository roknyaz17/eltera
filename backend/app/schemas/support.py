"""Схемы раздела «Поддержка» (обращения в Telegram)."""
from typing import Literal

from pydantic import BaseModel, Field

# Тип обращения определяет шаблон сообщения в Telegram.
SupportType = Literal["urgent", "normal", "idea"]


class SupportTicket(BaseModel):
    type: SupportType = "normal"
    subject: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=4000)
    # Необязательные данные отправителя (подставляются на фронте из профиля).
    from_name: str | None = None
    from_email: str | None = None


class SupportResult(BaseModel):
    ok: bool = False
    sent: bool = False
    detail: str = ""
