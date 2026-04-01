from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class MessageAction(str, Enum):
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFY = "notify"


class A2AMessage(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    from_agent_id: str
    to_agent_id: str
    action: MessageAction
    method: str
    params: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class A2AMessageSend(BaseModel):
    to_agent_id: str
    action: MessageAction = MessageAction.REQUEST
    method: str
    params: Dict[str, Any] = Field(default_factory=dict)


class CapabilitiesResponse(BaseModel):
    agent_id: str
    capabilities: list[str]
    status: str
