"""Конструктор тестов: создание тестов и динамическое управление вопросами."""
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.base import gen_uuid, utcnow
from app.models.catalog import Competency
from app.models.enums import (
    CompetencyKind,
    QuestionScope,
    QuestionType,
    VersionStatus,
)
from app.models.organization import Organization
from app.models.test import (
    AnswerOption,
    Question,
    QuestionVersion,
    Test,
    TestVersion,
    TestVersionItem,
)
from app.schemas.test import (
    QuestionCreate,
    QuestionOptionView,
    QuestionView,
    TestCreate,
    TestDetail,
    TestListItem,
    TestUpdate,
)


async def _default_org_id(session: AsyncSession) -> str:
    org_id = (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()
    if org_id is None:
        org = Organization(name="Eltera Demo Company")
        session.add(org)
        await session.flush()
        org_id = org.id
    return org_id


def _slug(title: str) -> str:
    return title.strip().lower().replace(" ", "_")[:80] or "competency"


def _question_max(data: QuestionCreate) -> int:
    if data.type == QuestionType.single_choice:
        return max((o.score for o in data.options), default=0)
    if data.type == QuestionType.multiple_choice:
        return sum(o.score for o in data.options if o.score > 0)
    if data.type == QuestionType.scale:
        return data.scale_max or 5
    return data.max_score or 5  # open


# --- Тесты ---


async def create_test(session: AsyncSession, data: TestCreate) -> str:
    org_id = await _default_org_id(session)
    test = Test(
        organization_id=org_id, title=data.title, category=data.category,
        summary=data.summary, target_type=data.target_type.value, is_system=False,
        key=_slug(data.title),
    )
    session.add(test)
    await session.flush()
    version = TestVersion(
        test_id=test.id, version_no=1, status=VersionStatus.published.value,
        published_at=utcnow(),
    )
    session.add(version)
    await session.flush()
    test.current_version_id = version.id
    await session.commit()
    return test.id


async def update_test(session: AsyncSession, test_id: str, data: TestUpdate) -> bool:
    test = await session.get(Test, test_id)
    if test is None:
        return False
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(test, field, value)
    await session.commit()
    return True


async def delete_test(session: AsyncSession, test_id: str) -> bool:
    test = await session.get(Test, test_id)
    if test is None:
        return False
    await session.delete(test)
    await session.commit()
    return True


async def list_tests(session: AsyncSession) -> list[TestListItem]:
    tests = (await session.execute(select(Test).order_by(Test.created_at.desc()))).scalars().all()
    # число вопросов в текущей версии каждого теста
    counts = dict((await session.execute(
        select(TestVersionItem.test_version_id, func.count())
        .group_by(TestVersionItem.test_version_id)
    )).all())
    return [
        TestListItem(
            id=t.id, title=t.title, category=t.category, target_type=t.target_type,
            questions_count=counts.get(t.current_version_id, 0),
        )
        for t in tests
    ]


async def _current_version_id(session: AsyncSession, test: Test) -> str | None:
    if test.current_version_id:
        return test.current_version_id
    return (
        await session.execute(
            select(TestVersion.id).where(TestVersion.test_id == test.id)
            .order_by(TestVersion.version_no.desc()).limit(1)
        )
    ).scalar_one_or_none()


async def get_test_detail(session: AsyncSession, test_id: str) -> TestDetail | None:
    test = await session.get(Test, test_id)
    if test is None:
        return None
    version_id = await _current_version_id(session, test)
    questions: list[QuestionView] = []
    if version_id:
        items = (await session.execute(
            select(TestVersionItem).where(TestVersionItem.test_version_id == version_id)
            .order_by(TestVersionItem.sort_order)
        )).scalars().all()
        qv_ids = [it.question_version_id for it in items]
        order = {it.question_version_id: it.sort_order for it in items}
        if qv_ids:
            qvs = (await session.execute(
                select(QuestionVersion).where(QuestionVersion.id.in_(qv_ids))
                .options(selectinload(QuestionVersion.options), selectinload(QuestionVersion.question))
            )).scalars().all()
            comp_ids = [qv.question.competency_id for qv in qvs]
            titles = dict((await session.execute(
                select(Competency.id, Competency.title).where(Competency.id.in_(comp_ids))
            )).all()) if comp_ids else {}
            qvs.sort(key=lambda qv: order.get(qv.id, 0))
            for qv in qvs:
                questions.append(QuestionView(
                    id=qv.id, question_id=qv.question_id, text=qv.text, type=qv.type,
                    competency=titles.get(qv.question.competency_id),
                    max_score=qv.max_score, scale_min=qv.scale_min, scale_max=qv.scale_max,
                    ai_reference=qv.ai_reference, ai_criteria=qv.ai_criteria,
                    sort_order=order.get(qv.id, 0),
                    options=[QuestionOptionView.model_validate(o) for o in qv.options],
                ))
    return TestDetail(
        id=test.id, title=test.title, category=test.category, summary=test.summary,
        target_type=test.target_type, status="published",
        current_version_id=version_id, questions=questions,
        questions_count=len(questions), max_score=sum(q.max_score for q in questions),
    )


# --- Вопросы ---


async def _resolve_competency(session: AsyncSession, org_id: str, name: str | None) -> str:
    name = (name or "Общая компетенция").strip()
    comp = (await session.execute(
        select(Competency).where(Competency.title == name, Competency.organization_id == org_id)
    )).scalar_one_or_none()
    if comp is None:
        comp = Competency(
            id=gen_uuid(), organization_id=org_id, key=_slug(name), title=name,
            kind=CompetencyKind.professional.value,
        )
        session.add(comp)
        await session.flush()
    return comp.id


async def add_question(session: AsyncSession, test_id: str, data: QuestionCreate) -> str | None:
    test = await session.get(Test, test_id)
    if test is None:
        return None
    version_id = await _current_version_id(session, test)
    if version_id is None:
        return None
    comp_id = await _resolve_competency(session, test.organization_id, data.competency_name)

    q = Question(
        organization_id=test.organization_id, competency_id=comp_id,
        scope=QuestionScope.professional.value, is_system=False,
    )
    session.add(q)
    qv = QuestionVersion(
        question=q, version_no=1, type=data.type.value, text=data.text,
        status=VersionStatus.published.value, max_score=_question_max(data),
        scale_min=data.scale_min, scale_max=data.scale_max,
        ai_reference=data.ai_reference, ai_criteria=data.ai_criteria,
    )
    if data.type in (QuestionType.single_choice, QuestionType.multiple_choice):
        for i, opt in enumerate(data.options):
            qv.options.append(AnswerOption(
                text=opt.text, score=opt.score, is_red_flag=opt.is_red_flag,
                is_correct=opt.is_correct, sort_order=i,
            ))
    session.add(qv)
    await session.flush()

    next_order = (await session.execute(
        select(func.coalesce(func.max(TestVersionItem.sort_order), -1))
        .where(TestVersionItem.test_version_id == version_id)
    )).scalar_one() + 1
    session.add(TestVersionItem(
        test_version_id=version_id, question_version_id=qv.id, sort_order=next_order,
    ))
    await session.commit()
    return qv.id


async def delete_question(session: AsyncSession, test_id: str, question_version_id: str) -> bool:
    test = await session.get(Test, test_id)
    if test is None:
        return False
    version_id = await _current_version_id(session, test)
    item = (await session.execute(
        select(TestVersionItem).where(
            TestVersionItem.test_version_id == version_id,
            TestVersionItem.question_version_id == question_version_id,
        )
    )).scalar_one_or_none()
    if item is None:
        return False
    qv = await session.get(QuestionVersion, question_version_id)
    await session.execute(delete(TestVersionItem).where(TestVersionItem.id == item.id))
    if qv is not None:
        # удаляем логический вопрос (каскадом версии и варианты)
        await session.execute(delete(Question).where(Question.id == qv.question_id))
    await session.commit()
    return True
