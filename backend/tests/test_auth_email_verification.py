import os
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from types import SimpleNamespace

TEST_DB = Path(__file__).resolve().parent / "test_auth_email_verification.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB.as_posix()}"
os.environ["DEBUG"] = "false"

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models.auth import EmailChallenge  # noqa: E402
from app.models.billing import Payment, PAYMENT_PAID  # noqa: E402
from app.models.base import gen_uuid  # noqa: E402
from app.models.enums import UserRole  # noqa: E402
from app.models.organization import Organization, User  # noqa: E402


class AuthEmailVerificationTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")

    async def asyncTearDown(self):
        await self.client.aclose()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        if TEST_DB.exists():
            TEST_DB.unlink()

    async def _create_user(self, email="hr@login.test.com", password="demo123"):
        async with AsyncSessionLocal() as session:
            org = Organization(id=gen_uuid(), name="Login Org", tariff="Start")
            session.add(org)
            user = User(
                id=gen_uuid(),
                organization_id=org.id,
                email=email,
                full_name="Login User",
                role=UserRole.admin.value,
                password_hash=hash_password(password),
                is_active=True,
            )
            session.add(user)
            await session.commit()
            return user

    async def _latest_challenge(self):
        async with AsyncSessionLocal() as session:
            return (
                await session.execute(
                    select(EmailChallenge).order_by(EmailChallenge.created_at.desc())
                )
            ).scalar_one()

    async def test_registration_requires_email_code_before_user_and_tokens(self):
        with (
            patch("app.services.auth_challenges.new_email_code", return_value="123456"),
            patch("app.services.auth_challenges.send_auth_code", new=AsyncMock(return_value=True)),
        ):
            start = await self.client.post(
                "/api/auth/register",
                json={
                    "email": "new.user@example.com",
                    "password": "secret123",
                    "full_name": "New User",
                    "company": "Eltera QA",
                },
            )
            self.assertEqual(start.status_code, 201)
            body = start.json()
            self.assertIn("challenge_token", body)
            self.assertNotIn("access_token", body)

            async with AsyncSessionLocal() as session:
                users = (await session.execute(select(User))).scalars().all()
                self.assertEqual(len(users), 0)

            wrong = await self.client.post(
                "/api/auth/register/verify",
                json={
                    "email": "new.user@example.com",
                    "challenge_token": body["challenge_token"],
                    "code": "000000",
                },
            )
            self.assertEqual(wrong.status_code, 400)

            verify = await self.client.post(
                "/api/auth/register/verify",
                json={
                    "email": "new.user@example.com",
                    "challenge_token": body["challenge_token"],
                    "code": "123456",
                },
            )
            self.assertEqual(verify.status_code, 200)
            tokens = verify.json()
            self.assertIn("registration_token", tokens)
            self.assertNotIn("access_token", tokens)
            self.assertNotIn("refresh_token", tokens)

    async def test_registration_resend_invalidates_previous_code(self):
        with (
            patch("app.services.auth_challenges.send_auth_code", new=AsyncMock(return_value=True)),
            patch("app.services.auth_challenges.new_email_code", side_effect=["111111", "222222"]),
        ):
            start = await self.client.post(
                "/api/auth/register",
                json={
                    "email": "resend@example.com",
                    "password": "secret123",
                    "full_name": "Resend User",
                    "company": "Resend Co",
                },
            )
            first = start.json()

            resend = await self.client.post(
                "/api/auth/register/resend",
                json={
                    "email": "resend@example.com",
                    "challenge_token": first["challenge_token"],
                },
            )
            self.assertEqual(resend.status_code, 200)
            second = resend.json()
            self.assertNotEqual(first["challenge_token"], second["challenge_token"])

            old_verify = await self.client.post(
                "/api/auth/register/verify",
                json={
                    "email": "resend@example.com",
                    "challenge_token": first["challenge_token"],
                    "code": "111111",
                },
            )
            self.assertEqual(old_verify.status_code, 400)

            new_verify = await self.client.post(
                "/api/auth/register/verify",
                json={
                    "email": "resend@example.com",
                    "challenge_token": second["challenge_token"],
                    "code": "222222",
                },
            )
            self.assertEqual(new_verify.status_code, 200)

    async def test_registration_payment_simulate_provisions_account_and_returns_tokens(self):
        with (
            patch("app.services.auth_challenges.new_email_code", return_value="123456"),
            patch("app.services.auth_challenges.send_auth_code", new=AsyncMock(return_value=True)),
            patch("app.services.email.send_payment_receipt", new=AsyncMock(return_value=True)),
        ):
            start = await self.client.post(
                "/api/auth/register",
                json={
                    "email": "paid.user@example.com",
                    "password": "secret123",
                    "full_name": "Paid User",
                    "company": "Paid Co",
                },
            )
            self.assertEqual(start.status_code, 201)

            verify = await self.client.post(
                "/api/auth/register/verify",
                json={
                    "email": "paid.user@example.com",
                    "challenge_token": start.json()["challenge_token"],
                    "code": "123456",
                },
            )
            self.assertEqual(verify.status_code, 200)
            registration_token = verify.json()["registration_token"]

            checkout = await self.client.post(
                "/api/auth/register/checkout",
                json={
                    "email": "paid.user@example.com",
                    "registration_token": registration_token,
                    "tariff": "Starter",
                },
            )
            self.assertEqual(checkout.status_code, 200)
            payment_id = checkout.json()["payment_id"]

            simulate = await self.client.post(
                f"/api/auth/register/checkout/{payment_id}/simulate"
            )
            self.assertEqual(simulate.status_code, 200)
            body = simulate.json()
            self.assertTrue(body["paid"])
            self.assertEqual(body["status"], PAYMENT_PAID)
            self.assertIsNotNone(body["tokens"])
            self.assertEqual(body["tokens"]["user"]["email"], "paid.user@example.com")

            async with AsyncSessionLocal() as session:
                payment = await session.get(Payment, payment_id)
                self.assertIsNotNone(payment)
                assert payment is not None
                self.assertEqual(payment.status, PAYMENT_PAID)
                self.assertIsNotNone(payment.organization_id)

                org = await session.get(Organization, payment.organization_id)
                self.assertIsNotNone(org)
                assert org is not None
                self.assertEqual(org.tariff, "Starter")

                user = (
                    await session.execute(
                        select(User).where(User.email == "paid.user@example.com")
                    )
                ).scalar_one_or_none()
                self.assertIsNotNone(user)
                assert user is not None
                self.assertEqual(user.organization_id, payment.organization_id)

    async def test_registration_returns_debug_code_when_email_send_fails_in_debug(self):
        with (
            patch("app.services.auth_challenges.new_email_code", return_value="654321"),
            patch("app.services.auth_challenges.send_auth_code", new=AsyncMock(return_value=False)),
            patch("app.services.auth_challenges.get_settings", return_value=SimpleNamespace(debug=True)),
        ):
            response = await self.client.post(
                "/api/auth/register",
                json={
                    "email": "debug.fallback@example.com",
                    "password": "secret123",
                    "full_name": "Debug Fallback",
                    "company": "Debug Co",
                },
            )
            self.assertEqual(response.status_code, 201)
            body = response.json()
            self.assertEqual(body["email"], "debug.fallback@example.com")
            self.assertEqual(body["debug_code"], "654321")
            self.assertIn("challenge_token", body)

    async def test_login_requires_valid_credentials_and_verified_code(self):
        await self._create_user()
        send_mock = AsyncMock(return_value=True)
        with (
            patch("app.services.auth_challenges.new_email_code", return_value="654321"),
            patch("app.services.auth_challenges.send_auth_code", new=send_mock),
        ):
            bad = await self.client.post(
                "/api/auth/login",
                json={"email": "hr@login.test.com", "password": "wrong-pass"},
            )
            self.assertEqual(bad.status_code, 401)
            self.assertEqual(send_mock.await_count, 0)

            start = await self.client.post(
                "/api/auth/login",
                json={"email": "hr@login.test.com", "password": "demo123"},
            )
            self.assertEqual(start.status_code, 200)
            pending = start.json()
            self.assertIn("challenge_token", pending)
            self.assertNotIn("access_token", pending)

            wrong = await self.client.post(
                "/api/auth/login/verify",
                json={
                    "email": "hr@login.test.com",
                    "challenge_token": pending["challenge_token"],
                    "code": "111111",
                },
            )
            self.assertEqual(wrong.status_code, 400)

            verify = await self.client.post(
                "/api/auth/login/verify",
                json={
                    "email": "hr@login.test.com",
                    "challenge_token": pending["challenge_token"],
                    "code": "654321",
                },
            )
            self.assertEqual(verify.status_code, 200)
            tokens = verify.json()

            refresh = await self.client.post(
                "/api/auth/refresh",
                json={"refresh_token": tokens["refresh_token"]},
            )
            self.assertEqual(refresh.status_code, 200)
            refreshed = refresh.json()

            me = await self.client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {refreshed['access_token']}"},
            )
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.json()["email"], "hr@login.test.com")

    async def test_send_limit_applies_to_start_and_resend_requests(self):
        await self._create_user(email="limit@login.test.com", password="demo123")
        with (
            patch("app.services.auth_challenges.send_auth_code", new=AsyncMock(return_value=True)),
            patch("app.services.auth_challenges.new_email_code", side_effect=["100001", "100002", "100003", "100004"]),
        ):
            start = await self.client.post(
                "/api/auth/login",
                json={"email": "limit@login.test.com", "password": "demo123"},
            )
            self.assertEqual(start.status_code, 200)
            current = start.json()

            for _ in range(2):
                resend = await self.client.post(
                    "/api/auth/login/resend",
                    json={
                        "email": "limit@login.test.com",
                        "challenge_token": current["challenge_token"],
                    },
                )
                self.assertEqual(resend.status_code, 200)
                current = resend.json()

            blocked = await self.client.post(
                "/api/auth/login/resend",
                json={
                    "email": "limit@login.test.com",
                    "challenge_token": current["challenge_token"],
                },
            )
            self.assertEqual(blocked.status_code, 429)
