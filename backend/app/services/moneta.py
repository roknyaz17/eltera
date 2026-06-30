"""Низкоуровневая интеграция с MONETA.Assistant (провайдер MONETA.RU / PayAnyWay).

Только подписи и сборка параметров — без БД. Документация:
  • Запрос на оплату:        https://docs.moneta.ru/assistant/v1/payment-request/
  • Уведомление об оплате:   https://docs.moneta.ru/assistant/v1/pay-notification/
  • CHECK-запрос:            https://docs.moneta.ru/assistant/v1/check-requests/

Подписи (MD5, КОД — «код проверки целостности данных» магазина):
  запрос на оплату  MD5(MNT_ID + MNT_TRANSACTION_ID + MNT_AMOUNT + MNT_CURRENCY_CODE
                       + MNT_SUBSCRIBER_ID + MNT_TEST_MODE + КОД)
  уведомление PAY   MD5(MNT_ID + MNT_TRANSACTION_ID + MNT_OPERATION_ID + MNT_AMOUNT
                       + MNT_CURRENCY_CODE + MNT_SUBSCRIBER_ID + MNT_TEST_MODE + КОД)
  CHECK             MD5(MNT_COMMAND + MNT_ID + MNT_TRANSACTION_ID + MNT_OPERATION_ID
                       + MNT_AMOUNT + MNT_CURRENCY_CODE + MNT_SUBSCRIBER_ID + MNT_TEST_MODE + КОД)
  ответ магазина    MD5(MNT_RESULT_CODE + MNT_ID + MNT_TRANSACTION_ID + КОД)

Отсутствующие поля подставляются как пустая строка, порядок менять нельзя.
"""
from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal
from urllib.parse import urlencode

from app.core.config import get_settings

# Коды результата для ответа на CHECK (см. документацию Монеты).
RESULT_AMOUNT = "100"        # сумма заказа возвращена в ответе
RESULT_PAID = "200"          # заказ уже оплачен
RESULT_UNCLEAR = "302"       # статус неясен, повторить позже
RESULT_READY = "402"         # заказ существует и готов к оплате
RESULT_INACTIVE = "500"      # заказ не найден / отменён


def is_configured() -> bool:
    """True, если заданы реквизиты магазина и можно работать с реальной Монетой."""
    s = get_settings()
    return bool(s.moneta_account_id and s.moneta_integrity_code)


def _md5(raw: str) -> str:
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def fmt_amount(amount: Decimal | float | str) -> str:
    """Сумма строкой с двумя знаками после точки (требование Монеты)."""
    return f"{Decimal(str(amount)):.2f}"


def _test_flag() -> str:
    return "1" if get_settings().moneta_test_mode else "0"


def request_signature(
    *, transaction_id: str, amount: str, currency: str, subscriber_id: str, test_mode: str
) -> str:
    s = get_settings()
    raw = (
        f"{s.moneta_account_id or ''}{transaction_id}{amount}{currency}"
        f"{subscriber_id}{test_mode}{s.moneta_integrity_code or ''}"
    )
    return _md5(raw)


def build_payment_params(
    *,
    transaction_id: str,
    amount: Decimal,
    currency: str,
    subscriber_id: str,
    description: str,
    success_url: str,
    fail_url: str,
    return_url: str,
    inprogress_url: str,
) -> dict[str, str]:
    """Полный набор подписанных параметров для платёжной формы MONETA.Assistant."""
    s = get_settings()
    amount_str = fmt_amount(amount)
    test = _test_flag()
    params = {
        "MNT_ID": s.moneta_account_id or "",
        "MNT_TRANSACTION_ID": transaction_id,
        "MNT_AMOUNT": amount_str,
        "MNT_CURRENCY_CODE": currency,
        "MNT_SUBSCRIBER_ID": subscriber_id,
        "MNT_TEST_MODE": test,
        "MNT_DESCRIPTION": description,
        "MNT_SUCCESS_URL": success_url,
        "MNT_FAIL_URL": fail_url,
        "MNT_RETURN_URL": return_url,
        "MNT_INPROGRESS_URL": inprogress_url,
        "MNT_SIGNATURE": request_signature(
            transaction_id=transaction_id,
            amount=amount_str,
            currency=currency,
            subscriber_id=subscriber_id,
            test_mode=test,
        ),
    }
    return params


def payment_url(params: dict[str, str]) -> str:
    return f"{get_settings().moneta_assistant_url}?{urlencode(params)}"


def _notification_signature(data: dict, *, with_command: bool) -> str:
    """Эталонная подпись входящего уведомления (PAY либо CHECK).

    Значения берём ровно теми строками, что прислала Монета, — без переформата
    (например, MNT_AMOUNT уже в нужном формате на их стороне).
    """
    s = get_settings()
    g = lambda k: str(data.get(k, "") or "")  # noqa: E731
    prefix = g("MNT_COMMAND") if with_command else ""
    raw = (
        f"{prefix}{g('MNT_ID')}{g('MNT_TRANSACTION_ID')}{g('MNT_OPERATION_ID')}"
        f"{g('MNT_AMOUNT')}{g('MNT_CURRENCY_CODE')}{g('MNT_SUBSCRIBER_ID')}"
        f"{g('MNT_TEST_MODE')}{s.moneta_integrity_code or ''}"
    )
    return _md5(raw)


def verify_notification(data: dict) -> bool:
    """Сверяет MNT_SIGNATURE уведомления (constant-time). False — отклонить запрос."""
    if not is_configured():
        return False
    received = str(data.get("MNT_SIGNATURE", "") or "")
    if not received:
        return False
    is_check = str(data.get("MNT_COMMAND", "") or "").upper() == "CHECK"
    expected = _notification_signature(data, with_command=is_check)
    return hmac.compare_digest(received.lower(), expected.lower())


def response_signature(*, result_code: str, transaction_id: str) -> str:
    s = get_settings()
    raw = f"{result_code}{s.moneta_account_id or ''}{transaction_id}{s.moneta_integrity_code or ''}"
    return _md5(raw)


def check_response_xml(*, transaction_id: str, result_code: str, amount: Decimal | None = None) -> str:
    """XML-ответ на CHECK-запрос с подписью."""
    s = get_settings()
    amount_line = f"  <MNT_AMOUNT>{fmt_amount(amount)}</MNT_AMOUNT>\n" if amount is not None else ""
    sig = response_signature(result_code=result_code, transaction_id=transaction_id)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<MNT_RESPONSE>\n"
        f"  <MNT_ID>{s.moneta_account_id or ''}</MNT_ID>\n"
        f"  <MNT_TRANSACTION_ID>{transaction_id}</MNT_TRANSACTION_ID>\n"
        f"  <MNT_RESULT_CODE>{result_code}</MNT_RESULT_CODE>\n"
        f"{amount_line}"
        f"  <MNT_SIGNATURE>{sig}</MNT_SIGNATURE>\n"
        "</MNT_RESPONSE>"
    )
