from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.discovery_service import discovery_service

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


class DiscoveryConfig(BaseModel):
    gateway_url: str
    api_key: str | None = None
    enabled: bool = True


class GatewayAgentsResponse(BaseModel):
    agents: List[Dict[str, Any]]
    gateway_url: str
    count: int


class AgentRegistration(BaseModel):
    id: str
    name: str
    status: Optional[str] = "idle"
    capabilities: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    agent_version: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class AgentHeartbeat(BaseModel):
    agent_id: str
    status: Optional[str] = "idle"
    session_id: Optional[str] = None
    current_task_id: Optional[str] = None


class SessionSpawnRequest(BaseModel):
    target_agent_id: str
    task: Dict[str, Any]


class SessionSendRequest(BaseModel):
    session_id: str
    message: str


@router.get("/agents", response_model=GatewayAgentsResponse)
async def discover_agents():
    agents = await discovery_service.discover_agents_from_gateway()
    return GatewayAgentsResponse(
        agents=agents,
        gateway_url=discovery_service.gateway_url,
        count=len(agents)
    )


@router.get("/status")
async def get_discovery_status():
    return discovery_service.get_discovery_status()


@router.post("/configure")
async def configure_discovery(config: DiscoveryConfig):
    discovery_service.update_config(
        gateway_url=config.gateway_url,
        api_key=config.api_key,
        enabled=config.enabled
    )
    
    return {
        "status": "ok",
        "message": "Discovery configuration updated",
        "config": discovery_service.get_discovery_status()
    }


@router.post("/trigger")
async def trigger_discovery():
    agents = await discovery_service.discover_agents_from_gateway()
    return {
        "status": "ok",
        "agents_found": len(agents),
        "agents": agents
    }


@router.post("/register")
async def register_agent(registration: AgentRegistration):
    agent_data = {
        "id": registration.id,
        "name": registration.name,
        "status": registration.status,
        "capabilities": registration.capabilities or registration.skills,
        "hostname": registration.hostname,
        "ip_address": registration.ip_address,
        "agent_version": registration.agent_version,
        "session_id": registration.session_id,
        "metadata": registration.metadata
    }
    
    agent = await discovery_service.register_agent(agent_data)
    return {
        "status": "ok",
        "agent": agent
    }


@router.post("/heartbeat")
async def agent_heartbeat(heartbeat: AgentHeartbeat):
    agent = await discovery_service.agent_heartbeat(
        agent_id=heartbeat.agent_id,
        status=heartbeat.status or "idle",
        session_id=heartbeat.session_id
    )
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "status": "ok",
        "agent": agent
    }


@router.post("/sessions/spawn")
async def sessions_spawn(request: SessionSpawnRequest):
    result = await discovery_service.sessions_spawn(
        target_agent_id=request.target_agent_id,
        task=request.task
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to spawn session")
    
    return {
        "status": "ok",
        "session_id": result.get("session_id")
    }


@router.post("/sessions/send")
async def sessions_send(request: SessionSendRequest):
    result = await discovery_service.sessions_send(
        session_id=request.session_id,
        message=request.message
    )
    
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to send message")
    
    return {
        "status": "ok",
        "result": result
    }


@router.get("/sessions/{session_id}/history")
async def sessions_history(session_id: str):
    history = await discovery_service.sessions_history(session_id)
    return {
        "status": "ok",
        "session_id": session_id,
        "history": history
    }
