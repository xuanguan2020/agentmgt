from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AgentStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"


class Agent(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().hex)
    name: str
    status: AgentStatus = AgentStatus.IDLE
    capabilities: List[str] = Field(default_factory=list)
    current_task_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class AgentCreate(BaseModel):
    name: str
    capabilities: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    capabilities: Optional[List[str]] = None
    metadata: Optional[dict] = None


class HeartbeatRequest(BaseModel):
    status: Optional[AgentStatus] = None
    current_task_id: Optional[str] = None
