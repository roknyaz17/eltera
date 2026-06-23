"""Эндпоинт ИИ-ассистента (виджет-чат)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.services import assistant

router = APIRouter(prefix="/assistant", tags=["assistant"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/chat", summary="Сообщение ИИ-ассистенту")
async def chat(data: ChatRequest, session: AsyncSession = Depends(get_session)):
    msgs = [{"role": m.role, "content": m.content} for m in data.messages]
    return await assistant.chat(session, msgs)
