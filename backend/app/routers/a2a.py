from fastapi import APIRouter, HTTPException
from typing import List
from app.models.message import A2AMessage, A2AMessageSend
from app.services.a2a_service import a2a_service

router = APIRouter(prefix="/api/a2a", tags=["a2a"])


@router.post("/send", response_model=A2AMessage)
async def send_message(from_agent_id: str, message: A2AMessageSend):
    result = await a2a_service.send_message(from_agent_id, message)
    return result


@router.get("/messages/{agent_id}", response_model=List[A2AMessage])
async def get_messages(agent_id: str):
    return await a2a_service.get_messages_for_agent(agent_id)


@router.get("/capabilities/{agent_id}")
async def get_capabilities(agent_id: str):
    capabilities = await a2a_service.notify_agents_capabilities(agent_id)
    return {"capabilities": capabilities}
