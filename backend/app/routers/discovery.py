from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
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


@router.get("/agents", response_model=GatewayAgentsResponse)
async def discover_agents():
    agents = await discovery_service.discover_agents()
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
    discovery_service.gateway_url = config.gateway_url.rstrip("/")
    discovery_service.api_key = config.api_key
    discovery_service.enabled = config.enabled
    
    return {
        "status": "ok",
        "message": "Discovery configuration updated",
        "config": discovery_service.get_discovery_status()
    }


@router.post("/trigger")
async def trigger_discovery():
    agents = await discovery_service.discover_agents()
    return {
        "status": "ok",
        "agents_found": len(agents),
        "agents": agents
    }
