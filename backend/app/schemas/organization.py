"""Schemas for the organization (company) profile — вкладка «Настройки»."""
from pydantic import BaseModel, ConfigDict, Field


class OrganizationOut(BaseModel):
    """Реквизиты компании и контактное лицо."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    tariff: str
    inn: str | None = None
    kpp: str | None = None
    site: str | None = None
    report_email: str | None = None
    phone: str | None = None
    legal_address: str | None = None
    actual_address: str | None = None
    contact_last_name: str | None = None
    contact_first_name: str | None = None
    contact_patronymic: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None


class OrganizationUpdate(BaseModel):
    """Частичное обновление: переданы только изменённые поля."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    inn: str | None = Field(default=None, max_length=20)
    kpp: str | None = Field(default=None, max_length=20)
    site: str | None = Field(default=None, max_length=200)
    report_email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    legal_address: str | None = Field(default=None, max_length=300)
    actual_address: str | None = Field(default=None, max_length=300)
    contact_last_name: str | None = Field(default=None, max_length=100)
    contact_first_name: str | None = Field(default=None, max_length=100)
    contact_patronymic: str | None = Field(default=None, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=50)
    contact_email: str | None = Field(default=None, max_length=200)
