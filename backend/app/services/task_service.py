from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.task import Task, TaskCreate, TaskUpdate, TaskStatus, TaskType
from app.storage.memory_cache import memory_cache
from app.storage.sqlite_store import sqlite_store, TaskDB
from app.websocket.manager import ws_manager
from sqlalchemy import select
import asyncio


class TaskService:
    async def create_task(self, task_data: TaskCreate) -> Task:
        task = Task(
            type=task_data.type,
            name=task_data.name,
            description=task_data.description,
            assigned_agents=task_data.assigned_agents,
            parent_task_id=task_data.parent_task_id,
            params=task_data.params
        )
        
        await memory_cache.add_task(task.model_dump())
        
        session = await sqlite_store.get_session()
        try:
            db_task = TaskDB(**task.model_dump())
            session.add(db_task)
            await session.commit()
        finally:
            await session.close()
        
        await ws_manager.broadcast_task_update(task.id, task.model_dump())
        await memory_cache.add_activity("task_created", {"task": task.model_dump()})
        
        return task

    async def get_task(self, task_id: str) -> Optional[Task]:
        cached = await memory_cache.get_task(task_id)
        if cached:
            return Task(**cached)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(TaskDB).where(TaskDB.id == task_id))
            db_task = result.scalar_one_or_none()
            if db_task:
                task_dict = self._db_to_dict(db_task)
                await memory_cache.add_task(task_dict)
                return Task(**task_dict)
        finally:
            await session.close()
        
        return None

    async def list_tasks(self, status_filter: Optional[str] = None) -> List[Task]:
        cached = await memory_cache.list_tasks(status_filter)
        if cached:
            return [Task(**t) for t in cached]
        
        session = await sqlite_store.get_session()
        try:
            query = select(TaskDB)
            if status_filter:
                query = query.where(TaskDB.status == status_filter)
            result = await session.execute(query)
            db_tasks = result.scalars().all()
            tasks = []
            for db_task in db_tasks:
                task_dict = self._db_to_dict(db_task)
                tasks.append(Task(**task_dict))
                await memory_cache.add_task(task_dict)
            return tasks
        finally:
            await session.close()

    async def get_running_tasks(self) -> List[Task]:
        cached = await memory_cache.get_running_tasks()
        if cached:
            return [Task(**t) for t in cached]
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(
                select(TaskDB).where(TaskDB.status == TaskStatus.RUNNING.value)
            )
            db_tasks = result.scalars().all()
            tasks = [Task(**self._db_to_dict(t)) for t in db_tasks]
            return tasks
        finally:
            await session.close()

    async def update_task(self, task_id: str, updates: TaskUpdate) -> Optional[Task]:
        update_dict = updates.model_dump(exclude_unset=True)
        
        if updates.status == TaskStatus.RUNNING and "started_at" not in update_dict:
            update_dict["started_at"] = datetime.utcnow()
        elif updates.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            update_dict["completed_at"] = datetime.utcnow()
        
        await memory_cache.update_task(task_id, update_dict)
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(TaskDB).where(TaskDB.id == task_id))
            db_task = result.scalar_one_or_none()
            if db_task:
                for key, value in update_dict.items():
                    setattr(db_task, key, value)
                await session.commit()
                
                task_dict = self._db_to_dict(db_task)
                await ws_manager.broadcast_task_update(task_id, task_dict)
                
                if updates.status:
                    await memory_cache.add_activity("task_status_changed", {
                        "task_id": task_id,
                        "status": updates.status.value
                    })
                
                return Task(**task_dict)
        finally:
            await session.close()
        
        return None

    async def delete_task(self, task_id: str) -> bool:
        cached = await memory_cache.get_task(task_id)
        if cached:
            task = Task(**cached)
            if task.status in [TaskStatus.RUNNING, TaskStatus.PENDING]:
                return False
        
        session = await sqlite_store.get_session()
        try:
            result = await session.execute(select(TaskDB).where(TaskDB.id == task_id))
            db_task = result.scalar_one_or_none()
            if db_task:
                await session.delete(db_task)
                await session.commit()
                await memory_cache.add_activity("task_deleted", {"task_id": task_id})
                return True
        finally:
            await session.close()
        
        return False

    def _db_to_dict(self, db_task: TaskDB) -> Dict[str, Any]:
        return {
            "id": db_task.id,
            "type": db_task.type,
            "status": db_task.status,
            "name": db_task.name,
            "description": db_task.description,
            "assigned_agents": db_task.assigned_agents,
            "parent_task_id": db_task.parent_task_id,
            "params": db_task.params,
            "result": db_task.result,
            "error": db_task.error,
            "progress": db_task.progress,
            "created_at": db_task.created_at,
            "started_at": db_task.started_at,
            "completed_at": db_task.completed_at
        }


task_service = TaskService()
