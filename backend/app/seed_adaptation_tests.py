"""Идемпотентный сидер опросов адаптации по этапам.

4 коротких опроса (category=Адаптация, target=employee):
  • Адаптация · Старт        (дни 1/3/7)
  • Адаптация · Интеграция   (дни 14/30)
  • Адаптация · Закрепление  (дни 60/90)
  • Адаптация · Итог         (день 180)

Запуск:  python -m app.seed_adaptation_tests
"""
import asyncio

from app.core.database import AsyncSessionLocal
from app.crud import test as crud
from app.models.enums import QuestionType, TestTarget
from app.schemas.test import QuestionCreate, QuestionOptionIn, TestCreate


def _scale(text, comp):
    return QuestionCreate(text=text, type=QuestionType.scale, competency_name=comp, scale_min=1, scale_max=5)


def _single(text, comp, opts):
    qmax = max(s for _, s, _ in opts)
    return QuestionCreate(
        text=text, type=QuestionType.single_choice, competency_name=comp,
        options=[QuestionOptionIn(text=t, score=s, is_red_flag=r, is_correct=(s == qmax)) for t, s, r in opts],
    )


def _open(text, comp="Обратная связь"):
    return QuestionCreate(text=text, type=QuestionType.open, competency_name=comp, max_score=5)


STAGE_TESTS = [
    (TestCreate(title="Адаптация · Старт", category="Адаптация", target_type=TestTarget.employee,
                summary="Первые дни: доступы, понятность задач, поддержка."),
     [
         _scale("Мне понятны мои задачи и приоритеты на старте.", "Понятность задач"),
         _scale("Я знаю, к кому обращаться с вопросами, и получаю помощь.", "Поддержка"),
         _single("Выдали ли всё необходимое (доступы, техника, рабочее место)?", "Ресурсы",
                 [("Да, всё на месте.", 5, False), ("Частично.", 3, False), ("Нет, многого не хватает.", 0, True)]),
         _open("Что мешает быстро влиться в первые дни?"),
     ]),
    (TestCreate(title="Адаптация · Интеграция", category="Адаптация", target_type=TestTarget.employee,
                summary="2–4 недели: нагрузка, команда, совпадение с ожиданиями."),
     [
         _scale("Рабочая нагрузка комфортна и посильна.", "Нагрузка"),
         _scale("Я чувствую себя частью команды.", "Команда"),
         _scale("Реальная работа совпадает с тем, что обещали при найме.", "Ожидания"),
         _open("Чего не хватает для эффективной работы?"),
     ]),
    (TestCreate(title="Адаптация · Закрепление", category="Адаптация", target_type=TestTarget.employee,
                summary="2–3 месяца: результаты, развитие, удержание."),
     [
         _scale("Я вижу прогресс и понимаю зоны роста.", "Развитие"),
         _scale("Я достигаю ожидаемых результатов.", "Результаты"),
         _scale("Я планирую продолжать работать в компании.", "Удержание"),
         _open("Что улучшить, чтобы вы остались и росли?"),
     ]),
    (TestCreate(title="Адаптация · Итог", category="Адаптация", target_type=TestTarget.employee,
                summary="Полгода: итог адаптации, лояльность."),
     [
         _scale("В целом адаптация прошла успешно.", "Адаптация"),
         _scale("Я уверенно остаюсь в компании.", "Удержание"),
         _scale("Я бы порекомендовал компанию как место работы.", "Лояльность"),
         _open("Итоговые впечатления и предложения."),
     ]),
]


async def seed_adaptation_tests() -> None:
    async with AsyncSessionLocal() as session:
        existing = {t.title for t in await crud.list_tests(session)}
        created = 0
        for test_create, questions in STAGE_TESTS:
            if test_create.title in existing:
                print(f"= пропуск: {test_create.title}")
                continue
            test_id = await crud.create_test(session, test_create)
            for q in questions:
                await crud.add_question(session, test_id, q)
            created += 1
            print(f"+ {test_create.title} ({len(questions)} вопросов)")
        print(f"Готово. Новых опросов адаптации: {created}.")


if __name__ == "__main__":
    asyncio.run(seed_adaptation_tests())
