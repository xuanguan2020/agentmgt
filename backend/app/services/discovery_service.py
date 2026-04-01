import httpx
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.config import settings
from app.storage.memory_cache import memory_cache
from app.websocket.manager import ws_manager


class GatewayRPCClient:
    def __init__(self, gateway_url: str, api_key: Optional[str] = None):
        self.gateway_url = gateway_url.rstrip("/")
        self.api_key = api_key
        self.headers = {}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    async def call_rpc(self, method: str, params: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.gateway_url}/rpc",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("result")
                    
        except Exception as e:
            await memory_cache.add_activity("gateway_rpc_error", {
                "method": method,
                "error": str(e)
            })
        
        return None

    async def list_agents(self) -> List[Dict[str, Any]]:
        result = await self.call_rpc("agents.list")
        if result and isinstance(result, list):
            return result
        return []

    async def agents_list(self) -> List[str]:
        result = await self.call_rpc("agents_list")
        if result and isinstance(result, list):
            return result
        return []

    async def sessions_ping(self, session_id: str) -> bool:
        result = await self.call_rpc("sessions.ping", {"session_id": session_id})
        return result is not None

    async def sessions_spawn(self, target_agent_id: str, task: Dict[str, Any]) -> Optional[str]:
        result = await self.call_rpc("sessions.spawn", {
            "targetAgentId": target_agent_id,
            "task": task
        })
        if result and isinstance(result, dict):
            return result.get("session_id")
        return None

    async def sessions_send(self, session_id: str, message: str) -> Optional[Dict[str, Any]]:
        return await self.call_rpc("sessions.send", {
            "session_id": session_id,
            "message": message
        })

    async def sessions_history(self, session_id: str) -> List[Dict[str, Any]]:
        result = await self.call_rpc("sessions.history", {"session_id": session_id})
        if result and isinstance(result, list):
            return result
        return []


class OpenClawDiscoveryService:
    def __init__(self):
        self.gateway_url = settings.OPENCLAW_GATEWAY_URL.rstrip("/")
        self.api_key = settings.OPENCLAW_GATEWAY_API_KEY
        self.enabled = settings.OPENCLAW_DISCOVERY_ENABLED
        self._discovery_task: Optional[asyncio.Task] = None
        self._liveness_task: Optional[asyncio.Task] = None
        self._last_discovery: Optional[datetime] = None
        self._gateway_client: Optional[GatewayRPCClient] = None

    def get_gateway_client(self) -> GatewayRPCClient:
        if not self._gateway_client:
            self._gateway_client = GatewayRPCClient(self.gateway_url, self.api_key)
        return self._gateway_client

    async def discover_agents_from_gateway(self) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        try:
            client = self.get_gateway_client()
            gateway_agents = await client.list_agents()
            
            discovered = []
            for agent_info in gateway_agents:
                agent = self._process_gateway_agent(agent_info)
                if agent:
                    discovered.append(agent)
            
            self._last_discovery = datetime.utcnow()
            await memory_cache.add_activity("gateway_discovery_completed", {
                "count": len(discovered),
                "timestamp": self._last_discovery.isoformat()
            })
            
            return discovered
            
        except Exception as e:
            await memory_cache.add_activity("gateway_discovery_failed", {
                "error": str(e),
                "gateway_url": self.gateway_url
            })
            return []

    def _process_gateway_agent(self, agent_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            agent_id = (
                agent_info.get("id") or 
                agent_info.get("agent_id") or 
                agent_info.get("name", "").lower().replace(" ", "_")
            )
            
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
                    "allowlist": agent_info.get("allowlist", []),
                    "skills": agent_info.get("skills", []),
                    "raw_info": agent_info
                },
                "session_id": agent_info.get("session_id"),
                "last_heartbeat": datetime.utcnow().isoformat(),
                "created_at": agent_info.get("created_at") or datetime.utcnow().isoformat()
            }
            
            return agent
            
        except Exception:
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

    async def register_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        agent_id = agent_data.get("id") or agent_data.get("agent_id")
        if not agent_id:
            raise ValueError("Agent ID is required")

        agent = {
            "id": agent_id,
            "name": agent_data.get("name", f"Agent-{agent_id[:8]}"),
            "status": self._normalize_status(agent_data.get("status", "idle")),
            "capabilities": agent_data.get("capabilities", []) or agent_data.get("skills", []),
            "current_task_id": agent_data.get("current_task_id"),
            "metadata": {
                "source": "registered",
                "hostname": agent_data.get("hostname"),
                "ip_address": agent_data.get("ip_address"),
                "agent_version": agent_data.get("agent_version"),
                "extra": agent_data.get("metadata", {})
            },
            "session_id": agent_data.get("session_id"),
            "last_heartbeat": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }

        existing = await memory_cache.get_agent(agent_id)
        if existing:
            agent["created_at"] = existing.get("created_at", datetime.utcnow().isoformat())
            await memory_cache.update_agent(agent_id, agent)
        else:
            await memory_cache.add_agent(agent)

        await memory_cache.add_activity("agent_registered", {
            "agent_id": agent_id,
            "name": agent["name"]
        })

        await ws_manager.broadcast_agent_update(agent_id, agent)

        return agent

    async def agent_heartbeat(self, agent_id: str, status: str = "idle", session_id: str = None) -> Optional[Dict[str, Any]]:
        updates = {
            "status": self._normalize_status(status),
            "last_heartbeat": datetime.utcnow().isoformat()
        }
        if session_id:
            updates["session_id"] = session_id

        await memory_cache.update_agent(agent_id, updates)
        
        agent = await memory_cache.get_agent(agent_id)
        if agent:
            await ws_manager.broadcast_agent_update(agent_id, agent)
        
        return agent

    async def sessions_spawn(self, target_agent_id: str, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        client = self.get_gateway_client()
        session_id = await client.sessions_spawn(target_agent_id, task)
        
        if session_id:
            await memory_cache.add_activity("session_spawned", {
                "target_agent_id": target_agent_id,
                "session_id": session_id,
                "task": task
            })
            return {"session_id": session_id}
        return None

    async def sessions_send(self, session_id: str, message: str) -> Optional[Dict[str, Any]]:
        client = self.get_gateway_client()
        result = await client.sessions_send(session_id, message)
        
        if result:
            await memory_cache.add_activity("session_message_sent", {
                "session_id": session_id,
                "message": message[:100]
            })
        
        return result

    async def sessions_history(self, session_id: str) -> List[Dict[str, Any]]:
        client = self.get_gateway_client()
        return await client.sessions_history(session_id)

    async def _check_agent_liveness(self, agent: Dict[str, Any]) -> bool:
        session_id = agent.get("session_id")
        if not session_id:
            time_diff = (datetime.utcnow() - datetime.fromisoformat(agent.get("last_heartbeat", datetime.utcnow().isoformat()))).total_seconds()
            return time_diff < settings.HEARTBEAT_TIMEOUT_SECONDS

        try:
            client = self.get_gateway_client()
            return await client.sessions_ping(session_id)
        except Exception:
            return False

    async def start_auto_discovery(self):
        if not self.enabled:
            return
        
        async def discovery_loop():
            while True:
                try:
                    gateway_agents = await self.discover_agents_from_gateway()
                    
                    for agent in gateway_agents:
                        existing = await memory_cache.get_agent(agent["id"])
                        if existing:
                            agent["created_at"] = existing.get("created_at")
                            await memory_cache.update_agent(agent["id"], agent)
                        else:
                            await memory_cache.add_agent(agent)
                        
                        await ws_manager.broadcast_agent_update(agent["id"], agent)
                    
                    await self._check_offline_agents(gateway_agents)
                    
                except Exception as e:
                    await memory_cache.add_activity("auto_discovery_error", {
                        "error": str(e)
                    })
                
                await asyncio.sleep(settings.OPENCLAW_DISCOVERY_INTERVAL)
        
        self._discovery_task = asyncio.create_task(discovery_loop())

    async def _check_offline_agents(self, gateway_agents: List[Dict[str, Any]]):
        gateway_ids = {a["id"] for a in gateway_agents}
        all_agents = await memory_cache.list_agents()
        
        for agent in all_agents:
            if agent["id"] not in gateway_ids and agent.get("source") == "gateway":
                await memory_cache.update_agent(agent["id"], {"status": "offline"})
                await ws_manager.broadcast_agent_update(agent["id"], {"status": "offline"})

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

    def update_config(self, gateway_url: str = None, api_key: str = None, enabled: bool = None):
        if gateway_url:
            self.gateway_url = gateway_url.rstrip("/")
            self._gateway_client = None
        if api_key is not None:
            self.api_key = api_key
            self._gateway_client = None
        if enabled is not None:
            self.enabled = enabled


discovery_service = OpenClawDiscoveryService()
