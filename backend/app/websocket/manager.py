from typing import Dict, Set, Any
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, client_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket

    async def disconnect(self, client_id: str) -> None:
        async with self._lock:
            if client_id in self.active_connections:
                del self.active_connections[client_id]

    async def send_personal_message(self, message: Any, client_id: str) -> None:
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)

    async def broadcast(self, message: Any) -> None:
        disconnected = []
        message_json = json.dumps(message, default=str)
        
        async with self._lock:
            for client_id, websocket in self.active_connections.items():
                try:
                    await websocket.send_json(message)
                except Exception:
                    disconnected.append(client_id)
        
        for client_id in disconnected:
            await self.disconnect(client_id)

    async def broadcast_agent_update(self, agent_id: str, agent_data: Dict[str, Any]) -> None:
        await self.broadcast({
            "type": "agent_update",
            "agent_id": agent_id,
            "data": agent_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def broadcast_task_update(self, task_id: str, task_data: Dict[str, Any]) -> None:
        await self.broadcast({
            "type": "task_update",
            "task_id": task_id,
            "data": task_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def broadcast_activity(self, activity_type: str, data: Dict[str, Any]) -> None:
        await self.broadcast({
            "type": "activity",
            "activity_type": activity_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })


ws_manager = ConnectionManager()
