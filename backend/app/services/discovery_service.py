import httpx
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.config import settings
from app.storage.memory_cache import memory_cache
from app.websocket.manager import ws_manager


class DiscoveryService:
    def __init__(self):
        self.gateway_url = settings.OPENCLAW_GATEWAY_URL.rstrip("/")
        self.api_key = settings.OPENCLAW_GATEWAY_API_KEY
        self.enabled = settings.OPENCLAW_DISCOVERY_ENABLED
        self._discovery_task: Optional[asyncio.Task] = None
        self._last_discovery: Optional[datetime] = None

    async def discover_agents(self) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.gateway_url}/api/agents",
                    headers=headers
                )
                
                if response.status_code == 200:
                    agents_data = response.json()
                    
                    if isinstance(agents_data, list):
                        discovered = []
                        for agent_info in agents_data:
                            agent = await self._process_agent(agent_info)
                            if agent:
                                discovered.append(agent)
                        
                        self._last_discovery = datetime.utcnow()
                        await memory_cache.add_activity("discovery_completed", {
                            "count": len(discovered),
                            "timestamp": self._last_discovery.isoformat()
                        })
                        
                        return discovered
                    elif isinstance(agents_data, dict) and "agents" in agents_data:
                        discovered = []
                        for agent_info in agents_data.get("agents", []):
                            agent = await self._process_agent(agent_info)
                            if agent:
                                discovered.append(agent)
                        
                        self._last_discovery = datetime.utcnow()
                        return discovered
                        
        except httpx.ConnectError:
            await memory_cache.add_activity("discovery_failed", {
                "error": "Connection refused - Gateway may not be running",
                "gateway_url": self.gateway_url
            })
        except httpx.TimeoutException:
            await memory_cache.add_activity("discovery_failed", {
                "error": "Connection timeout",
                "gateway_url": self.gateway_url
            })
        except Exception as e:
            await memory_cache.add_activity("discovery_failed", {
                "error": str(e),
                "gateway_url": self.gateway_url
            })
        
        return []

    async def _process_agent(self, agent_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            agent_id = agent_info.get("id") or agent_info.get("agent_id")
            if not agent_id:
                return None

            agent = {
                "id": agent_id,
                "name": agent_info.get("name", f"Agent-{agent_id[:8]}"),
                "status": self._normalize_status(agent_info.get("status", "unknown")),
                "capabilities": agent_info.get("capabilities", []) or agent_info.get("skills", []),
                "current_task_id": agent_info.get("current_task_id") or agent_info.get("task_id"),
                "metadata": {
                    "source": "gateway",
                    "gateway_url": self.gateway_url,
                    "raw_info": agent_info
                },
                "last_heartbeat": agent_info.get("last_heartbeat") or agent_info.get("last_seen") or datetime.utcnow().isoformat(),
                "created_at": agent_info.get("created_at") or datetime.utcnow().isoformat()
            }
            
            return agent
            
        except Exception as e:
            return None

    def _normalize_status(self, status: str) -> str:
        status_lower = status.lower()
        if status_lower in ["idle", "available", "ready"]:
            return "idle"
        elif status_lower in ["busy", "working", "running", "active"]:
            return "busy"
        elif status_lower in ["offline", "disconnected", "unavailable"]:
            return "offline"
        return "idle"

    async def get_agent_details(self, agent_id: str) -> Optional[Dict[str, Any]]:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.gateway_url}/api/agents/{agent_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.json()
                    
        except Exception:
            pass
        
        return None

    async def start_auto_discovery(self):
        if not self.enabled:
            return
        
        async def discovery_loop():
            while True:
                try:
                    agents = await self.discover_agents()
                    for agent in agents:
                        existing = await memory_cache.get_agent(agent["id"])
                        if existing:
                            await memory_cache.update_agent(agent["id"], agent)
                            await ws_manager.broadcast_agent_update(agent["id"], agent)
                        else:
                            await memory_cache.add_agent(agent)
                            await ws_manager.broadcast_agent_update(agent["id"], agent)
                    
                    await memory_cache.add_activity("auto_discovery", {
                        "agents_found": len(agents),
                        "gateway_url": self.gateway_url
                    })
                    
                except Exception as e:
                    await memory_cache.add_activity("auto_discovery_error", {
                        "error": str(e)
                    })
                
                await asyncio.sleep(settings.OPENCLAW_DISCOVERY_INTERVAL)
        
        self._discovery_task = asyncio.create_task(discovery_loop())

    async def stop_auto_discovery(self):
        if self._discovery_task:
            self._discovery_task.cancel()
            try:
                await self._discovery_task
            except asyncio.CancelledError:
                pass
            self._discovery_task = None

    def get_discovery_status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "gateway_url": self.gateway_url,
            "last_discovery": self._last_discovery.isoformat() if self._last_discovery else None,
            "auto_discovery_running": self._discovery_task is not None and not self._discovery_task.done()
        }


discovery_service = DiscoveryService()
