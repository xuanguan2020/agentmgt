import { useState } from 'react';
import { Agent, A2AMessageSend } from '../types';
import { Send, ArrowRight } from 'lucide-react';

interface InteractionPanelProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSendMessage: (fromAgentId: string, message: A2AMessageSend) => Promise<void>;
}

const A2A_METHODS = [
  { value: 'agent.list', label: 'List Agents' },
  { value: 'agent.capabilities', label: 'Get Capabilities' },
  { value: 'agent.status', label: 'Get Status' },
  { value: 'task.create', label: 'Create Task' },
  { value: 'task.delegate', label: 'Delegate Task' },
  { value: 'task.status', label: 'Get Task Status' },
];

export function InteractionPanel({ agents, selectedAgentId, onSendMessage }: InteractionPanelProps) {
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [method, setMethod] = useState<string>('agent.list');
  const [params, setParams] = useState<string>('{}');
  const [isSending, setIsSending] = useState(false);

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
    } finally {
      setIsSending(false);
    }
  };

  const otherAgents = agents.filter((a) => a.id !== selectedAgentId);

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h2 className="font-semibold text-gray-900 mb-4">A2A Interaction</h2>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">From:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
            {selectedAgentId ? agents.find((a) => a.id === selectedAgentId)?.name || selectedAgentId.slice(0, 8) : 'None'}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">To:</span>
          <select
            value={targetAgentId}
            onChange={(e) => setTargetAgentId(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Select target agent</option>
            {otherAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {A2A_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Params (JSON)</label>
          <textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
            rows={3}
            placeholder='{"key": "value"}'
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!selectedAgentId || !targetAgentId || isSending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  );
}
