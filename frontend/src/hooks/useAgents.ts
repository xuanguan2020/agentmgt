import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import type { Agent, AgentCreate } from '../types';

const API_BASE = '/api';

export function useAgents() {
  const { agents, setAgents, addAgent, updateAgent, removeAgent } = useAppStore();

  const fetchAgents = useCallback(async () => {
    const response = await fetch(`${API_BASE}/agents`);
    const data = await response.json();
    setAgents(data);
  }, [setAgents]);

  const createAgent = useCallback(async (agentData: AgentCreate): Promise<Agent | null> => {
    try {
      const response = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      const agent = await response.json();
      addAgent(agent);
      return agent;
    } catch (error) {
      console.error('Failed to create agent:', error);
      return null;
    }
  }, [addAgent]);

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      await fetch(`${API_BASE}/agents/${agentId}`, { method: 'DELETE' });
      removeAgent(agentId);
      return true;
    } catch (error) {
      console.error('Failed to delete agent:', error);
      return false;
    }
  }, [removeAgent]);

  return {
    agents,
    fetchAgents,
    createAgent,
    deleteAgent,
    updateAgent,
  };
}
