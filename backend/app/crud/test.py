"""Конструктор тестов: создание тестов и динамическое управление вопросами."""
from collections import defaultdict

from sqlalchemy import delete, func, insert, select
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
    TestVersionCompetency,
    TestVersionItem,
)
from app.schemas.test import (
    CompetencyCreate,
    CompetencyDetail,
    CompetencyRead,
    CompetencyUpdate,
    ProfileCompetency,
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
    comps: list[ProfileCompetency] = []
    if version_id:
        tvc_rows = (await session.execute(
            select(TestVersionCompetency, Competency)
            .join(Competency, Competency.id == TestVersionCompetency.competency_id)
            .where(TestVersionCompetency.test_version_id == version_id)
            .order_by(Competency.title)
        )).all()
        counts = dict((await session.execute(
            select(Question.competency_id, func.count())
            .join(QuestionVersion, QuestionVersion.question_id == Question.id)
            .where(QuestionVersion.status == VersionStatus.published.value)
            .group_by(Question.competency_id)
        )).all())
        comps = [
            ProfileCompetency(competency_id=c.id, title=c.title, kind=c.kind,
                              weight=tvc.weight, questions_count=counts.get(c.id, 0))
            for tvc, c in tvc_rows
        ]
    return TestDetail(
        id=test.id, title=test.title, category=test.category, summary=test.summary,
        target_type=test.target_type, status="published",
        current_version_id=version_id, competencies=comps, questions=questions,
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


# ── Библиотека компетенций ──

def _qv_view(qv, comp_title, order=0) -> QuestionView:
    return QuestionView(
        id=qv.id, question_id=qv.question_id, text=qv.text, type=qv.type,
        competency=comp_title, max_score=qv.max_score,
        scale_min=qv.scale_min, scale_max=qv.scale_max,
        ai_reference=qv.ai_reference, ai_criteria=qv.ai_criteria, sort_order=order,
        options=[QuestionOptionView.model_validate(o) for o in qv.options],
    )


async def _published_qvs_for_competency(session: AsyncSession, comp_id: str):
    """Текущие (published) версии вопросов компетенции, с вариантами."""
    q_ids = (await session.execute(
        select(Question.id).where(Question.competency_id == comp_id)
    )).scalars().all()
    if not q_ids:
        return []
    return (await session.execute(
        select(QuestionVersion)
        .where(QuestionVersion.question_id.in_(q_ids),
               QuestionVersion.status == VersionStatus.published.value)
        .options(selectinload(QuestionVersion.options))
        .order_by(QuestionVersion.created_at)
    )).scalars().all()


async def _competency_q_counts(session: AsyncSession) -> dict:
    return dict((await session.execute(
        select(Question.competency_id, func.count())
        .join(QuestionVersion, QuestionVersion.question_id == Question.id)
        .where(QuestionVersion.status == VersionStatus.published.value)
        .group_by(Question.competency_id)
    )).all())


async def list_competencies(session: AsyncSession) -> list[CompetencyRead]:
    org_id = await _default_org_id(session)
    comps = (await session.execute(
        select(Competency).where(Competency.organization_id == org_id).order_by(Competency.title)
    )).scalars().all()
    counts = await _competency_q_counts(session)
    return [
        CompetencyRead(id=c.id, key=c.key, title=c.title, kind=c.kind,
                       description=c.description, questions_count=counts.get(c.id, 0))
        for c in comps
    ]


async def get_competency_detail(session: AsyncSession, comp_id: str) -> CompetencyDetail | None:
    comp = await session.get(Competency, comp_id)
    if comp is None:
        return None
    qvs = await _published_qvs_for_competency(session, comp_id)
    views = [_qv_view(qv, comp.title, i) for i, qv in enumerate(qvs)]
    return CompetencyDetail(
        id=comp.id, key=comp.key, title=comp.title, kind=comp.kind, description=comp.description,
        questions_count=len(views), questions=views, max_score=sum(v.max_score for v in views),
    )


def _norm_kind(kind: str | None) -> str:
    return CompetencyKind.common.value if (kind or "").lower() == "common" else CompetencyKind.professional.value


async def create_competency(session: AsyncSession, data: CompetencyCreate) -> str:
    org_id = await _default_org_id(session)
    comp = Competency(id=gen_uuid(), organization_id=org_id, key=_slug(data.title),
                      title=data.title, description=data.description, kind=_norm_kind(data.kind))
    session.add(comp)
    await session.commit()
    return comp.id


async def update_competency(session: AsyncSession, comp_id: str, data: CompetencyUpdate) -> bool:
    comp = await session.get(Competency, comp_id)
    if comp is None:
        return False
    if data.title is not None:
        comp.title = data.title
    if data.kind is not None:
        comp.kind = _norm_kind(data.kind)
    if data.description is not None:
        comp.description = data.description
    await session.commit()
    return True


async def delete_competency(session: AsyncSession, comp_id: str) -> bool:
    comp = await session.get(Competency, comp_id)
    if comp is None:
        return False
    affected = await _profiles_using_competency(session, comp_id)
    await session.delete(comp)  # каскад: вопросы, версии, варианты, items, TVC
    await session.commit()
    for test in affected:
        await _rebuild_profile_items(session, test)
    await session.commit()
    return True


async def add_question_to_competency(session: AsyncSession, comp_id: str, data: QuestionCreate) -> str | None:
    comp = await session.get(Competency, comp_id)
    if comp is None:
        return None
    q = Question(organization_id=comp.organization_id, competency_id=comp_id,
                 scope=(QuestionScope.common.value if comp.kind == "common" else QuestionScope.professional.value),
                 is_system=False)
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
    await session.commit()
    for test in await _profiles_using_competency(session, comp_id):
        await _rebuild_profile_items(session, test)
    await session.commit()
    return qv.id


async def delete_competency_question(session: AsyncSession, comp_id: str, question_version_id: str) -> bool:
    qv = await session.get(QuestionVersion, question_version_id)
    if qv is None:
        return False
    q = await session.get(Question, qv.question_id)
    if q is None or q.competency_id != comp_id:
        return False
    affected = await _profiles_using_competency(session, comp_id)
    await session.execute(delete(Question).where(Question.id == q.id))
    await session.commit()
    for test in affected:
        await _rebuild_profile_items(session, test)
    await session.commit()
    return True


# ── Профиль ↔ компетенции ──

async def _profiles_using_competency(session: AsyncSession, comp_id: str):
    return (await session.execute(
        select(Test)
        .join(TestVersion, TestVersion.id == Test.current_version_id)
        .join(TestVersionCompetency, TestVersionCompetency.test_version_id == TestVersion.id)
        .where(TestVersionCompetency.competency_id == comp_id)
    )).scalars().all()


async def _rebuild_profile_items(session: AsyncSession, test: Test) -> None:
    """Пересобирает вопросы профиля = все вопросы его компетенций (по порядку компетенций)."""
    vid = await _current_version_id(session, test)
    if not vid:
        return
    await session.execute(delete(TestVersionItem).where(TestVersionItem.test_version_id == vid))
    comp_ids = (await session.execute(
        select(TestVersionCompetency.competency_id).where(TestVersionCompetency.test_version_id == vid)
    )).scalars().all()
    order = 0
    for cid in comp_ids:
        for qv in await _published_qvs_for_competency(session, cid):
            session.add(TestVersionItem(test_version_id=vid, question_version_id=qv.id, sort_order=order, weight=1.0))
            order += 1


async def add_competency_to_profile(session: AsyncSession, test_id: str, comp_id: str, weight: float = 1.0):
    test = await session.get(Test, test_id)
    if test is None:
        return None
    comp = await session.get(Competency, comp_id)
    if comp is None:
        return None
    vid = await _current_version_id(session, test)
    if vid is None:
        version = TestVersion(test_id=test.id, version_no=1, status=VersionStatus.published.value, published_at=utcnow())
        session.add(version)
        await session.flush()
        test.current_version_id = version.id
        vid = version.id
    existing = (await session.execute(
        select(TestVersionCompetency).where(
            TestVersionCompetency.test_version_id == vid,
            TestVersionCompetency.competency_id == comp_id,
        )
    )).scalar_one_or_none()
    if existing is None:
        session.add(TestVersionCompetency(test_version_id=vid, competency_id=comp_id, weight=weight))
    else:
        existing.weight = weight
    await session.flush()
    await _rebuild_profile_items(session, test)
    await session.commit()
    return await get_test_detail(session, test_id)


async def remove_competency_from_profile(session: AsyncSession, test_id: str, comp_id: str):
    test = await session.get(Test, test_id)
    if test is None:
        return None
    vid = await _current_version_id(session, test)
    if vid:
        await session.execute(delete(TestVersionCompetency).where(
            TestVersionCompetency.test_version_id == vid,
            TestVersionCompetency.competency_id == comp_id,
        ))
        await session.flush()
        await _rebuild_profile_items(session, test)
        await session.commit()
    return await get_test_detail(session, test_id)


def _chunked(seq: list, size: int):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


async def import_library(session: AsyncSession, parsed: dict) -> dict:
    """Загружает компетенции, вопросы и профили из распарсенного Excel.

    Внешние ID маппятся на внутренние; повтор импорта идемпотентен:
    компетенции/профили апсертятся по key, вопросы дедуплицируются по (компетенция, текст).

    Оптимизировано под большие файлы: справочники предзагружаются пакетно
    (без N+1), позиции профилей вставляются bulk-INSERT'ом чанками.
    """
    org_id = await _default_org_id(session)
    result = {
        "competencies_created": 0, "competencies_updated": 0,
        "questions_created": 0, "questions_skipped": 0,
        "profiles_created": 0, "profiles_updated": 0, "errors": [],
    }

    # ── 1. Компетенции (upsert по key) — предзагрузка одним запросом ──
    comp_by_ext: dict[str, Competency] = {
        c.key: c for c in (await session.execute(
            select(Competency).where(Competency.organization_id == org_id)
        )).scalars().all() if c.key
    }
    for c in parsed.get("competencies", []):
        ext = c["ext_id"]
        comp = comp_by_ext.get(ext)
        if comp is None:
            comp = Competency(id=gen_uuid(), organization_id=org_id, key=ext, title=c["title"],
                              description=c["description"], kind=c["kind"])
            session.add(comp)
            comp_by_ext[ext] = comp
            result["competencies_created"] += 1
        else:
            comp.title, comp.description, comp.kind = c["title"], c["description"], c["kind"]
            result["competencies_updated"] += 1
    await session.flush()

    comp_ids = [c.id for c in comp_by_ext.values()]

    # ── 2. Вопросы (дедуп по (компетенция, текст)) — существующие одним запросом ──
    seen_q: set[tuple[str, str]] = set()
    if comp_ids:
        for chunk in _chunked(comp_ids, 500):
            rows = (await session.execute(
                select(Question.competency_id, QuestionVersion.text)
                .join(QuestionVersion, QuestionVersion.question_id == Question.id)
                .where(Question.competency_id.in_(chunk))
            )).all()
            seen_q.update((cid, txt) for cid, txt in rows)

    for q in parsed.get("questions", []):
        comp = comp_by_ext.get(q["competency_ext_id"])
        if comp is None:
            result["errors"].append(f"Вопрос {q['ext_id']}: компетенция «{q['competency_ext_id']}» не найдена")
            continue
        key = (comp.id, q["text"])
        if key in seen_q:
            result["questions_skipped"] += 1
            continue
        seen_q.add(key)  # дедуп и внутри файла
        qtype, opts = q["type"], q["options"]
        if qtype == "single_choice":
            max_score = max((o["score"] for o in opts), default=0)
        elif qtype == "multiple_choice":
            max_score = sum(o["score"] for o in opts if o["score"] > 0)
        elif qtype == "scale":
            max_score = q.get("scale_max") or 5
        else:
            max_score = 5
        ques = Question(
            id=gen_uuid(), organization_id=org_id, competency_id=comp.id,
            scope=(QuestionScope.common.value if comp.kind == "common" else QuestionScope.professional.value),
            is_system=False,
        )
        session.add(ques)
        qv = QuestionVersion(
            id=gen_uuid(), question=ques, version_no=1, type=qtype, text=q["text"],
            status=VersionStatus.published.value, max_score=max_score,
            scale_min=q.get("scale_min"), scale_max=q.get("scale_max"), ai_reference=q.get("ai_reference"),
        )
        if qtype in ("single_choice", "multiple_choice"):
            for i, o in enumerate(opts):
                qv.options.append(AnswerOption(
                    text=o["text"], score=o["score"], is_correct=o["is_correct"],
                    is_red_flag=o["is_red_flag"], sort_order=i,
                ))
        session.add(qv)
        result["questions_created"] += 1
    await session.flush()

    # ── 3. Карта «компетенция → её опубликованные версии вопросов» (один запрос) ──
    qv_by_comp: dict[str, list[str]] = defaultdict(list)
    if comp_ids:
        for chunk in _chunked(comp_ids, 500):
            rows = (await session.execute(
                select(Question.competency_id, QuestionVersion.id)
                .join(QuestionVersion, QuestionVersion.question_id == Question.id)
                .where(Question.competency_id.in_(chunk),
                       QuestionVersion.status == VersionStatus.published.value)
            )).all()
            for cid, qv_id in rows:
                qv_by_comp[cid].append(qv_id)

    # ── 4. Профили (upsert по key) — предзагрузка тестов; bulk-вставка позиций ──
    test_by_key: dict[str, Test] = {
        t.key: t for t in (await session.execute(
            select(Test).where(Test.organization_id == org_id)
        )).scalars().all() if t.key
    }
    versions_to_clear: list[str] = []
    tvc_rows: list[dict] = []  # TestVersionCompetency
    tvi_rows: list[dict] = []  # TestVersionItem

    for p in parsed.get("profiles", []):
        ext = p["ext_id"]
        summary = f"≈{p['duration']} мин" if p.get("duration") else None
        test = test_by_key.get(ext)
        if test is None:
            test = Test(id=gen_uuid(), organization_id=org_id, key=ext, title=p["title"],
                        category=p["category"], target_type=p["target_type"], summary=summary, is_system=False)
            version = TestVersion(id=gen_uuid(), test_id=test.id, version_no=1,
                                  status=VersionStatus.published.value, published_at=utcnow())
            test.current_version_id = version.id
            session.add(test)
            session.add(version)
            test_by_key[ext] = test
            version_id = version.id
            result["profiles_created"] += 1
        else:
            test.title, test.category, test.target_type = p["title"], p["category"], p["target_type"]
            if summary:
                test.summary = summary
            version_id = test.current_version_id
            if not version_id:
                version = TestVersion(id=gen_uuid(), test_id=test.id, version_no=1,
                                      status=VersionStatus.published.value, published_at=utcnow())
                session.add(version)
                test.current_version_id = version.id
                version_id = version.id
            else:
                versions_to_clear.append(version_id)
            result["profiles_updated"] += 1

        order, seen = 0, set()
        for pc in p["competencies"]:
            comp = comp_by_ext.get(pc["competency_ext_id"])
            if comp is None:
                result["errors"].append(f"Профиль «{ext}»: компетенция «{pc['competency_ext_id']}» не найдена")
                continue
            if comp.id in seen:
                continue
            seen.add(comp.id)
            tvc_rows.append({"id": gen_uuid(), "test_version_id": version_id,
                             "competency_id": comp.id, "weight": float(pc["weight"])})
            for qv_id in qv_by_comp.get(comp.id, []):
                tvi_rows.append({"id": gen_uuid(), "test_version_id": version_id,
                                 "question_version_id": qv_id, "sort_order": order, "weight": 1.0})
                order += 1

    await session.flush()  # материализуем новые Test/TestVersion перед FK-вставками

    # Перестройка существующих версий: чистим старые позиции пакетно.
    for chunk in _chunked(versions_to_clear, 500):
        await session.execute(delete(TestVersionItem).where(TestVersionItem.test_version_id.in_(chunk)))
        await session.execute(delete(TestVersionCompetency).where(TestVersionCompetency.test_version_id.in_(chunk)))

    # Bulk-вставка позиций (десятки/сотни тысяч строк) чанками.
    for chunk in _chunked(tvc_rows, 5000):
        await session.execute(insert(TestVersionCompetency), chunk)
    for chunk in _chunked(tvi_rows, 5000):
        await session.execute(insert(TestVersionItem), chunk)

    await session.commit()
    return result


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
