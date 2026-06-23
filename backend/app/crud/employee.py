"""Операции с сотрудниками, отделами и оргструктурой."""
from collections.abc import Sequence

from pydantic import ValidationError
from sqlalchemy import and_, asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.org_context import get_current_org

from app.models.assessment import AssessmentSession, SessionCompetencyScore
from app.models.base import gen_uuid, utcnow
from app.models.catalog import Competency, Department
from app.models.enums import (
    CompetencyKind,
    RespondentType,
    RiskLevel,
    SessionStatus,
)
from app.models.organization import Organization
from app.models.person import CandidateProfile, EmployeeProfile, Person
from app.models.test import Test, TestVersion
from app.schemas.employee import (
    DepartmentCreate,
    DepartmentRead,
    DeptBreakdown,
    EmployeeCreate,
    EmployeeRead,
    EmployeeResultIn,
    EmployeeStats,
    OrgNode,
    OrgTree,
    RiskBreakdown,
    StructureMemberCreate,
)

HIGH = 80
MEDIUM = 60

SORTABLE = {
    "full_name": Person.full_name,
    "position": EmployeeProfile.position,
    "fit": EmployeeProfile.fit,
    "satisfaction": EmployeeProfile.satisfaction,
    "created_at": Person.created_at,
}


async def _default_org_id(session: AsyncSession) -> str:
    org_id = (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()
    if org_id is None:
        org = Organization(name="Eltera Demo Company")
        session.add(org)
        await session.flush()
        org_id = org.id
    return org_id


async def _org(session: AsyncSession) -> str:
    return get_current_org() or await _default_org_id(session)


def _owns(org_id) -> bool:
    cur = get_current_org()
    return cur is None or org_id == cur


def _compose_name(data) -> str:
    if getattr(data, "full_name", None):
        return data.full_name
    parts = [data.last_name, data.first_name, data.patronymic]
    return " ".join(p for p in parts if p) or "Без имени"


async def _names_map(session: AsyncSession, person_ids) -> dict[str, str]:
    ids = [i for i in person_ids if i]
    if not ids:
        return {}
    rows = (
        await session.execute(select(Person.id, Person.full_name).where(Person.id.in_(ids)))
    ).all()
    return dict(rows)


def _read(person: Person, ep: EmployeeProfile, dept_name, manager_name) -> EmployeeRead:
    return EmployeeRead(
        id=person.id,
        full_name=person.full_name,
        email=person.email,
        phone=person.phone,
        city=person.city,
        department_id=ep.department_id,
        department=dept_name,
        position=ep.position,
        manager_id=ep.manager_id,
        manager=manager_name,
        project=ep.project,
        start_date=ep.start_date,
        employment_type=ep.employment_type,
        turnover_risk=ep.turnover_risk,
        burnout=ep.burnout,
        satisfaction=ep.satisfaction,
        recommendation=ep.recommendation,
        fit=ep.fit,
        created_at=person.created_at,
    )


# --- Сотрудники ---


async def list_employees(
    session: AsyncSession,
    *,
    page: int = 1,
    size: int = 20,
    sort_by: str = "full_name",
    order: str = "asc",
    search: str | None = None,
    department_id: str | None = None,
    turnover_risk: str | None = None,
    manager_id: str | None = None,
    project: str | None = None,
) -> tuple[Sequence[EmployeeRead], int]:
    conditions = []
    _org = get_current_org()
    if _org is not None:
        conditions.append(Person.organization_id == _org)
    if search:
        pattern = f"%{search.lower()}%"
        conditions.append(
            or_(func.lower(Person.full_name).like(pattern), func.lower(Person.email).like(pattern))
        )
    if department_id:
        conditions.append(EmployeeProfile.department_id == department_id)
    if turnover_risk:
        conditions.append(EmployeeProfile.turnover_risk == turnover_risk)
    if manager_id:
        conditions.append(EmployeeProfile.manager_id == manager_id)
    if project:
        conditions.append(EmployeeProfile.project == project)

    count_stmt = (
        select(func.count())
        .select_from(EmployeeProfile)
        .join(Person, Person.id == EmployeeProfile.person_id)
    )
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total = (await session.execute(count_stmt)).scalar_one()

    column = SORTABLE.get(sort_by, Person.full_name)
    direction = asc if order == "asc" else desc
    stmt = (
        select(Person, EmployeeProfile, Department.name.label("dept"))
        .join(EmployeeProfile, EmployeeProfile.person_id == Person.id)
        .outerjoin(Department, Department.id == EmployeeProfile.department_id)
    )
    if conditions:
        stmt = stmt.where(*conditions)
    stmt = stmt.order_by(direction(column)).offset((page - 1) * size).limit(size)
    rows = (await session.execute(stmt)).all()

    manager_names = await _names_map(session, [r.EmployeeProfile.manager_id for r in rows])
    items = [
        _read(r.Person, r.EmployeeProfile, r.dept, manager_names.get(r.EmployeeProfile.manager_id))
        for r in rows
    ]
    return items, total


async def get_employee(session: AsyncSession, person_id: str) -> EmployeeRead | None:
    person = await session.get(Person, person_id)
    if person is None or person.employee_profile is None or not _owns(person.organization_id):
        return None
    ep = person.employee_profile
    dept_name = None
    if ep.department_id:
        dept_name = (
            await session.execute(select(Department.name).where(Department.id == ep.department_id))
        ).scalar_one_or_none()
    manager_name = None
    if ep.manager_id:
        manager_name = (
            await session.execute(select(Person.full_name).where(Person.id == ep.manager_id))
        ).scalar_one_or_none()
    return _read(person, ep, dept_name, manager_name)


async def _resolve_department(session, org_id, dept_id, dept_name) -> str | None:
    if dept_id:
        return dept_id
    if not dept_name:
        return None
    dept = (
        await session.execute(
            select(Department).where(Department.name == dept_name, Department.organization_id == org_id)
        )
    ).scalar_one_or_none()
    if dept is None:
        dept = Department(organization_id=org_id, name=dept_name)
        session.add(dept)
        await session.flush()
    return dept.id


async def _resolve_manager(session, org_id, manager_id, manager_name) -> str | None:
    if manager_id:
        return manager_id
    if not manager_name:
        return None
    return (
        await session.execute(
            select(Person.id).where(Person.full_name == manager_name, Person.organization_id == org_id)
        )
    ).scalar_one_or_none()


async def create_employee(session: AsyncSession, data: EmployeeCreate) -> str:
    org_id = await _org(session)
    dept_id = await _resolve_department(session, org_id, data.department_id, data.department_name)
    manager_id = await _resolve_manager(session, org_id, data.manager_id, data.manager_name)
    person = Person(
        organization_id=org_id,
        last_name=data.last_name, first_name=data.first_name, patronymic=data.patronymic,
        full_name=_compose_name(data), email=data.email, phone=data.phone, city=data.city,
    )
    person.employee_profile = EmployeeProfile(
        department_id=dept_id, position=data.position, manager_id=manager_id,
        project=data.project, start_date=data.start_date, employment_type=data.employment_type,
        turnover_risk=data.turnover_risk.value, burnout=data.burnout,
        satisfaction=data.satisfaction, recommendation=data.recommendation, fit=data.fit,
    )
    session.add(person)
    await session.commit()
    return person.id


async def convert_candidate_to_employee(session: AsyncSession, person_id: str, data) -> str | None:
    """Транзакция «кандидат → сотрудник»: тому же Person создаём employee_profile
    и удаляем candidate_profile. Возвращает person_id, либо строку-причину отказа
    ('not_candidate'/'already_employee'), либо None если человек не найден."""
    person = await session.get(Person, person_id)
    if person is None or not _owns(person.organization_id):
        return None
    cand = (await session.execute(
        select(CandidateProfile).where(CandidateProfile.person_id == person_id)
    )).scalar_one_or_none()
    if cand is None:
        return "not_candidate"
    existing = (await session.execute(
        select(EmployeeProfile).where(EmployeeProfile.person_id == person_id)
    )).scalar_one_or_none()
    if existing is not None:
        return "already_employee"

    org_id = person.organization_id or await _default_org_id(session)
    dept_id = await _resolve_department(session, org_id, data.department_id, data.department_name)
    manager_id = await _resolve_manager(session, org_id, data.manager_id, data.manager_name)

    fit = None
    if data.carry_fit:
        fit = (await session.execute(
            select(AssessmentSession.percent)
            .where(AssessmentSession.person_id == person_id, AssessmentSession.percent.isnot(None))
            .order_by(AssessmentSession.submitted_at.desc())
            .limit(1)
        )).scalar_one_or_none()

    session.add(EmployeeProfile(
        person_id=person_id, department_id=dept_id, position=data.position,
        manager_id=manager_id, project=data.project, start_date=data.start_date,
        employment_type=data.employment_type, fit=fit,
    ))
    await session.delete(cand)
    await session.commit()
    return person_id


async def import_employees(session: AsyncSession, rows: list[dict]):
    """Создаёт сотрудников из распарсенных строк Excel.

    - дедупликация по e-mail (если есть), иначе по ФИО — дубли пропускаются;
    - руководитель назначается по ФИО (в т.ч. если он добавлен в этом же файле);
    - на каждую проблемную строку — запись в errors, импорт не прерывается.
    """
    from app.schemas.employee import ImportResult, ImportRowError

    org_id = await _org(session)
    existing = (await session.execute(
        select(Person.full_name, Person.email).where(Person.organization_id == org_id)
    )).all()
    seen_emails = {e.lower() for _, e in existing if e}
    seen_names = {(n or "").strip().lower() for n, _ in existing if n}

    result = ImportResult(total=len(rows))
    created_rows: list[tuple[str, str | None]] = []  # (person_id, manager_name)
    welcome_targets: list[tuple[str, str]] = []      # (full_name, email) для welcome-писем

    for rec in rows:
        row_no = rec.get("_row", 0)
        full_name = (rec.get("full_name") or "").strip()
        if not full_name:
            result.errors.append(ImportRowError(row=row_no, reason="Не заполнено ФИО"))
            continue
        email = rec.get("email") or None
        email_l = email.lower() if email else None
        name_l = full_name.lower()
        if email_l and email_l in seen_emails:
            result.skipped += 1
            result.errors.append(ImportRowError(row=row_no, reason=f"Пропущен: e-mail {email} уже есть"))
            continue
        if not email_l and name_l in seen_names:
            result.skipped += 1
            result.errors.append(ImportRowError(row=row_no, reason=f"Пропущен: «{full_name}» уже есть"))
            continue
        try:
            data = EmployeeCreate(
                full_name=full_name, email=email, phone=rec.get("phone"),
                city=rec.get("city"), position=rec.get("position"),
                department_name=rec.get("department_name"), manager_name=rec.get("manager_name"),
                project=rec.get("project"), start_date=rec.get("start_date"),
                employment_type=rec.get("employment_type"),
                # Импортированный сотрудник ещё не оценён: fit = NULL, риск = «none» («—»).
                turnover_risk=RiskLevel.none,
            )
        except ValidationError as exc:
            msgs = "; ".join(e.get("msg", "") for e in exc.errors())
            result.errors.append(ImportRowError(row=row_no, reason=f"Ошибка данных: {msgs}"))
            continue

        pid = await create_employee(session, data)
        created_rows.append((pid, rec.get("manager_name")))
        result.created += 1
        result.created_names.append(full_name)
        if email:
            welcome_targets.append((full_name, email))
        if email_l:
            seen_emails.add(email_l)
        seen_names.add(name_l)

    # Второй проход: назначаем руководителей, которые в файле идут ниже подчинённых.
    if created_rows:
        name_to_id = {
            n: i for n, i in (await session.execute(
                select(Person.full_name, Person.id).where(Person.organization_id == org_id)
            )).all()
        }
        changed = False
        for pid, mname in created_rows:
            if not mname:
                continue
            ep = await session.get(EmployeeProfile, pid)
            if ep is not None and ep.manager_id is None:
                mid = name_to_id.get(mname)
                if mid and mid != pid:
                    ep.manager_id = mid
                    changed = True
        if changed:
            await session.commit()

    # Welcome-письма новым сотрудникам (если включено и есть e-mail).
    if welcome_targets:
        from app.core.config import get_settings
        from app.services import email as email_service
        if get_settings().welcome_email_on_import:
            for full_name, to in welcome_targets:
                try:
                    await email_service.send_welcome(to=to, full_name=full_name)
                except Exception:  # noqa: BLE001
                    import logging
                    logging.getLogger("eltera.email").exception("welcome email failed for %s", to)

    return result


async def update_employee(session: AsyncSession, person_id: str, data) -> bool:
    person = await session.get(Person, person_id)
    if person is None or person.employee_profile is None or not _owns(person.organization_id):
        return False
    ep = person.employee_profile
    changes = data.model_dump(exclude_unset=True)
    person_fields = {"last_name", "first_name", "patronymic", "full_name", "email", "phone", "city"}
    for field, value in changes.items():
        if field == "turnover_risk" and value is not None:
            value = value.value if hasattr(value, "value") else value
        if field in person_fields:
            setattr(person, field, value)
        else:
            setattr(ep, field, value)
    if "full_name" not in changes and person_fields & set(changes):
        composed = " ".join(p for p in [person.last_name, person.first_name, person.patronymic] if p)
        if composed:
            person.full_name = composed
    await session.commit()
    # Сдвиг даты выхода → пересчитать цикл адаптации (или создать, если появилась дата).
    if "start_date" in changes:
        from app.services.adaptation import resync_or_create_for_person
        await resync_or_create_for_person(session, person_id)
    return True


async def delete_employee(session: AsyncSession, person_id: str) -> bool:
    person = await session.get(Person, person_id)
    if person is None or person.employee_profile is None or not _owns(person.organization_id):
        return False
    await session.delete(person)
    await session.commit()
    return True


def _slug(title: str) -> str:
    return title.strip().lower().replace(" ", "_")[:80] or "competency"


async def record_employee_result(
    session: AsyncSession, person_id: str, data: EmployeeResultIn
) -> str | None:
    """Записывает результат оценки сотрудника: сессия + баллы по компетенциям,
    обновляет fit/рекомендацию сотрудника. Возвращает id сессии или None."""
    person = await session.get(Person, person_id)
    if person is not None and not _owns(person.organization_id):
        return None
    if person is None or person.employee_profile is None:
        return None

    test = (await session.execute(select(Test).order_by(Test.created_at).limit(1))).scalar_one_or_none()
    if test is None:
        raise ValueError("В системе нет ни одного теста для записи результата.")
    version_id = test.current_version_id
    if not version_id:
        version_id = (
            await session.execute(
                select(TestVersion.id).where(TestVersion.test_id == test.id)
                .order_by(TestVersion.version_no.desc()).limit(1)
            )
        ).scalar_one_or_none()
    if not version_id:
        raise ValueError("У теста нет версии.")

    now = utcnow()
    sess = AssessmentSession(
        organization_id=person.organization_id,
        person_id=person.id,
        test_id=test.id,
        test_version_id=version_id,
        respondent_type=RespondentType.employee.value,
        status=SessionStatus.scored.value,
        score=data.score, max_score=data.max_score, percent=data.percent,
        red_flags=data.red_flags, recommendation_text=data.recommendation_text,
        answers_snapshot=[a.model_dump() for a in data.answers] or None,
        started_at=now, submitted_at=now, scored_at=now,
    )
    session.add(sess)
    await session.flush()

    for comp in data.competencies:
        competency = (
            await session.execute(
                select(Competency).where(
                    Competency.title == comp.name,
                    Competency.organization_id == person.organization_id,
                )
            )
        ).scalar_one_or_none()
        if competency is None:
            competency = Competency(
                id=gen_uuid(), organization_id=person.organization_id,
                key=_slug(comp.name), title=comp.name, kind=CompetencyKind.professional.value,
            )
            session.add(competency)
            await session.flush()
        percent = round(comp.score / comp.max_score * 100) if comp.max_score else 0
        session.add(SessionCompetencyScore(
            session_id=sess.id, competency_id=competency.id,
            score=comp.score, max_score=comp.max_score, percent=percent,
        ))

    # Обновляем карточку сотрудника по результату.
    ep = person.employee_profile
    ep.fit = data.percent
    if data.recommendation_text:
        ep.recommendation = data.recommendation_text

    await session.commit()
    return sess.id


async def get_employee_stats(session: AsyncSession) -> EmployeeStats:
    _org = get_current_org()
    _ef = [EmployeeProfile.person_id == Person.id] + ([Person.organization_id == _org] if _org else [])

    async def scalar(stmt) -> int:
        return (await session.execute(stmt)).scalar_one()

    def base():
        stmt = select(func.count()).select_from(EmployeeProfile).join(Person, Person.id == EmployeeProfile.person_id)
        if _org is not None:
            stmt = stmt.where(Person.organization_id == _org)
        return stmt

    def _avg(col):
        stmt = select(func.coalesce(func.avg(col), 0.0)).select_from(EmployeeProfile)
        if _org is not None:
            stmt = stmt.join(Person, Person.id == EmployeeProfile.person_id).where(Person.organization_id == _org)
        return stmt

    # fit может быть NULL («не оценён») — такие сотрудники не попадают ни в один
    # из порогов (NULL-сравнения → false), т.е. не считаются «низкими».
    fit = EmployeeProfile.fit
    total = await scalar(base())
    high = await scalar(base().where(fit >= HIGH))
    medium = await scalar(base().where(fit >= MEDIUM, fit < HIGH))
    low = await scalar(base().where(fit.isnot(None), fit < MEDIUM))
    # «В зоне риска» — только реально оценённые со средним/высоким риском.
    # «low» и «none» (не оценён) сюда не входят, чтобы не искажать аналитику.
    at_risk = await scalar(base().where(
        EmployeeProfile.turnover_risk.notin_([RiskLevel.low.value, RiskLevel.none.value])
    ))
    burnout = await scalar(
        base().where(
            EmployeeProfile.burnout.isnot(None),
            func.lower(EmployeeProfile.burnout).notin_(["нет", "—", ""]),
        )
    )
    avg_sat = float((await session.execute(_avg(EmployeeProfile.satisfaction))).scalar_one())
    avg_fit = float((await session.execute(_avg(EmployeeProfile.fit))).scalar_one())

    dept_stmt = (
        select(func.coalesce(Department.name, "Без отдела"), func.count())
        .select_from(EmployeeProfile)
        .join(Person, Person.id == EmployeeProfile.person_id)
        .outerjoin(Department, Department.id == EmployeeProfile.department_id)
    )
    risk_stmt = (
        select(EmployeeProfile.turnover_risk, func.count())
        .select_from(EmployeeProfile)
        .join(Person, Person.id == EmployeeProfile.person_id)
    )
    if _org is not None:
        dept_stmt = dept_stmt.where(Person.organization_id == _org)
        risk_stmt = risk_stmt.where(Person.organization_id == _org)
    dept_rows = (await session.execute(
        dept_stmt.group_by(Department.name).order_by(func.count().desc())
    )).all()
    by_department = [DeptBreakdown(department=d, count=c) for d, c in dept_rows]

    risk_rows = (await session.execute(
        risk_stmt.group_by(EmployeeProfile.turnover_risk).order_by(func.count().desc())
    )).all()
    by_risk = [RiskBreakdown(level=lvl, count=c) for lvl, c in risk_rows]

    return EmployeeStats(
        total=total, high_result=high, medium_result=medium, low_result=low,
        at_risk=at_risk, burnout=burnout,
        avg_satisfaction=round(avg_sat, 1), avg_fit=round(avg_fit, 1),
        by_department=by_department, by_risk=by_risk,
    )


# --- Отделы ---


async def list_departments(session: AsyncSession) -> list[DepartmentRead]:
    depts = (await session.execute(select(Department).order_by(Department.name))).scalars().all()
    head_names = await _names_map(session, [d.head_person_id for d in depts])
    counts = dict((await session.execute(
        select(EmployeeProfile.department_id, func.count())
        .group_by(EmployeeProfile.department_id)
    )).all())
    return [
        DepartmentRead(
            id=d.id, name=d.name, head_person_id=d.head_person_id,
            head_name=head_names.get(d.head_person_id),
            parent_department_id=d.parent_department_id,
            employees_count=counts.get(d.id, 0),
        )
        for d in depts
    ]


async def create_department(session: AsyncSession, data: DepartmentCreate) -> str:
    org_id = await _org(session)
    dept = Department(
        organization_id=org_id, name=data.name,
        head_person_id=data.head_person_id, parent_department_id=data.parent_department_id,
    )
    session.add(dept)
    await session.commit()
    return dept.id


# --- Оргструктура ---


async def build_org_tree(session: AsyncSession) -> OrgTree:
    _org = get_current_org()
    _tree_stmt = (
        select(Person, EmployeeProfile, Department.name.label("dept"))
        .join(EmployeeProfile, EmployeeProfile.person_id == Person.id)
        .outerjoin(Department, Department.id == EmployeeProfile.department_id)
    )
    _dept_stmt = select(Department)
    if _org is not None:
        _tree_stmt = _tree_stmt.where(Person.organization_id == _org)
        _dept_stmt = _dept_stmt.where(Department.organization_id == _org)
    rows = (await session.execute(_tree_stmt)).all()
    depts = (await session.execute(_dept_stmt)).scalars().all()
    heads = {d.head_person_id for d in depts if d.head_person_id}

    node_map: dict[str, OrgNode] = {}
    for r in rows:
        p, ep = r.Person, r.EmployeeProfile
        role = "ceo" if ep.manager_id is None else "head" if p.id in heads else "employee"
        node_map[p.id] = OrgNode(
            id=p.id, full_name=p.full_name, position=ep.position, department=r.dept,
            role=role, manager_id=ep.manager_id, fit=ep.fit, children=[],
        )

    roots: list[OrgNode] = []
    for node in node_map.values():
        if node.manager_id and node.manager_id in node_map:
            node_map[node.manager_id].children.append(node)
        else:
            roots.append(node)

    return OrgTree(nodes=roots, total_people=len(node_map), total_departments=len(depts))


async def add_structure_member(session: AsyncSession, data: StructureMemberCreate) -> str:
    org_id = await _org(session)
    dept_id = await _resolve_department(session, org_id, data.department_id, data.department_name)
    person = Person(organization_id=org_id, full_name=data.full_name)
    person.employee_profile = EmployeeProfile(
        department_id=dept_id, position=data.position, manager_id=data.manager_id, project=data.project,
    )
    session.add(person)
    await session.flush()
    if data.role == "head" and dept_id:
        dept = await session.get(Department, dept_id)
        if dept is not None:
            dept.head_person_id = person.id
    await session.commit()
    return person.id
