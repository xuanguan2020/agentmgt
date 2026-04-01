export type AgentStatus = "idle" | "busy" | "offline";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  current_task_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  last_heartbeat: string;
}

export interface AgentCreate {
  name: string;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskType = "standalone" | "collaborative";

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  name: string;
  description: string | null;
  assigned_agents: string[];
  parent_task_id: string | null;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  progress: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskCreate {
  type: TaskType;
  name: string;
  description?: string;
  assigned_agents?: string[];
  params?: Record<string, unknown>;
}

export type MessageAction = "request" | "response" | "notify";

export interface A2AMessage {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  action: MessageAction;
  method: string;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  timestamp: string;
}

export interface A2AMessageSend {
  to_agent_id: string;
  action: MessageAction;
  method: string;
  params: Record<string, unknown>;
}

export interface ActivityLogEntry {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface DiscoveryConfig {
  gateway_url: string;
  api_key?: string;
  enabled?: boolean;
}

export interface DiscoveryStatus {
  enabled: boolean;
  gateway_url: string;
  last_discovery: string | null;
  auto_discovery_running: boolean;
}

export interface GatewayAgentsResponse {
  agents: Agent[];
  gateway_url: string;
  count: number;
}
