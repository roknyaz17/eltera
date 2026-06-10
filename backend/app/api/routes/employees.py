"""Эндпоинты вкладки «Сотрудники»."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import employee as crud
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeList,
    EmployeeRead,
    EmployeeResultIn,
    EmployeeStats,
    EmployeeUpdate,
)

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=EmployeeList, summary="Список сотрудников")
async def read_employees(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("full_name"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    search: str | None = None,
    department_id: str | None = None,
    turnover_risk: str | None = None,
    manager_id: str | None = None,
    project: str | None = None,
):
    items, total = await crud.list_employees(
        session, page=page, size=size, sort_by=sort_by, order=order, search=search,
        department_id=department_id, turnover_risk=turnover_risk,
        manager_id=manager_id, project=project,
    )
    pages = (total + size - 1) // size if size else 0
    return EmployeeList(items=items, total=total, page=page, size=size, pages=pages)


@router.get("/stats", response_model=EmployeeStats, summary="KPI сотрудников")
async def read_stats(session: AsyncSession = Depends(get_session)):
    return await crud.get_employee_stats(session)


@router.get("/{employee_id}", response_model=EmployeeRead, summary="Карточка сотрудника")
async def read_employee(employee_id: str, session: AsyncSession = Depends(get_session)):
    emp = await crud.get_employee(session, employee_id)
    if emp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return emp


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED, summary="Добавить сотрудника")
async def create_employee(data: EmployeeCreate, session: AsyncSession = Depends(get_session)):
    person_id = await crud.create_employee(session, data)
    return await crud.get_employee(session, person_id)


@router.patch("/{employee_id}", response_model=EmployeeRead, summary="Обновить сотрудника")
async def update_employee(employee_id: str, data: EmployeeUpdate, session: AsyncSession = Depends(get_session)):
    ok = await crud.update_employee(session, employee_id, data)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return await crud.get_employee(session, employee_id)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить сотрудника")
async def delete_employee(employee_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_employee(session, employee_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")


@router.post("/{employee_id}/result", response_model=EmployeeRead, summary="Записать результат оценки")
async def record_employee_result(
    employee_id: str, data: EmployeeResultIn, session: AsyncSession = Depends(get_session)
):
    try:
        session_id = await crud.record_employee_result(session, employee_id, data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    if session_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return await crud.get_employee(session, employee_id)
