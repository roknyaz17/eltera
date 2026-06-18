"""Идемпотентный сидер 360-тестов по ролям.

Создаёт 4 теста (самооценка / руководитель / коллеги / подчинённые), все с
target_type=employee, category=360, и с ОБЩИМИ компетенциями — чтобы потом
сводить самооценку против внешней оценки по каждой компетенции.

Запуск:  python -m app.seed_360_tests
"""
import asyncio

from app.core.database import AsyncSessionLocal
from app.crud import test as crud
from app.models.enums import QuestionType, TestTarget
from app.schemas.test import QuestionCreate, TestCreate

# Общие компетенции (одинаковые названия во всех ролях — для сводки).
COMPS = ["Коммуникация", "Ответственность", "Командная работа", "Лидерство"]


def _scale(text, competency):
    return QuestionCreate(text=text, type=QuestionType.scale, competency_name=competency,
                          scale_min=1, scale_max=5)


def _open(text, competency):
    return QuestionCreate(text=text, type=QuestionType.open, competency_name=competency, max_score=5)


# Формулировки вопросов по ролям: comp -> текст. Плюс открытый вопрос.
ROLE_TESTS = {
    "self": {
        "title": "Оценка 360° · Самооценка",
        "summary": "Самооценка сотрудника по ключевым компетенциям.",
        "q": {
            "Коммуникация": "Я ясно доношу мысли и внимательно слушаю собеседника.",
            "Ответственность": "Я довожу задачи до результата и держу сроки.",
            "Командная работа": "Я помогаю коллегам и делюсь знаниями.",
            "Лидерство": "Я проявляю инициативу и предлагаю решения.",
        },
        "open": "В чём мои сильные стороны и какие зоны роста я вижу?",
    },
    "manager": {
        "title": "Оценка 360° · Руководитель",
        "summary": "Оценка сотрудника его руководителем.",
        "q": {
            "Коммуникация": "Сотрудник ясно доносит мысли и слушает собеседника.",
            "Ответственность": "Сотрудник доводит задачи до результата и держит сроки.",
            "Командная работа": "Сотрудник помогает команде и делится знаниями.",
            "Лидерство": "Сотрудник берёт инициативу и предлагает решения.",
        },
        "open": "Сильные стороны сотрудника и приоритетные зоны развития.",
    },
    "peer": {
        "title": "Оценка 360° · Коллеги",
        "summary": "Оценка сотрудника коллегами одного уровня.",
        "q": {
            "Коммуникация": "Коллега ясно доносит мысли и слушает других.",
            "Ответственность": "Коллега доводит общие задачи до результата.",
            "Командная работа": "Коллега помогает и делится знаниями в команде.",
            "Лидерство": "Коллега проявляет инициативу в общих задачах.",
        },
        "open": "Что коллега делает особенно хорошо и что стоит развивать?",
    },
    "report": {
        "title": "Оценка 360° · Подчинённые",
        "summary": "Оценка сотрудника его подчинёнными.",
        "q": {
            "Коммуникация": "Руководитель понятно ставит задачи и слушает команду.",
            "Ответственность": "Руководитель отвечает за результат команды.",
            "Командная работа": "Руководитель поддерживает команду и развивает людей.",
            "Лидерство": "Руководитель вдохновляет, задаёт направление и помогает расти.",
        },
        "open": "Что помогает в работе с руководителем и что стоит улучшить?",
    },
}


async def seed_360_tests() -> None:
    async with AsyncSessionLocal() as session:
        existing = {t.title for t in await crud.list_tests(session)}
        created = 0
        for role, spec in ROLE_TESTS.items():
            if spec["title"] in existing:
                print(f"= пропуск: {spec['title']}")
                continue
            test_id = await crud.create_test(session, TestCreate(
                title=spec["title"], category="360", target_type=TestTarget.employee,
                summary=spec["summary"],
            ))
            for comp in COMPS:
                await crud.add_question(session, test_id, _scale(spec["q"][comp], comp))
            await crud.add_question(session, test_id, _open(spec["open"], "Обратная связь"))
            created += 1
            print(f"+ {role}: {spec['title']} (5 вопросов)")
        print(f"Готово. Новых тестов: {created}.")


if __name__ == "__main__":
    asyncio.run(seed_360_tests())
