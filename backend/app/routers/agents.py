from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from app.models.agent import Agent, AgentCreate, AgentUpdate, HeartbeatRequest
from app.services.agent_service import agent_service

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=List[Agent])
async def list_agents():
    return await agent_service.list_agents()


@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    agent = await agent_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    return await agent_service.create_agent(agent_data)


@router.patch("/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, updates: AgentUpdate):
    agent = await agent_service.update_agent(agent_id, updates)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    success = await agent_service.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "ok", "message": "Agent deleted"}


@router.post("/{agent_id}/heartbeat", response_model=Agent)
async def heartbeat(agent_id: str, heartbeat: HeartbeatRequest, background_tasks: BackgroundTasks):
    agent = await agent_service.heartbeat(agent_id, heartbeat)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    background_tasks.add_task(check_offline_agents_task)
    
    return agent


async def check_offline_agents_task():
    await agent_service.check_offline_agents()
