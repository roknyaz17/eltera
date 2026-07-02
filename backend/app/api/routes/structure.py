"""Эндпоинты вкладки «Структура» (оргструктура, отделы, добавление людей)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import employee as crud
from app.schemas.employee import (
    DepartmentCreate,
    DepartmentRead,
    DepartmentUpdate,
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


@router.patch(
    "/departments/{dept_id}", response_model=list[DepartmentRead],
    summary="Изменить отдел (название, руководитель, родительский отдел)",
)
async def update_department(
    dept_id: str, data: DepartmentUpdate, session: AsyncSession = Depends(get_session)
):
    if not await crud.update_department(session, dept_id, data):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отдел не найден")
    return await crud.list_departments(session)


@router.delete(
    "/departments/{dept_id}", response_model=list[DepartmentRead],
    summary="Удалить отдел (сотрудники открепляются, подотделы поднимаются на верх)",
)
async def delete_department(dept_id: str, session: AsyncSession = Depends(get_session)):
    if not await crud.delete_department(session, dept_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отдел не найден")
    return await crud.list_departments(session)


@router.post(
    "/members", response_model=EmployeeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить сотрудника/руководителя в структуру",
)
async def add_member(data: StructureMemberCreate, session: AsyncSession = Depends(get_session)):
    person_id = await crud.add_structure_member(session, data)
    return await crud.get_employee(session, person_id)


@router.delete(
    "/members/{person_id}/department", response_model=EmployeeRead,
    summary="Убрать сотрудника из отдела (сам сотрудник остаётся)",
)
async def detach_member_department(person_id: str, session: AsyncSession = Depends(get_session)):
    if not await crud.detach_employee_department(session, person_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден")
    return await crud.get_employee(session, person_id)
