from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, DateTime, JSON, Float, Integer
from datetime import datetime
from typing import Optional, List
from app.config import settings


class Base(DeclarativeBase):
    pass


class AgentDB(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="idle")
    capabilities = Column(JSON, default=list)
    current_task_id = Column(String, nullable=True)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)


class TaskDB(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    type = Column(String, default="standalone")
    status = Column(String, default="pending")
    name = Column(String, default="Unnamed Task")
    description = Column(String, nullable=True)
    assigned_agents = Column(JSON, default=list)
    parent_task_id = Column(String, nullable=True)
    params = Column(JSON, default=dict)
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class MessageDB(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    from_agent_id = Column(String, nullable=False)
    to_agent_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    method = Column(String, nullable=False)
    params = Column(JSON, default=dict)
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class SQLiteStore:
    def __init__(self, database_url: str = settings.DATABASE_URL):
        self.engine = create_async_engine(database_url, echo=settings.DEBUG)
        self.async_session = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def init_db(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self):
        await self.engine.dispose()

    async def get_session(self) -> AsyncSession:
        return self.async_session()


sqlite_store = SQLiteStore()
