"""Эндпоинты вкладки «Структура» (оргструктура, отделы, добавление людей)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import employee as crud
from app.schemas.employee import (
    DepartmentCreate,
    DepartmentRead,
    EmployeeRead,
    OrgTree,
    StructureMemberCreate,
)

router = APIRouter(prefix="/structure", tags=["structure"])


@router.get("", response_model=OrgTree, summary="Оргструктура (дерево)")
async def org_tree(session: AsyncSession = Depends(get_session)):
    return await crud.build_org_tree(session)


@router.get("/departments", response_model=list[DepartmentRead], summary="Отделы")
async def departments(session: AsyncSession = Depends(get_session)):
    return await crud.list_departments(session)


@router.post(
    "/departments", response_model=list[DepartmentRead],
    status_code=status.HTTP_201_CREATED, summary="Создать отдел",
)
async def create_department(data: DepartmentCreate, session: AsyncSession = Depends(get_session)):
    await crud.create_department(session, data)
    return await crud.list_departments(session)


@router.post(
    "/members", response_model=EmployeeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить сотрудника/руководителя в структуру",
)
async def add_member(data: StructureMemberCreate, session: AsyncSession = Depends(get_session)):
    person_id = await crud.add_structure_member(session, data)
    return await crud.get_employee(session, person_id)
