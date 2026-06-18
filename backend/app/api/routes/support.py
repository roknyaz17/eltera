"""Эндпоинт раздела «Поддержка»: отправка обращения в Telegram."""
from fastapi import APIRouter

from app.schemas.support import SupportResult, SupportTicket
from app.services.support import send_ticket

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/ticket", response_model=SupportResult, summary="Отправить обращение в Telegram")
async def create_ticket(data: SupportTicket) -> SupportResult:
    return await send_ticket(data)
