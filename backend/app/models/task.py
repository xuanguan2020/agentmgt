from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    STANDALONE = "standalone"
    COLLABORATIVE = "collaborative"


class Task(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().hex)
    type: TaskType = TaskType.STANDALONE
    status: TaskStatus = TaskStatus.PENDING
    name: str = "Unnamed Task"
    description: Optional[str] = None
    assigned_agents: List[str] = Field(default_factory=list)
    parent_task_id: Optional[str] = None
    params: dict = Field(default_factory=dict)
    result: Optional[dict] = None
    error: Optional[str] = None
    progress: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    type: TaskType = TaskType.STANDALONE
    name: str = "Unnamed Task"
    description: Optional[str] = None
    assigned_agents: List[str] = Field(default_factory=list)
    parent_task_id: Optional[str] = None
    params: dict = Field(default_factory=dict)


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    progress: Optional[float] = None
