from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.task import Task, TaskCreate, TaskUpdate, TaskStatus
from app.services.task_service import task_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[Task])
async def list_tasks(status: Optional[str] = None):
    return await task_service.list_tasks(status)


@router.get("/running", response_model=List[Task])
async def get_running_tasks():
    return await task_service.get_running_tasks()


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=Task)
async def create_task(task_data: TaskCreate):
    return await task_service.create_task(task_data)


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, updates: TaskUpdate):
    task = await task_service.update_task(task_id, updates)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    success = await task_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete task (may be running or pending)")
    return {"status": "ok", "message": "Task deleted"}
