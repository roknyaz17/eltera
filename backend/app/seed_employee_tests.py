"""Идемпотентный сидер тестов для сотрудников.

Создаёт три полноценных теста (как из конструктора) с target_type=employee:
  • «Адаптация сотрудника»
  • «Оценка 360°»
  • «Performance Review»
по 5 вопросов в каждом. Использует те же CRUD-функции, что и конструктор,
поэтому тесты получаются published и сразу пригодны для ссылок-оценок.

Запуск:  python -m app.seed_employee_tests
Повторный запуск ничего не дублирует (проверка по названию теста).
"""
import asyncio

from app.core.database import AsyncSessionLocal
from app.crud import test as crud
from app.models.enums import QuestionType, TestTarget
from app.schemas.test import QuestionCreate, QuestionOptionIn, TestCreate


def _scale(text, competency, lo=1, hi=5):
    return QuestionCreate(
        text=text, type=QuestionType.scale, competency_name=competency,
        scale_min=lo, scale_max=hi,
    )


def _single(text, competency, options):
    # options: list[(text, score, is_red_flag)]
    qmax = max((s for _, s, _ in options), default=0)
    return QuestionCreate(
        text=text, type=QuestionType.single_choice, competency_name=competency,
        options=[
            QuestionOptionIn(text=t, score=s, is_red_flag=r, is_correct=(s == qmax))
            for t, s, r in options
        ],
    )


def _open(text, competency, reference=None, criteria=None, max_score=5):
    return QuestionCreate(
        text=text, type=QuestionType.open, competency_name=competency,
        ai_reference=reference, ai_criteria=criteria, max_score=max_score,
    )


# (TestCreate, [QuestionCreate, ...])
EMPLOYEE_TESTS = [
    (
        TestCreate(
            title="Адаптация сотрудника",
            category="Адаптация",
            target_type=TestTarget.employee,
            summary="Пульс-опрос адаптации: понятность задач, поддержка, ресурсы, ожидания.",
        ),
        [
            _scale("Насколько вам понятны ваши задачи и зоны ответственности?", "Понятность задач"),
            _scale("Насколько комфортно вам в команде и во взаимодействии с руководителем?", "Поддержка команды"),
            _single(
                "Хватает ли вам ресурсов и информации для работы?", "Ресурсы",
                [
                    ("Да, всего достаточно.", 5, False),
                    ("Частично, кое-чего не хватает.", 3, False),
                    ("Нет, регулярно не хватает.", 0, True),
                ],
            ),
            _single(
                "Совпадает ли реальная работа с тем, что обещали при найме?", "Ожидания",
                [
                    ("Полностью совпадает.", 5, False),
                    ("В основном совпадает.", 3, False),
                    ("Существенно расходится.", 0, True),
                ],
            ),
            _open(
                "Что мешает быстрее влиться в работу и что стоит улучшить в адаптации?",
                "Обратная связь",
                reference="Конкретные барьеры адаптации и предложения по улучшению.",
                criteria="Конкретность, готовность давать обратную связь, вовлечённость.",
            ),
        ],
    ),
    (
        TestCreate(
            title="Оценка 360°",
            category="360",
            target_type=TestTarget.employee,
            summary="Круговая оценка компетенций: коммуникация, ответственность, командность, инициатива.",
        ),
        [
            _scale("Коммуникация: ясно доносит мысли и слушает собеседника.", "Коммуникация"),
            _scale("Ответственность: доводит задачи до результата и держит сроки.", "Ответственность"),
            _scale("Командная работа: помогает коллегам и делится знаниями.", "Командная работа"),
            _scale("Инициатива: предлагает решения и берёт ответственность на себя.", "Инициатива"),
            _open(
                "В чём сильные стороны сотрудника и какие зоны развития вы видите?",
                "Зоны развития",
                reference="Сбалансированная обратная связь: сильные стороны и конкретные зоны роста.",
                criteria="Объективность, конкретные примеры, конструктивность.",
            ),
        ],
    ),
    (
        TestCreate(
            title="Performance Review",
            category="Performance",
            target_type=TestTarget.employee,
            summary="Оценка результативности и потенциала сотрудника за период.",
        ),
        [
            _scale("Результативность: достигает целей и ключевых показателей (KPI).", "Результативность"),
            _scale("Качество работы: выполняет задачи качественно и без переделок.", "Качество"),
            _scale("Потенциал: способен расти и брать более сложные задачи.", "Потенциал"),
            _single(
                "Готов ли сотрудник к расширению зоны ответственности?", "Потенциал роста",
                [
                    ("Да, готов уже сейчас.", 5, False),
                    ("Будет готов в течение года.", 3, False),
                    ("Пока не готов.", 1, False),
                ],
            ),
            _open(
                "Ключевые достижения за период и цели на следующий период.",
                "Цели и достижения",
                reference="Измеримые достижения и конкретные цели на следующий период.",
                criteria="Измеримость, связь с целями компании, реалистичность.",
            ),
        ],
    ),
]


async def seed_employee_tests() -> None:
    async with AsyncSessionLocal() as session:
        existing = {t.title for t in await crud.list_tests(session)}
        created = 0
        for test_create, questions in EMPLOYEE_TESTS:
            if test_create.title in existing:
                print(f"= пропуск (уже есть): {test_create.title}")
                continue
            test_id = await crud.create_test(session, test_create)
            for q in questions:
                await crud.add_question(session, test_id, q)
            created += 1
            print(f"+ создан тест: {test_create.title} ({len(questions)} вопросов)")
        print(f"Готово. Новых тестов: {created}.")


if __name__ == "__main__":
    asyncio.run(seed_employee_tests())
