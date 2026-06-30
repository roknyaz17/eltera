"""Каталог тарифов — источник истины по цене и составу.

Цена и число токенов считаются ТОЛЬКО здесь, на сервере: клиент при оформлении
присылает лишь ключ тарифа, а сумму к оплате и объём зачисления берём отсюда.
Так подписанная для Монеты сумма не подменяется с фронта, а баланс токенов
зачисляется ровно тем числом, что заявлено в тарифе.

Колонки таблицы тарифа:
  • assessments — сколько оценок «покрывает» тариф (маркетинговая величина);
  • tokens      — сколько токенов зачисляется на баланс при оплате (валюта оценок
                  и AI-ассистента, списывается при использовании);
  • price       — стоимость тарифа, ₽.
"""
from __future__ import annotations

from decimal import Decimal


class Tariff:
    """Описание одного тарифа (неизменяемое)."""

    __slots__ = ("key", "name", "audience", "assessments", "tokens", "price")

    def __init__(
        self,
        *,
        key: str,
        name: str,
        audience: str,
        assessments: int,
        tokens: int,
        price: Decimal,
    ) -> None:
        self.key = key
        self.name = name
        self.audience = audience
        self.assessments = assessments
        self.tokens = tokens
        self.price = price


# Источник истины. Ключ == значение, сохраняемое в Organization.tariff.
TARIFFS: dict[str, Tariff] = {
    t.key: t
    for t in (
        Tariff(
            key="Starter",
            name="Starter",
            audience="Проверить сервис",
            assessments=3,
            tokens=90,
            price=Decimal("990.00"),
        ),
        Tariff(
            key="TalentCheck",
            name="TalentCheck",
            audience="Малый бизнес",
            assessments=25,
            tokens=750,
            price=Decimal("7500.00"),
        ),
        Tariff(
            key="TalentPro",
            name="TalentPro",
            audience="Рекрутинговые агентства и HR-отделы",
            assessments=80,
            tokens=2400,
            price=Decimal("24000.00"),
        ),
        Tariff(
            key="TalentStudio",
            name="TalentStudio",
            audience="Крупный бизнес",
            assessments=250,
            tokens=7500,
            price=Decimal("75000.00"),
        ),
    )
}

# Порядок отображения (по возрастанию цены).
ORDER = ["Starter", "TalentCheck", "TalentPro", "TalentStudio"]

# Тариф по умолчанию для существующих/служебных организаций.
DEFAULT_TARIFF = "Starter"


def get_tariff(key: str | None) -> Tariff | None:
    if not key:
        return None
    return TARIFFS.get(key.strip())


def resolve(key: str) -> Tariff:
    """Возвращает тариф по ключу или бросает ValueError на неизвестный."""
    tariff = get_tariff(key)
    if tariff is None:
        raise ValueError("Неизвестный тариф")
    return tariff


def catalog() -> list[Tariff]:
    """Тарифы в порядке отображения."""
    return [TARIFFS[k] for k in ORDER if k in TARIFFS]
