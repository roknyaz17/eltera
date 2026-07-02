"""Password hashing, JWT helpers and one-time email code helpers."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "org": user.organization_id,
        "role": user.role,
        "email": user.email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_ttl_min)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if data.get("type") != "access":
        return None
    return data


def verify_admin_panel_credentials(username: str, password: str) -> bool:
    """Сверка логина/пароля админ-панели (константное время). False, если пароль
    не сконфигурирован — панель считается выключенной."""
    expected_password = settings.admin_panel_password
    if not expected_password:
        return False
    user_ok = hmac.compare_digest(username, settings.admin_panel_user)
    pass_ok = hmac.compare_digest(password, expected_password)
    return user_ok and pass_ok


def create_admin_panel_token() -> tuple[str, int]:
    """Токен доступа к админ-панели. Возвращает (token, ttl_seconds)."""
    now = datetime.now(timezone.utc)
    ttl = timedelta(hours=settings.admin_panel_token_ttl_hours)
    payload = {
        "sub": settings.admin_panel_user,
        "type": "admin_panel",
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(ttl.total_seconds())


def decode_admin_panel_token(token: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if data.get("type") != "admin_panel":
        return None
    return data


def new_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_ttl_days)
    return raw, hash_refresh(raw), expires


def hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def new_email_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_email_code(code: str) -> str:
    return hashlib.sha256(
        f"{settings.jwt_secret}:email-code:{code}".encode("utf-8")
    ).hexdigest()


def verify_email_code(code: str, code_hash: str) -> bool:
    return hmac.compare_digest(hash_email_code(code), code_hash)


def new_challenge_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_challenge_token(raw)


def hash_challenge_token(raw: str) -> str:
    return hashlib.sha256(
        f"{settings.jwt_secret}:challenge:{raw}".encode("utf-8")
    ).hexdigest()
