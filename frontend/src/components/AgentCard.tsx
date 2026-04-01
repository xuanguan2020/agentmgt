import { Agent } from '../types';
import { Activity, Trash2, Cpu } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onDelete?: (id: string) => void;
  onSelect?: (agent: Agent) => void;
  selected?: boolean;
}

export function AgentCard({ agent, onDelete, onSelect, selected }: AgentCardProps) {
  const statusConfig = {
    idle: { 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200', 
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
      text: 'text-emerald-600'
    },
    busy: { 
      bg: 'bg-amber-50', 
      border: 'border-amber-200', 
      badge: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-500',
      text: 'text-amber-600'
    },
    offline: { 
      bg: 'bg-slate-50', 
      border: 'border-slate-200', 
      badge: 'bg-slate-100 text-slate-600',
      dot: 'bg-slate-400',
      text: 'text-slate-500'
    },
  };

  const config = statusConfig[agent.status];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  return (
    <div
      onClick={() => onSelect?.(agent)}
      className={`group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        selected
          ? `${config.border} ${config.bg}`
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            agent.status === 'idle' ? 'bg-emerald-100' :
            agent.status === 'busy' ? 'bg-amber-100' : 'bg-slate-100'
          }`}>
            <Cpu className={`w-4 h-4 ${config.text}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 truncate">{agent.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
              <span className={`text-xs font-medium ${config.text} capitalize`}>{agent.status}</span>
            </div>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(agent.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <span className="font-mono text-xs text-slate-400">ID: {agent.id.slice(0, 12)}...</span>
      </div>

      {agent.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-md"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-md">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}

      {agent.current_task_id && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
          <Activity className="w-3 h-3" />
          <span className="truncate">Task: {agent.current_task_id.slice(0, 8)}...</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <span>Heartbeat: {formatTime(agent.last_heartbeat)}</span>
      </div>
    </div>
  );
}
