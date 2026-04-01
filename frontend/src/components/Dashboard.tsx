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
import { 
  Plus, RefreshCw, WifiOff, Users, ListTodo, 
  Radar, Settings, Activity, Cpu, Clock, X 
} from 'lucide-react';

const API_BASE = '/api';

export function Dashboard() {
  const { agents, fetchAgents, createAgent, deleteAgent } = useAgents();
  const { tasks, runningTasks, fetchTasks, fetchRunningTasks, createTask } = useTasks();
  const { wsConnected } = useAppStore();
  const { fetchActivityLog } = { 
    fetchActivityLog: async () => {
      const res = await fetch(`${API_BASE}/activity`);
      const data = await res.json();
      useAppStore.getState().setActivityLog(data);
    }
  };
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

  const idleAgents = agents.filter(a => a.status === 'idle').length;
  const busyAgents = agents.filter(a => a.status === 'busy').length;
  const offlineAgents = agents.filter(a => a.status === 'offline').length;

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">OpenClaw Agent Management</h1>
                <p className="text-xs text-slate-500">Multi-Agent Collaboration Platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                wsConnected 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {wsConnected ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Disconnected</span>
                  </>
                )}
              </div>
              
              <div className="h-6 w-px bg-slate-200"></div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDiscover}
                  disabled={isDiscovering}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer"
                  title="Discover agents"
                >
                  <Radar className={`w-5 h-5 ${isDiscovering ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowDiscoveryModal(true)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer"
                  title="Settings"
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
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-slate-900">Agents</h2>
                  </div>
                  <button
                    onClick={() => setShowAgentModal(true)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-slate-600">{idleAgents} idle</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-xs text-slate-600">{busyAgents} busy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs text-slate-600">{offlineAgents} offline</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 space-y-2 max-h-[480px] overflow-y-auto">
                {agents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No agents yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click + to register or use Discover</p>
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

          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-slate-900">Running Tasks</h2>
                    {runningTasks.length > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        {runningTasks.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                {runningTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No running tasks</p>
                    <p className="text-xs text-slate-400 mt-1">Tasks will appear here when running</p>
                  </div>
                ) : (
                  runningTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-semibold text-slate-900">All Tasks</h2>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                      <ListTodo className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No tasks yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create a task to get started</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-6">
            <InteractionPanel
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSendMessage={handleSendA2AMessage}
            />
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <ActivityLog />
            </div>
          </div>
        </div>
      </main>

      {showAgentModal && (
        <Modal onClose={() => setShowAgentModal(false)} title="Register New Agent">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent Name</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Capabilities</label>
              <input
                type="text"
                value={newAgentCaps}
                onChange={(e) => setNewAgentCaps(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="coding, analysis, research"
              />
              <p className="text-xs text-slate-500 mt-1.5">Comma-separated list of capabilities</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAgentModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgent}
                disabled={!newAgentName.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Register Agent
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showTaskModal && (
        <Modal onClose={() => setShowTaskModal(false)} title="Create New Task">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Name</label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Enter task name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Task Type</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as 'standalone' | 'collaborative')}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              >
                <option value="standalone">Standalone</option>
                <option value="collaborative">Collaborative</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskName.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Create Task
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showDiscoveryModal && (
        <Modal onClose={() => setShowDiscoveryModal(false)} title="Gateway Discovery Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gateway URL</label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="http://localhost:8080"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key (optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                placeholder="Leave empty if no auth required"
              />
            </div>
            {discoveryStatus && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className={`font-medium ${discoveryStatus.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {discoveryStatus.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Auto-discovery</span>
                  <span className={`font-medium ${discoveryStatus.auto_discovery_running ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {discoveryStatus.auto_discovery_running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                {discoveryStatus.last_discovery && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Last discovery</span>
                    <span className="text-slate-900 font-medium">
                      {new Date(discoveryStatus.last_discovery).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDiscoveryConfig}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ 
  children, 
  onClose, 
  title 
}: { 
  children: React.ReactNode; 
  onClose: () => void; 
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
