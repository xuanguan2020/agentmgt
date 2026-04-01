import { create } from 'zustand';
import type { Agent, Task, ActivityLogEntry, WebSocketMessage } from '../types';

interface AppState {
  agents: Agent[];
  tasks: Task[];
  runningTasks: Task[];
  activityLog: ActivityLogEntry[];
  wsConnected: boolean;
  
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
  
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  
  setRunningTasks: (tasks: Task[]) => void;
  
  addActivity: (entry: ActivityLogEntry) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  
  setWsConnected: (connected: boolean) => void;
  
  handleWebSocketMessage: (message: WebSocketMessage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  agents: [],
  tasks: [],
  runningTasks: [],
  activityLog: [],
  wsConnected: false,
  
  setAgents: (agents) => set({ agents }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (agentId, updates) => set((state) => ({
    agents: state.agents.map((a) => a.id === agentId ? { ...a, ...updates } : a)
  })),
  removeAgent: (agentId) => set((state) => ({
    agents: state.agents.filter((a) => a.id !== agentId)
  })),
  
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updates } : t),
    runningTasks: state.runningTasks.map((t) => 
      t.id === taskId ? { ...t, ...updates } : t
    ).filter((t) => t.status === 'running')
  })),
  
  setRunningTasks: (tasks) => set({ runningTasks: tasks }),
  
  addActivity: (entry) => set((state) => ({
    activityLog: [...state.activityLog.slice(-99), entry]
  })),
  setActivityLog: (log) => set({ activityLog: log }),
  
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
  handleWebSocketMessage: (message) => set((state) => {
    if (message.type === 'agent_update') {
      const agentData = message.data as Agent;
      const existing = state.agents.find(a => a.id === message.agent_id);
      if (existing) {
        return {
          agents: state.agents.map((a) => 
            a.id === message.agent_id ? { ...a, ...agentData } : a
          )
        };
      } else {
        return { agents: [...state.agents, agentData] };
      }
    }
    
    if (message.type === 'task_update') {
      const taskData = message.data as Task;
      const existing = state.tasks.find(t => t.id === message.task_id);
      if (existing) {
        return {
          tasks: state.tasks.map((t) => 
            t.id === message.task_id ? { ...t, ...taskData } : t
          )
        };
      } else {
        return { tasks: [...state.tasks, taskData] };
      }
    }
    
    if (message.type === 'activity') {
      return {
        activityLog: [...state.activityLog.slice(-99), {
          type: message.activity_type as string,
          data: message.data as Record<string, unknown>,
          timestamp: message.timestamp as string
        }]
      };
    }
    
    return state;
  })
}));
