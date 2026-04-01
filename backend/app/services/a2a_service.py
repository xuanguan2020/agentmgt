from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.message import A2AMessage, A2AMessageSend, MessageAction, CapabilitiesResponse
from app.models.agent import Agent, AgentStatus
from app.models.task import Task, TaskType, TaskStatus
from app.storage.memory_cache import memory_cache
from app.storage.sqlite_store import sqlite_store, MessageDB
from app.websocket.manager import ws_manager
from sqlalchemy import select, or_
import asyncio


class A2AService:
    async def send_message(self, from_agent_id: str, message: A2AMessageSend) -> A2AMessage:
        a2a_message = A2AMessage(
            from_agent_id=from_agent_id,
            to_agent_id=message.to_agent_id,
            action=message.action,
            method=message.method,
            params=message.params
        )
        
        await memory_cache.add_message(a2a_message.model_dump())
        
        session = await sqlite_store.get_session()
        try:
            db_message = MessageDB(**a2a_message.model_dump())
            session.add(db_message)
            await session.commit()
        finally:
            await session.close()
        
        await ws_manager.broadcast_activity("a2a_message_sent", {
            "message": a2a_message.model_dump()
        })
        
        result = await self._handle_message(a2a_message)
        
        if result:
            a2a_message.result = result
            await memory_cache.add_message(a2a_message.model_dump())
        
        return a2a_message

    async def _handle_message(self, message: A2AMessage) -> Optional[Dict[str, Any]]:
        if message.method == "agent.list":
            agents = await memory_cache.list_agents()
            return {"agents": agents}
        
        elif message.method == "agent.capabilities":
            agent = await memory_cache.get_agent(message.to_agent_id)
            if agent:
                return {
                    "agent_id": agent["id"],
                    "capabilities": agent.get("capabilities", []),
                    "status": agent.get("status", "unknown")
                }
        
        elif message.method == "agent.status":
            agent = await memory_cache.get_agent(message.to_agent_id)
            if agent:
                return {
                    "agent_id": agent["id"],
                    "status": agent.get("status", "unknown"),
                    "current_task_id": agent.get("current_task_id")
                }
        
        elif message.method == "task.create":
            from app.services.task_service import task_service
            task = await task_service.create_task(Task(
                type=TaskType.COLLABORATIVE,
                name=message.params.get("name", "Delegated Task"),
                description=f"Delegated from {message.from_agent_id}",
                assigned_agents=[message.to_agent_id],
                params=message.params.get("params", {})
            ))
            return {"task_id": task.id, "status": task.status.value}
        
        elif message.method == "task.delegate":
            from app.services.task_service import task_service
            parent_task = await task_service.get_task(message.params.get("task_id"))
            if parent_task:
                subtask = await task_service.create_task(Task(
                    type=TaskType.COLLABORATIVE,
                    name=f"Subtask of {parent_task.name}",
                    description=f"Delegated from agent {message.from_agent_id}",
                    assigned_agents=[message.to_agent_id],
                    parent_task_id=parent_task.id,
                    params=message.params.get("params", {})
                ))
                return {"task_id": subtask.id, "status": subtask.status.value}
        
        elif message.method == "task.status":
            from app.services.task_service import task_service
            task = await task_service.get_task(message.params.get("task_id"))
            if task:
                return {
                    "task_id": task.id,
                    "status": task.status.value,
                    "progress": task.progress,
                    "result": task.result,
                    "error": task.error
                }
        
        elif message.method == "task.result":
            from app.services.task_service import task_service
            task = await task_service.get_task(message.params.get("task_id"))
            if task:
                return {
                    "task_id": task.id,
                    "result": task.result,
                    "error": task.error,
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None
                }
        
        return None

    async def get_messages_for_agent(self, agent_id: str) -> List[A2AMessage]:
        messages = await memory_cache.get_messages_for_agent(agent_id)
        return [A2AMessage(**m) for m in messages]

    async def create_response_message(self, original_message: A2AMessage, result: Dict[str, Any]) -> A2AMessage:
        response = A2AMessage(
            from_agent_id=original_message.to_agent_id,
            to_agent_id=original_message.from_agent_id,
            action=MessageAction.RESPONSE,
            method=original_message.method,
            params={},
            result=result
        )
        
        await memory_cache.add_message(response.model_dump())
        
        session = await sqlite_store.get_session()
        try:
            db_message = MessageDB(**response.model_dump())
            session.add(db_message)
            await session.commit()
        finally:
            await session.close()
        
        return response

    async def notify_agents_capabilities(self, requesting_agent_id: str) -> List[Dict[str, Any]]:
        agents = await memory_cache.list_agents()
        capabilities = []
        
        for agent in agents:
            if agent["id"] != requesting_agent_id:
                capabilities.append({
                    "agent_id": agent["id"],
                    "name": agent["name"],
                    "capabilities": agent.get("capabilities", []),
                    "status": agent.get("status", "unknown")
                })
        
        await memory_cache.add_activity("capabilities_discovered", {
            "requesting_agent": requesting_agent_id,
            "available_agents": capabilities
        })
        
        return capabilities


a2a_service = A2AService()
