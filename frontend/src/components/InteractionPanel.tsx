import { useState } from 'react';
import { Agent, A2AMessageSend } from '../types';
import { Send, ArrowRight, MessageSquare, ChevronDown } from 'lucide-react';

interface InteractionPanelProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSendMessage: (fromAgentId: string, message: A2AMessageSend) => Promise<void>;
}

const A2A_METHODS = [
  { value: 'agent.list', label: 'List Agents', icon: '📋' },
  { value: 'agent.capabilities', label: 'Get Capabilities', icon: '🔍' },
  { value: 'agent.status', label: 'Get Status', icon: '📊' },
  { value: 'task.create', label: 'Create Task', icon: '✨' },
  { value: 'task.delegate', label: 'Delegate Task', icon: '📨' },
  { value: 'task.status', label: 'Get Task Status', icon: '📈' },
];

export function InteractionPanel({ agents, selectedAgentId, onSendMessage }: InteractionPanelProps) {
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [method, setMethod] = useState<string>('agent.list');
  const [params, setParams] = useState<string>('{}');
  const [isSending, setIsSending] = useState(false);
  const [showMethods, setShowMethods] = useState(false);

  const handleSend = async () => {
    if (!selectedAgentId || !targetAgentId) return;

    setIsSending(true);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(params);
      } catch {
        parsedParams = {};
      }

      await onSendMessage(selectedAgentId, {
        to_agent_id: targetAgentId,
        action: "request",
        method,
        params: parsedParams,
      });
      
      setParams('{}');
    } finally {
      setIsSending(false);
    }
  };

  const otherAgents = agents.filter((a) => a.id !== selectedAgentId);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900">A2A Interaction</h2>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 truncate">
              {selectedAgent?.name || 'Select an agent'}
            </div>
          </div>
          
          <div className="flex items-center justify-center pt-5">
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
            <select
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
            >
              <option value="">Select target</option>
              {otherAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Method</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMethods(!showMethods)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-left flex items-center justify-between focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
            >
              <span>{A2A_METHODS.find(m => m.value === method)?.label || 'Select method'}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showMethods ? 'rotate-180' : ''}`} />
            </button>
            
            {showMethods && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {A2A_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMethod(m.value);
                      setShowMethods(false);
                    }}
                    className={`w-full px-3 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors duration-150 cursor-pointer ${
                      method === m.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Parameters (JSON)</label>
          <textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none"
            rows={3}
            placeholder='{"key": "value"}'
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!selectedAgentId || !targetAgentId || isSending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send Message'}
        </button>

        {(!selectedAgentId || otherAgents.length === 0) && (
          <p className="text-xs text-slate-500 text-center">
            {!selectedAgentId 
              ? 'Select an agent from the list to start'
              : 'No other agents available'}
          </p>
        )}
      </div>
    </div>
  );
}
