from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import OrderedDict
import asyncio
from app.config import settings


class MemoryCache:
    def __init__(self, max_size: int = settings.MAX_MEMORY_CACHE_SIZE):
        self.max_size = max_size
        self._agents: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._tasks: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._messages: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._activity_log: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def add_agent(self, agent: Dict[str, Any]) -> None:
        async with self._lock:
            self._agents[agent["id"]] = agent
            self._enforce_size_limit(self._agents)

    async def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._agents.get(agent_id)

    async def update_agent(self, agent_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if agent_id in self._agents:
                self._agents[agent_id].update(updates)
                self._agents.move_to_end(agent_id)
                return self._agents[agent_id]
            return None

    async def remove_agent(self, agent_id: str) -> bool:
        async with self._lock:
            if agent_id in self._agents:
                del self._agents[agent_id]
                return True
            return False

    async def list_agents(self) -> List[Dict[str, Any]]:
        async with self._lock:
            return list(self._agents.values())

    async def add_task(self, task: Dict[str, Any]) -> None:
        async with self._lock:
            self._tasks[task["id"]] = task
            self._enforce_size_limit(self._tasks)

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._tasks.get(task_id)

    async def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].update(updates)
                self._tasks.move_to_end(task_id)
                return self._tasks[task_id]
            return None

    async def list_tasks(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        async with self._lock:
            tasks = list(self._tasks.values())
            if status_filter:
                tasks = [t for t in tasks if t.get("status") == status_filter]
            return tasks

    async def get_running_tasks(self) -> List[Dict[str, Any]]:
        async with self._lock:
            return [t for t in self._tasks.values() if t.get("status") == "running"]

    async def add_message(self, message: Dict[str, Any]) -> None:
        async with self._lock:
            self._messages[message["id"]] = message
            self._enforce_size_limit(self._messages)
            self._activity_log.append({
                "type": "a2a_message",
                "data": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            self._enforce_activity_log_size()

    async def get_messages_for_agent(self, agent_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            return [
                m for m in self._messages.values()
                if m.get("to_agent_id") == agent_id or m.get("from_agent_id") == agent_id
            ]

    async def add_activity(self, activity_type: str, data: Dict[str, Any]) -> None:
        async with self._lock:
            self._activity_log.append({
                "type": activity_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            })
            self._enforce_activity_log_size()

    async def get_activity_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        async with self._lock:
            return self._activity_log[-limit:]

    def _enforce_size_limit(self, cache: OrderedDict) -> None:
        while len(cache) > self.max_size:
            cache.popitem(last=False)

    def _enforce_activity_log_size(self) -> None:
        while len(self._activity_log) > self.max_size * 2:
            self._activity_log.pop(0)


memory_cache = MemoryCache()
