from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.agent import Agent, AgentCreate, AgentUpdate, AgentStatus, HeartbeatRequest
from app.storage.memory_cache import memory_cache
from app.storage.sqlite_store import sqlite_store, AgentDB
from app.websocket.manager import ws_manager
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class AgentService:
    async def create_agent(self, agent_data: AgentCreate) -> Agent:
        agent = Agent(
            name=agent_data.name,
            capabilities=agent_data.capabilities,
            metadata=agent_data.metadata
        )
        
        await memory_cache.add_agent(agent.model_dump())
        
        session = await sqlite_store.get_session()
        try:
            db_agent = AgentDB(**agent.model_dump())
            session.add(db_agent)
            await session.commit()
        finally:
            await session.close()
        
        await ws_manager.broadcast_agent_update(agent.id, agent.model_dump())
        await memory_cache.add_activity("agent_registered", {"agent": agent.model_dump()})
        
        return agent

    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        cached = await memory_cache.get_agent(agent_id)
        if cached:
            return Agent(**cached)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(AgentDB).where(AgentDB.id == agent_id))
            db_agent = result.scalar_one_or_none()
            if db_agent:
                agent_dict = {
                    "id": db_agent.id,
                    "name": db_agent.name,
                    "status": db_agent.status,
                    "capabilities": db_agent.capabilities,
                    "current_task_id": db_agent.current_task_id,
                    "metadata": db_agent.metadata,
                    "created_at": db_agent.created_at,
                    "last_heartbeat": db_agent.last_heartbeat
                }
                await memory_cache.add_agent(agent_dict)
                return Agent(**agent_dict)
        finally:
            await session.close()
        
        return None

    async def list_agents(self) -> List[Agent]:
        cached = await memory_cache.list_agents()
        if cached:
            return [Agent(**a) for a in cached]
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(AgentDB))
            db_agents = result.scalars().all()
            agents = []
            for db_agent in db_agents:
                agent_dict = {
                    "id": db_agent.id,
                    "name": db_agent.name,
                    "status": db_agent.status,
                    "capabilities": db_agent.capabilities,
                    "current_task_id": db_agent.current_task_id,
                    "metadata": db_agent.metadata,
                    "created_at": db_agent.created_at,
                    "last_heartbeat": db_agent.last_heartbeat
                }
                agents.append(Agent(**agent_dict))
                await memory_cache.add_agent(agent_dict)
            return agents
        finally:
            await session.close()

    async def update_agent(self, agent_id: str, updates: AgentUpdate) -> Optional[Agent]:
        update_dict = updates.model_dump(exclude_unset=True)
        
        await memory_cache.update_agent(agent_id, update_dict)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(AgentDB).where(AgentDB.id == agent_id))
            db_agent = result.scalar_one_or_none()
            if db_agent:
                for key, value in update_dict.items():
                    setattr(db_agent, key, value)
                await session.commit()
                
                agent_dict = {
                    "id": db_agent.id,
                    "name": db_agent.name,
                    "status": db_agent.status,
                    "capabilities": db_agent.capabilities,
                    "current_task_id": db_agent.current_task_id,
                    "metadata": db_agent.metadata,
                    "created_at": db_agent.created_at,
                    "last_heartbeat": db_agent.last_heartbeat
                }
                await ws_manager.broadcast_agent_update(agent_id, agent_dict)
                return Agent(**agent_dict)
        finally:
            await session.close()
        
        return None

    async def delete_agent(self, agent_id: str) -> bool:
        removed = await memory_cache.remove_agent(agent_id)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(AgentDB).where(AgentDB.id == agent_id))
            db_agent = result.scalar_one_or_none()
            if db_agent:
                await session.delete(db_agent)
                await session.commit()
                removed = True
        finally:
            await session.close()
        
        if removed:
            await ws_manager.broadcast_activity("agent_removed", {"agent_id": agent_id})
        
        return removed

    async def heartbeat(self, agent_id: str, heartbeat: HeartbeatRequest) -> Optional[Agent]:
        updates = {
            "last_heartbeat": datetime.utcnow(),
        }
        if heartbeat.status:
            updates["status"] = heartbeat.status.value
        if heartbeat.current_task_id:
            updates["current_task_id"] = heartbeat.current_task_id
        
        await memory_cache.update_agent(agent_id, updates)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(AgentDB).where(AgentDB.id == agent_id))
            db_agent = result.scalar_one_or_none()
            if db_agent:
                for key, value in updates.items():
                    setattr(db_agent, key, value)
                await session.commit()
                
                agent_dict = {
                    "id": db_agent.id,
                    "name": db_agent.name,
                    "status": db_agent.status,
                    "capabilities": db_agent.capabilities,
                    "current_task_id": db_agent.current_task_id,
                    "metadata": db_agent.metadata,
                    "created_at": db_agent.created_at,
                    "last_heartbeat": db_agent.last_heartbeat
                }
                return Agent(**agent_dict)
        finally:
            await session.close()
        
        return None

    async def check_offline_agents(self) -> None:
        agents = await self.list_agents()
        now = datetime.utcnow()
        for agent in agents:
            if agent.status != AgentStatus.OFFLINE:
                time_diff = (now - agent.last_heartbeat).total_seconds()
                if time_diff > 120:
                    await self.update_agent(agent.id, AgentUpdate(status=AgentStatus.OFFLINE))


agent_service = AgentService()
