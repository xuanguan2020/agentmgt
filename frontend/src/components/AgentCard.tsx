import { Agent } from '../types';
import { Activity, Circle, Trash2 } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onDelete?: (id: string) => void;
  onSelect?: (agent: Agent) => void;
  selected?: boolean;
}

export function AgentCard({ agent, onDelete, onSelect, selected }: AgentCardProps) {
  const statusColors = {
    idle: 'bg-green-500',
    busy: 'bg-yellow-500',
    offline: 'bg-gray-400',
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  return (
    <div
      onClick={() => onSelect?.(agent)}
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Circle
            className={`w-3 h-3 fill-current ${statusColors[agent.status]}`}
          />
          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(agent.id);
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-500">
        <span className="font-mono text-xs">ID: {agent.id.slice(0, 8)}...</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
          >
            {cap}
          </span>
        ))}
      </div>

      {agent.current_task_id && (
        <div className="mt-3 flex items-center gap-1 text-xs text-yellow-600">
          <Activity className="w-3 h-3" />
          <span>Task: {agent.current_task_id.slice(0, 8)}...</span>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        Last heartbeat: {formatTime(agent.last_heartbeat)}
      </div>
    </div>
  );
}
