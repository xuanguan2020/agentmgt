import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

const API_BASE = '/api';

interface DiscoveryStatus {
  enabled: boolean;
  gateway_url: string;
  last_discovery: string | null;
  auto_discovery_running: boolean;
}

interface GatewayAgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    status: string;
    capabilities: string[];
    current_task_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    last_heartbeat: string;
  }>;
  gateway_url: string;
  count: number;
}

export function useDiscovery() {
  const { addAgent } = useAppStore();

  const getDiscoveryStatus = useCallback(async (): Promise<DiscoveryStatus | null> => {
    try {
      const response = await fetch(`${API_BASE}/discovery/status`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get discovery status:', error);
      return null;
    }
  }, []);

  const configureDiscovery = useCallback(async (
    gatewayUrl: string,
    apiKey?: string,
    enabled?: boolean
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/discovery/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_url: gatewayUrl,
          api_key: apiKey,
          enabled: enabled ?? true
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to configure discovery:', error);
      return false;
    }
  }, []);

  const triggerDiscovery = useCallback(async (): Promise<GatewayAgentsResponse | null> => {
    try {
      const response = await fetch(`${API_BASE}/discovery/trigger`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.agents_found > 0) {
        for (const agent of data.agents) {
          addAgent(agent);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Failed to trigger discovery:', error);
      return null;
    }
  }, [addAgent]);

  const discoverAgents = useCallback(async (): Promise<GatewayAgentsResponse | null> => {
    try {
      const response = await fetch(`${API_BASE}/discovery/agents`);
      const data = await response.json();
      
      if (data.agents && data.agents.length > 0) {
        for (const agent of data.agents) {
          addAgent(agent);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Failed to discover agents:', error);
      return null;
    }
  }, [addAgent]);

  return {
    getDiscoveryStatus,
    configureDiscovery,
    triggerDiscovery,
    discoverAgents,
  };
}

export interface SessionSpawnRequest {
  target_agent_id: string;
  task: Record<string, unknown>;
}

export interface SessionSendRequest {
  session_id: string;
  message: string;
}

export async function sessionSpawn(request: SessionSpawnRequest): Promise<{ session_id: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/discovery/sessions/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return data.session_id ? { session_id: data.session_id } : null;
  } catch (error) {
    console.error('Failed to spawn session:', error);
    return null;
  }
}

export async function sessionSend(request: SessionSendRequest): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/discovery/sessions/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send message:', error);
    return false;
  }
}

export async function sessionHistory(sessionId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const response = await fetch(`${API_BASE}/discovery/sessions/${sessionId}/history`);
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Failed to get session history:', error);
    return [];
  }
}
