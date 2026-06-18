"""Интеграция с HeadHunter: OAuth2 (authorization code) + чтение вакансий.

Подключение одно на организацию (HHConnection). Токены обновляются автоматически.
Документация: https://api.hh.ru/openapi/redoc
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.hh import HHConnection
from app.models.organization import Organization

logger = logging.getLogger("eltera.hh")

AUTHORIZE_URL = "https://hh.ru/oauth/authorize"
TOKEN_URL = "https://hh.ru/oauth/token"
API_BASE = "https://api.hh.ru"
REFRESH_SKEW = timedelta(minutes=5)  # обновляем токен заранее


class HHError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_configured() -> bool:
    s = get_settings()
    return bool(s.hh_client_id and s.hh_client_secret)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _headers(access_token: str | None = None) -> dict:
    h = {"HH-User-Agent": get_settings().hh_user_agent, "User-Agent": get_settings().hh_user_agent}
    if access_token:
        h["Authorization"] = f"Bearer {access_token}"
    return h


def authorize_url(state: str) -> str:
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.hh_client_id,
        "redirect_uri": s.hh_redirect_uri,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


async def _token_request(data: dict) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(TOKEN_URL, data=data, headers=_headers())
    if resp.status_code != 200:
        logger.error("HH token error %s: %s", resp.status_code, resp.text)
        raise HHError("HH отклонил запрос токена. Проверьте client_id/secret и redirect_uri.", 502)
    return resp.json()


async def exchange_code(code: str) -> dict:
    s = get_settings()
    return await _token_request({
        "grant_type": "authorization_code",
        "client_id": s.hh_client_id,
        "client_secret": s.hh_client_secret,
        "code": code,
        "redirect_uri": s.hh_redirect_uri,
    })


async def refresh_tokens(refresh_token: str) -> dict:
    # HH: обновление по refresh_token (client creds допустимы, но не обязательны).
    s = get_settings()
    return await _token_request({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": s.hh_client_id,
        "client_secret": s.hh_client_secret,
    })


def _apply_token(conn: HHConnection, token: dict) -> None:
    conn.access_token = token.get("access_token")
    if token.get("refresh_token"):
        conn.refresh_token = token["refresh_token"]
    conn.expires_at = _now() + timedelta(seconds=int(token.get("expires_in", 0) or 0))
    conn.status = "connected"


async def fetch_identity(access_token: str) -> dict:
    """GET /me — менеджер работодателя + (если есть) employer."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{API_BASE}/me", headers=_headers(access_token))
    if resp.status_code != 200:
        logger.warning("HH /me %s: %s", resp.status_code, resp.text)
        return {}
    return resp.json()


async def _ensure_fresh(session: AsyncSession, conn: HHConnection) -> None:
    if conn.expires_at and conn.expires_at - REFRESH_SKEW > _now():
        return
    if not conn.refresh_token:
        raise HHError("Токен HH истёк. Переподключите hh.ru.", 401)
    token = await refresh_tokens(conn.refresh_token)
    _apply_token(conn, token)
    await session.commit()


async def api_get(session: AsyncSession, conn: HHConnection, path: str, params: dict | None = None) -> dict:
    await _ensure_fresh(session, conn)
    url = f"{API_BASE}{path}"
    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.get(url, headers=_headers(conn.access_token), params=params or {})
        if resp.status_code in (401, 403) and conn.refresh_token:
            # пробуем обновить токен и повторить один раз
            token = await refresh_tokens(conn.refresh_token)
            _apply_token(conn, token)
            await session.commit()
            resp = await client.get(url, headers=_headers(conn.access_token), params=params or {})
    if resp.status_code != 200:
        logger.error("HH API %s %s: %s", path, resp.status_code, resp.text)
        raise HHError(f"HH API вернул {resp.status_code} на {path}.", 502)
    return resp.json()


# ── Подключение ──

async def _default_org_id(session: AsyncSession) -> str:
    org_id = (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()
    if org_id is None:
        org = Organization(name="Eltera Demo Company")
        session.add(org)
        await session.flush()
        org_id = org.id
    return org_id


async def get_connection(session: AsyncSession) -> HHConnection | None:
    org_id = await _default_org_id(session)
    return (await session.execute(
        select(HHConnection).where(HHConnection.organization_id == org_id)
    )).scalar_one_or_none()


async def start_oauth(session: AsyncSession) -> str:
    """Готовит pending-подключение со state и возвращает authorize URL."""
    if not is_configured():
        raise HHError("HH не настроен: задайте HH_CLIENT_ID/HH_CLIENT_SECRET.", 503)
    org_id = await _default_org_id(session)
    conn = await get_connection(session)
    state = secrets.token_urlsafe(24)
    if conn is None:
        conn = HHConnection(organization_id=org_id)
        session.add(conn)
    conn.oauth_state = state
    if conn.status != "connected":
        conn.status = "pending"
    await session.commit()
    return authorize_url(state)


async def complete_oauth(session: AsyncSession, code: str, state: str) -> HHConnection:
    conn = (await session.execute(
        select(HHConnection).where(HHConnection.oauth_state == state)
    )).scalar_one_or_none()
    if conn is None:
        raise HHError("Неверный state — повторите подключение.", 400)
    token = await exchange_code(code)
    _apply_token(conn, token)
    conn.oauth_state = None
    # Подтягиваем кто подключился.
    me = await fetch_identity(conn.access_token)
    conn.manager_id = str(me.get("id")) if me.get("id") is not None else conn.manager_id
    name_parts = [me.get("first_name"), me.get("last_name")]
    conn.account_name = (" ".join(p for p in name_parts if p) or me.get("email")) or conn.account_name
    employer = me.get("employer") or {}
    if isinstance(employer, dict) and employer.get("id"):
        conn.employer_id = str(employer["id"])
        conn.employer_name = employer.get("name") or conn.employer_name
    await session.commit()
    return conn


async def disconnect(session: AsyncSession) -> None:
    conn = await get_connection(session)
    if conn is not None:
        await session.delete(conn)
        await session.commit()


# ── Вакансии ──

def _map_vacancy(v: dict) -> dict:
    counters = v.get("counters") or {}
    area = v.get("area") or {}
    return {
        "id": str(v.get("id")),
        "title": v.get("name") or "—",
        "area": area.get("name"),
        "responses": int(counters.get("responses") or counters.get("total") or 0),
        "new_responses": int(counters.get("new_responses") or 0),
        "url": v.get("alternate_url"),
        "published_at": v.get("published_at") or v.get("created_at"),
        "archived": bool(v.get("archived")),
    }


async def fetch_active_vacancies(session: AsyncSession, conn: HHConnection) -> list[dict]:
    """Активные вакансии работодателя + счётчики откликов."""
    if not conn.employer_id:
        # employer_id мог не прийти в /me — пробуем уточнить ещё раз.
        me = await fetch_identity(conn.access_token)
        employer = me.get("employer") or {}
        if isinstance(employer, dict) and employer.get("id"):
            conn.employer_id = str(employer["id"])
            conn.employer_name = employer.get("name") or conn.employer_name
            await session.commit()
    if not conn.employer_id:
        raise HHError("Не удалось определить работодателя в HH. Убедитесь, что вход выполнен под аккаунтом работодателя.", 400)

    items: list[dict] = []
    page, pages = 0, 1
    while page < pages and page < 20:
        data = await api_get(
            session, conn, f"/employers/{conn.employer_id}/vacancies/active",
            params={"page": page, "per_page": 100},
        )
        items.extend(data.get("items", []))
        pages = data.get("pages", 1)
        page += 1
    return [_map_vacancy(v) for v in items]
