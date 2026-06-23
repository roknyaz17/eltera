"""Сид таксономии библиотеки + авто-бэкфилл существующих профилей по направлениям.

Запуск: python -m app.seed_taxonomy
Идемпотентно: категории апсертятся по slug; связи теста с направлением создаются
только если у теста ещё нет ни одной категории (повторный запуск безопасен).
"""
import asyncio

from sqlalchemy import insert, select

from app.core.database import AsyncSessionLocal
from app.core.taxonomy import DIRECTIONS, UNIVERSAL, match_direction
from app.models.base import gen_uuid
from app.models.test import Category, Test, TestCategory


async def main():
    async with AsyncSessionLocal() as s:
        # 1. Категории (upsert по slug).
        existing = {c.slug: c for c in (await s.execute(select(Category))).scalars().all()}
        created = 0
        order = 0
        for kind, items in (("direction", DIRECTIONS), ("universal", UNIVERSAL)):
            for slug, title in items:
                order += 1
                c = existing.get(slug)
                if c is None:
                    s.add(Category(id=gen_uuid(), slug=slug, title=title, kind=kind, sort_order=order))
                    created += 1
                else:
                    c.title, c.kind, c.sort_order = title, kind, order
        await s.commit()
        print(f"Категории: создано {created}, всего {len(DIRECTIONS) + len(UNIVERSAL)}")

        # 2. Бэкфилл: тесты без категорий → направление по тексту category/title.
        cat_by_slug = {c.slug: c.id for c in (await s.execute(select(Category))).scalars().all()}
        tagged = set((await s.execute(select(TestCategory.test_id))).scalars().all())
        tests = (await s.execute(select(Test.id, Test.category, Test.title))).all()

        rows, matched, skipped = [], 0, 0
        for tid, category, title in tests:
            if tid in tagged:
                continue
            slug = match_direction(category) or match_direction(title)
            if slug and slug in cat_by_slug:
                rows.append({"test_id": tid, "category_id": cat_by_slug[slug]})
                matched += 1
            else:
                skipped += 1

        for i in range(0, len(rows), 5000):
            await s.execute(insert(TestCategory), rows[i:i + 5000])
        await s.commit()
        print(f"Бэкфилл: размечено {matched} профилей, без направления {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
