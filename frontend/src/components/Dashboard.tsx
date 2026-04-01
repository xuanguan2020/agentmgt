import { useState, useEffect, useCallback } from 'react';
import { useAgents } from '../hooks/useAgents';
import { useTasks } from '../hooks/useTasks';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAppStore } from '../stores/appStore';
import { AgentCard } from './AgentCard';
import { TaskItem } from './TaskItem';
import { ActivityLog } from './ActivityLog';
import { InteractionPanel } from './InteractionPanel';
import { AgentCreate, TaskCreate, A2AMessageSend } from '../types';
import { Plus, RefreshCw, Wifi, WifiOff, Users, ListTodo, Radar, Settings } from 'lucide-react';

const API_BASE = '/api';

export function Dashboard() {
  const { agents, fetchAgents, createAgent, deleteAgent } = useAgents();
  const { tasks, runningTasks, fetchTasks, fetchRunningTasks, createTask } = useTasks();
  const { wsConnected } = useAppStore();
  const { fetchActivityLog } = { fetchActivityLog: async () => {
    const res = await fetch(`${API_BASE}/activity`);
    const data = await res.json();
    useAppStore.getState().setActivityLog(data);
  }};
  const { getDiscoveryStatus, configureDiscovery, triggerDiscovery } = useDiscovery();
  
  useWebSocket();

  const [discoveryStatus, setDiscoveryStatus] = useState<{
    enabled: boolean;
    gateway_url: string;
    last_discovery: string | null;
    auto_discovery_running: boolean;
  } | null>(null);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8080');
  const [apiKey, setApiKey] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentCaps, setNewAgentCaps] = useState('');
  
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState<'standalone' | 'collaborative'>('standalone');

  useEffect(() => {
    fetchAgents();
    fetchTasks();
    fetchRunningTasks();
    fetchActivityLog();
    fetchDiscoveryStatus();
  }, [fetchAgents, fetchTasks, fetchRunningTasks, fetchActivityLog]);

  const fetchDiscoveryStatus = async () => {
    const status = await getDiscoveryStatus();
    if (status) {
      setDiscoveryStatus(status);
      setGatewayUrl(status.gateway_url);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    const result = await triggerDiscovery();
    if (result) {
      await fetchAgents();
      await fetchActivityLog();
    }
    setIsDiscovering(false);
  };

  const handleSaveDiscoveryConfig = async () => {
    await configureDiscovery(gatewayUrl, apiKey || undefined, true);
    await fetchDiscoveryStatus();
    setShowDiscoveryModal(false);
  };

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    
    const agentData: AgentCreate = {
      name: newAgentName,
      capabilities: newAgentCaps.split(',').map((c) => c.trim()).filter(Boolean),
    };
    
    await createAgent(agentData);
    setNewAgentName('');
    setNewAgentCaps('');
    setShowAgentModal(false);
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return;
    
    const taskData: TaskCreate = {
      name: newTaskName,
      type: newTaskType,
      assigned_agents: selectedAgentId ? [selectedAgentId] : [],
    };
    
    await createTask(taskData);
    setNewTaskName('');
    setShowTaskModal(false);
    fetchRunningTasks();
  };

  const handleSendA2AMessage = useCallback(async (fromAgentId: string, message: A2AMessageSend) => {
    await fetch(`${API_BASE}/a2a/send?from_agent_id=${fromAgentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }, []);

  const handleDeleteAgent = async (agentId: string) => {
    await deleteAgent(agentId);
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null);
    }
  };

  const handleAgentSelect = (agent: { id: string }) => {
    setSelectedAgentId(agent.id);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">OpenClaw Agent Management</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Discover agents from Gateway"
            >
              <Radar className={`w-5 h-5 ${isDiscovering ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowDiscoveryModal(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Discovery settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                fetchAgents();
                fetchTasks();
                fetchRunningTasks();
                fetchActivityLog();
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-gray-900">Agents</h2>
                </div>
                <button
                  onClick={() => setShowAgentModal(true)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {agents.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No agents yet
                  </div>
                ) : (
                  agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={agent.id === selectedAgentId}
                      onSelect={handleAgentSelect}
                      onDelete={handleDeleteAgent}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-gray-900">Running Tasks</h2>
                  {runningTasks.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {runningTasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {runningTasks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No running tasks
                  </div>
                ) : (
                  runningTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-gray-900">All Tasks</h2>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {tasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No tasks yet
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <InteractionPanel
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSendMessage={handleSendA2AMessage}
            />
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <ActivityLog />
            </div>
          </div>
        </div>
      </main>

      {showAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Agent name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={newAgentCaps}
                  onChange={(e) => setNewAgentCaps(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="coding, analysis, research"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Task Name</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Task name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as 'standalone' | 'collaborative')}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="standalone">Standalone</option>
                  <option value="collaborative">Collaborative</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDiscoveryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Gateway Discovery Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Gateway URL</label>
                <input
                  type="text"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="http://localhost:8080"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">API Key (optional)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Leave empty if no auth required"
                />
              </div>
              {discoveryStatus && (
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Status: {discoveryStatus.enabled ? 'Enabled' : 'Disabled'}</p>
                  <p>Auto-discovery: {discoveryStatus.auto_discovery_running ? 'Running' : 'Stopped'}</p>
                  {discoveryStatus.last_discovery && (
                    <p>Last discovery: {new Date(discoveryStatus.last_discovery).toLocaleString()}</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscoveryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDiscoveryConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
