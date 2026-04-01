import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import type { Task, TaskCreate, TaskStatus } from '../types';

const API_BASE = '/api';

export function useTasks() {
  const { tasks, runningTasks, setTasks, setRunningTasks, addTask, updateTask } = useAppStore();

  const fetchTasks = useCallback(async (statusFilter?: TaskStatus) => {
    const url = statusFilter 
      ? `${API_BASE}/tasks?status=${statusFilter}` 
      : `${API_BASE}/tasks`;
    const response = await fetch(url);
    const data = await response.json();
    setTasks(data);
  }, [setTasks]);

  const fetchRunningTasks = useCallback(async () => {
    const response = await fetch(`${API_BASE}/tasks/running`);
    const data = await response.json();
    setRunningTasks(data);
  }, [setRunningTasks]);

  const createTask = useCallback(async (taskData: TaskCreate): Promise<Task | null> => {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const task = await response.json();
      addTask(task);
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      return null;
    }
  }, [addTask]);

  const updateTaskStatus = useCallback(async (
    taskId: string, 
    status: TaskStatus,
    additionalUpdates?: Partial<Task>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...additionalUpdates }),
      });
      const updatedTask = await response.json();
      updateTask(taskId, updatedTask);
      return true;
    } catch (error) {
      console.error('Failed to update task:', error);
      return false;
    }
  }, [updateTask]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      return false;
    }
  }, []);

  return {
    tasks,
    runningTasks,
    fetchTasks,
    fetchRunningTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
  };
}
