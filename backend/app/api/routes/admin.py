"""Отдельная админ-панель: правка «несущественных» деталей профилей, направлений
и компетенций — для общего каталога (org IS NULL) или конкретной организации.

Вход по спец-логину/паролю из окружения (см. Settings.admin_panel_*), полностью
отдельно от аккаунтов организаций. Роуты работают напрямую с моделями, без
орг-скоупленных CRUD-хелперов (те завязаны на contextvar текущей организации).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_admin_panel
from app.core.security import create_admin_panel_token, verify_admin_panel_credentials
from app.core.taxonomy import DIRECTIONS, LEVEL_CODES, LEVELS, UNIVERSAL
from app.models.base import gen_uuid
from app.models.catalog import Competency
from app.models.organization import Organization
from app.models.test import (
    Category,
    Test,
    TestCategory,
    TestLevel,
    TestVersion,
    TestVersionCompetency,
    TestVersionItem,
)
from app.schemas.admin import (
    AdminCategory,
    AdminCompetency,
    AdminCompetencyUpdate,
    AdminLoginIn,
    AdminProfile,
    AdminProfileUpdate,
    AdminTokenOut,
    CategoryCreate,
    CategoryUpdate,
    CloneIn,
    CloneOut,
    OrgOption,
    ProfileCategoriesIn,
    ProfileLevelsIn,
    ProfileCategory,
    Taxonomy,
)

router = APIRouter(prefix="/admin", tags=["admin-panel"])

_admin = [Depends(get_admin_panel)]


# ── Аутентификация ──
@router.post("/login", response_model=AdminTokenOut, summary="Вход в админ-панель")
async def admin_login(data: AdminLoginIn):
    from app.core.config import get_settings

    if not get_settings().admin_panel_password:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Админ-панель не настроена: задайте ADMIN_PANEL_PASSWORD в окружении.",
        )
    if not verify_admin_panel_credentials(data.username, data.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный логин или пароль")
    token, ttl = create_admin_panel_token()
    return AdminTokenOut(token=token, expires_in=ttl)


# ── Организации / таксономия ──
@router.get("/organizations", response_model=list[OrgOption], dependencies=_admin, summary="Список организаций")
async def list_organizations(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(Organization.id, Organization.name).order_by(Organization.name)
    )).all()
    return [OrgOption(id=oid, name=name) for oid, name in rows]


@router.get("/taxonomy", response_model=Taxonomy, dependencies=_admin, summary="Таксономия (направления, черты, уровни)")
async def get_taxonomy():
    return Taxonomy(
        directions=[{"slug": s, "title": t} for s, t in DIRECTIONS],
        universal=[{"slug": s, "title": t} for s, t in UNIVERSAL],
        levels=[{"code": c, "title": t} for c, t in LEVELS],
    )


# ── Профили (тесты) ──
def _scope_clause(scope: str):
    """scope='all' → общий каталог (org IS NULL); иначе конкретная организация."""
    if scope == "all":
        return Test.organization_id.is_(None)
    return Test.organization_id == scope


async def _load_profile(session: AsyncSession, test_id: str) -> Test:
    test = await session.get(Test, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль не найден")
    return test


async def _profile_extras(session: AsyncSession, test_ids: list[str]):
    """Категории и уровни для набора профилей (батч)."""
    cats: dict[str, list[ProfileCategory]] = {}
    levels: dict[str, list[str]] = {}
    if not test_ids:
        return cats, levels
    for tid, slug, title, kind in (await session.execute(
        select(TestCategory.test_id, Category.slug, Category.title, Category.kind)
        .join(Category, Category.id == TestCategory.category_id)
        .where(TestCategory.test_id.in_(test_ids))
    )).all():
        cats.setdefault(tid, []).append(ProfileCategory(slug=slug, title=title, kind=kind))
    for tid, lvl in (await session.execute(
        select(TestLevel.test_id, TestLevel.level).where(TestLevel.test_id.in_(test_ids))
    )).all():
        levels.setdefault(tid, []).append(lvl)
    return cats, levels


async def _question_counts(session: AsyncSession, version_ids: list[str]) -> dict[str, int]:
    if not version_ids:
        return {}
    return dict((await session.execute(
        select(TestVersionItem.test_version_id, func.count())
        .where(TestVersionItem.test_version_id.in_(version_ids))
        .group_by(TestVersionItem.test_version_id)
    )).all())


@router.get("/profiles", response_model=list[AdminProfile], dependencies=_admin, summary="Профили в scope")
async def list_profiles(
    scope: str = Query("all", description="'all' (общий каталог) или id организации"),
    q: str | None = Query(None, description="Поиск по названию"),
    target_type: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Test).where(_scope_clause(scope))
    if target_type:
        stmt = stmt.where(Test.target_type == target_type)
    if q and q.strip():
        stmt = stmt.where(Test.title.ilike(f"%{q.strip()}%"))
    tests = (await session.execute(stmt.order_by(Test.title))).scalars().all()
    test_ids = [t.id for t in tests]
    version_ids = [t.current_version_id for t in tests if t.current_version_id]
    counts = await _question_counts(session, version_ids)
    cats, levels = await _profile_extras(session, test_ids)
    return [
        AdminProfile(
            id=t.id, organization_id=t.organization_id, title=t.title,
            summary=t.summary, category=t.category, target_type=t.target_type,
            time_limit_minutes=t.time_limit_minutes,
            questions_count=counts.get(t.current_version_id, 0),
            categories=cats.get(t.id, []), levels=levels.get(t.id, []),
        )
        for t in tests
    ]


@router.get("/profiles/{test_id}", response_model=AdminProfile, dependencies=_admin, summary="Профиль")
async def get_profile(test_id: str, session: AsyncSession = Depends(get_session)):
    test = await _load_profile(session, test_id)
    counts = await _question_counts(session, [test.current_version_id] if test.current_version_id else [])
    cats, levels = await _profile_extras(session, [test.id])
    return AdminProfile(
        id=test.id, organization_id=test.organization_id, title=test.title,
        summary=test.summary, category=test.category, target_type=test.target_type,
        time_limit_minutes=test.time_limit_minutes,
        questions_count=counts.get(test.current_version_id, 0),
        categories=cats.get(test.id, []), levels=levels.get(test.id, []),
    )


@router.patch("/profiles/{test_id}", response_model=AdminProfile, dependencies=_admin, summary="Обновить профиль")
async def update_profile(test_id: str, data: AdminProfileUpdate, session: AsyncSession = Depends(get_session)):
    test = await _load_profile(session, test_id)
    fields = data.model_dump(exclude_unset=True)
    if "target_type" in fields and fields["target_type"] is not None:
        fields["target_type"] = fields["target_type"].value
    for field, value in fields.items():
        setattr(test, field, value)
    await session.commit()
    return await get_profile(test_id, session)


@router.put("/profiles/{test_id}/categories", dependencies=_admin, summary="Задать категории профиля")
async def set_profile_categories(test_id: str, data: ProfileCategoriesIn, session: AsyncSession = Depends(get_session)):
    await _load_profile(session, test_id)
    ids = (await session.execute(
        select(Category.id).where(Category.slug.in_(data.slugs))
    )).scalars().all() if data.slugs else []
    await session.execute(TestCategory.__table__.delete().where(TestCategory.test_id == test_id))
    for cid in ids:
        session.add(TestCategory(test_id=test_id, category_id=cid))
    await session.commit()
    return {"ok": True, "count": len(ids)}


@router.put("/profiles/{test_id}/levels", dependencies=_admin, summary="Задать уровни должности профиля")
async def set_profile_levels(test_id: str, data: ProfileLevelsIn, session: AsyncSession = Depends(get_session)):
    await _load_profile(session, test_id)
    valid = [lv for lv in data.levels if lv in LEVEL_CODES]
    await session.execute(TestLevel.__table__.delete().where(TestLevel.test_id == test_id))
    for lv in valid:
        session.add(TestLevel(test_id=test_id, level=lv))
    await session.commit()
    return {"ok": True, "count": len(valid)}


@router.post("/profiles/{test_id}/clone", response_model=CloneOut, dependencies=_admin, summary="Скопировать профиль в организацию")
async def clone_profile(test_id: str, data: CloneIn, session: AsyncSession = Depends(get_session)):
    src = await _load_profile(session, test_id)
    org = await session.get(Organization, data.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Организация не найдена")

    new_test = Test(
        id=gen_uuid(), organization_id=org.id, key=src.key, title=src.title,
        category=src.category, target_type=src.target_type, summary=src.summary,
        time_limit_minutes=src.time_limit_minutes, is_system=False,
    )
    session.add(new_test)
    await session.flush()

    # Версии + их состав (вопросы шарим — ссылаемся на те же question_version_id).
    versions = (await session.execute(
        select(TestVersion).where(TestVersion.test_id == src.id)
    )).scalars().all()
    version_map: dict[str, str] = {}
    for v in versions:
        nv = TestVersion(
            id=gen_uuid(), test_id=new_test.id, version_no=v.version_no,
            status=v.status, notes=v.notes, published_at=v.published_at,
        )
        session.add(nv)
        await session.flush()
        version_map[v.id] = nv.id
        items = (await session.execute(
            select(TestVersionItem).where(TestVersionItem.test_version_id == v.id)
        )).scalars().all()
        for it in items:
            session.add(TestVersionItem(
                id=gen_uuid(), test_version_id=nv.id,
                question_version_id=it.question_version_id,
                sort_order=it.sort_order, weight=it.weight,
            ))
        comps = (await session.execute(
            select(TestVersionCompetency).where(TestVersionCompetency.test_version_id == v.id)
        )).scalars().all()
        for c in comps:
            session.add(TestVersionCompetency(
                id=gen_uuid(), test_version_id=nv.id,
                competency_id=c.competency_id, weight=c.weight,
            ))
    if src.current_version_id:
        new_test.current_version_id = version_map.get(src.current_version_id)

    # Категории и уровни.
    for (cid,) in (await session.execute(
        select(TestCategory.category_id).where(TestCategory.test_id == src.id)
    )).all():
        session.add(TestCategory(test_id=new_test.id, category_id=cid))
    for (lvl,) in (await session.execute(
        select(TestLevel.level).where(TestLevel.test_id == src.id)
    )).all():
        session.add(TestLevel(test_id=new_test.id, level=lvl))

    await session.commit()
    return CloneOut(id=new_test.id, organization_id=org.id)


# ── Направления/черты (Category) ──
@router.get("/categories", response_model=list[AdminCategory], dependencies=_admin, summary="Справочник направлений/черт")
async def list_categories(session: AsyncSession = Depends(get_session)):
    cats = (await session.execute(
        select(Category).order_by(Category.kind, Category.sort_order, Category.title)
    )).scalars().all()
    return [
        AdminCategory(id=c.id, slug=c.slug, title=c.title, kind=c.kind, sort_order=c.sort_order)
        for c in cats
    ]


@router.post("/categories", response_model=AdminCategory, status_code=status.HTTP_201_CREATED, dependencies=_admin, summary="Создать направление/черту")
async def create_category(data: CategoryCreate, session: AsyncSession = Depends(get_session)):
    exists = (await session.execute(select(Category).where(Category.slug == data.slug))).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Слаг уже используется")
    cat = Category(id=gen_uuid(), slug=data.slug, title=data.title, kind=data.kind, sort_order=data.sort_order)
    session.add(cat)
    await session.commit()
    return AdminCategory(id=cat.id, slug=cat.slug, title=cat.title, kind=cat.kind, sort_order=cat.sort_order)


@router.patch("/categories/{category_id}", response_model=AdminCategory, dependencies=_admin, summary="Обновить направление/черту")
async def update_category(category_id: str, data: CategoryUpdate, session: AsyncSession = Depends(get_session)):
    cat = await session.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Не найдено")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(cat, field, value)
    await session.commit()
    return AdminCategory(id=cat.id, slug=cat.slug, title=cat.title, kind=cat.kind, sort_order=cat.sort_order)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_admin, summary="Удалить направление/черту")
async def delete_category(category_id: str, session: AsyncSession = Depends(get_session)):
    cat = await session.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Не найдено")
    await session.delete(cat)
    await session.commit()


# ── Компетенции ──
@router.get("/competencies", response_model=list[AdminCompetency], dependencies=_admin, summary="Компетенции в scope")
async def list_competencies(
    scope: str = Query("all", description="'all' (общий каталог) или id организации"),
    q: str | None = Query(None, description="Поиск по названию"),
    session: AsyncSession = Depends(get_session),
):
    clause = Competency.organization_id.is_(None) if scope == "all" else Competency.organization_id == scope
    stmt = select(Competency).where(clause)
    if q and q.strip():
        stmt = stmt.where(Competency.title.ilike(f"%{q.strip()}%"))
    comps = (await session.execute(stmt.order_by(Competency.title))).scalars().all()
    return [
        AdminCompetency(
            id=c.id, organization_id=c.organization_id, key=c.key,
            title=c.title, kind=c.kind, description=c.description,
        )
        for c in comps
    ]


@router.patch("/competencies/{competency_id}", response_model=AdminCompetency, dependencies=_admin, summary="Обновить компетенцию")
async def update_competency(competency_id: str, data: AdminCompetencyUpdate, session: AsyncSession = Depends(get_session)):
    comp = await session.get(Competency, competency_id)
    if comp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Компетенция не найдена")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(comp, field, value)
    await session.commit()
    return AdminCompetency(
        id=comp.id, organization_id=comp.organization_id, key=comp.key,
        title=comp.title, kind=comp.kind, description=comp.description,
    )
