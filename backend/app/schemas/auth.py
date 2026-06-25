"""Schemas for auth flows."""
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    company: str = Field(min_length=1, max_length=200)
    # Код реферальной ссылки (#/ref/<code>), если регистрация по приглашению.
    ref_code: str | None = Field(default=None, max_length=40)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ChallengeVerifyIn(BaseModel):
    email: EmailStr
    challenge_token: str = Field(min_length=16, max_length=255)
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Код должен состоять из 6 цифр.")
        return value


class ChallengeResendIn(BaseModel):
    email: EmailStr
    challenge_token: str = Field(min_length=16, max_length=255)


class PasswordForgotIn(BaseModel):
    email: EmailStr


class PasswordResetTokenOut(BaseModel):
    reset_token: str
    email: str
    expires_in: int


class PasswordResetIn(BaseModel):
    email: EmailStr
    reset_token: str = Field(min_length=16, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    password_confirm: str = Field(min_length=6, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordResetIn":
        if self.password != self.password_confirm:
            raise ValueError("Пароли не совпадают.")
        return self


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization_id: str
    organization_name: str | None = None
    tariff: str | None = None


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class ChallengeOut(BaseModel):
    challenge_token: str
    email: str
    purpose: str
    expires_in: int
