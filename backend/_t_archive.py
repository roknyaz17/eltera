import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import app.core.database as db
from app.core.database import Base
from app.models.person import Person, EmployeeProfile
from app.models.organization import Organization
from app.models.base import utcnow

async def main():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    Sess = async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    async with Sess() as s:
        org = Organization(name="Org"); s.add(org); await s.flush()
        a = Person(organization_id=org.id, full_name="Active"); a.employee_profile = EmployeeProfile(position="x")
        b = Person(organization_id=org.id, full_name="Archived"); b.employee_profile = EmployeeProfile(position="y")
        b.archived_at = utcnow()
        s.add_all([a, b]); await s.commit(); bid = b.id
        names = (await s.execute(select(Person.full_name).order_by(Person.full_name))).scalars().all()
        cnt = (await s.execute(select(func.count()).select_from(EmployeeProfile).join(Person, Person.id==EmployeeProfile.person_id))).scalar_one()
        got = await s.get(Person, bid, execution_options={"include_archived": True})
        got2 = await s.get(Person, bid)
        print("visible:", names, "| count:", cnt, "| optout:", got and got.full_name, "| noopt:", got2)
        assert names == ["Active"] and cnt == 1 and got.full_name == "Archived" and got2 is None
        print("ALL OK")

asyncio.run(main())
