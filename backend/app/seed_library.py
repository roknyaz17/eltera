"""Идемпотентный сид библиотеки тестов (кандидаты, сотрудники, психометрика).

Импортирует три эталонных developer-воркбука из app/data/library тем же путём,
что и загрузка через UI: library_import.parse_workbook → crud.import_library_developer.
Апсертит по стабильному ключу (Test.key = profile_id), поэтому повторный запуск и
запуск на свежей БД обновляют записи, а не дублируют.

Итого: 168 профилей (73 кандидатских + 74 по сотрудникам + 21 психометрический).

Запуск:  python -m app.seed_library
"""
import asyncio
from pathlib import Path

from app.core.database import AsyncSessionLocal
from app.crud import test as crud
from app.services import library_import

DATA_DIR = Path(__file__).parent / "data" / "library"

# Порядок не важен: каждый воркбук самодостаточен и апсертится по ключам.
WORKBOOKS = [
    "eltera_candidates_developer.xlsx",
    "eltera_employees_developer.xlsx",
    "eltera_psychometric_developer.xlsx",
]


async def seed_library() -> None:
    total_created = total_updated = 0
    for name in WORKBOOKS:
        path = DATA_DIR / name
        if not path.exists():
            print(f"! пропуск (нет файла): {path}")
            continue
        parsed, parse_errors = library_import.parse_workbook(path.read_bytes())
        if parse_errors:
            for e in parse_errors[:10]:
                print(f"  ! разбор {name}: {e}")
        if not parsed.get("profiles"):
            print(f"! пропуск (нет профилей): {name}")
            continue
        async with AsyncSessionLocal() as session:
            res = await crud.import_library_developer(session, parsed)
        created = res.get("profiles_created", 0)
        updated = res.get("profiles_updated", 0)
        total_created += created
        total_updated += updated
        print(
            f"+ {name}: профилей +{created}/~{updated}, "
            f"вопросов +{res.get('questions_created', 0)}/~{res.get('questions_skipped', 0)}"
        )
        for e in res.get("errors", [])[:10]:
            print(f"  ! импорт {name}: {e}")
    print(f"Готово. Профилей создано: {total_created}, обновлено: {total_updated}.")


if __name__ == "__main__":
    asyncio.run(seed_library())
