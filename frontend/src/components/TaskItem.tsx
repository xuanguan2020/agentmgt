import { Task } from '../types';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle, Users } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onSelect?: (task: Task) => void;
}

export function TaskItem({ task, onSelect }: TaskItemProps) {
  const statusConfig = {
    pending: { 
      icon: Clock, 
      color: 'text-slate-500', 
      bg: 'bg-slate-100',
      border: 'border-slate-200'
    },
    running: { 
      icon: Loader2, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-100',
      border: 'border-indigo-200'
    },
    completed: { 
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-100',
      border: 'border-emerald-200'
    },
    failed: { 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-100',
      border: 'border-red-200'
    },
    cancelled: { 
      icon: AlertCircle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100',
      border: 'border-amber-200'
    },
  };

  const config = statusConfig[task.status];
  const StatusIcon = config.icon;

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  return (
    <div
      onClick={() => onSelect?.(task)}
      className={`group p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        config.border
      } bg-white hover:shadow-md hover:border-indigo-300`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
            <StatusIcon className={`w-4 h-4 ${config.color} ${task.status === 'running' ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-slate-900 truncate">{task.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                {task.status}
              </span>
              {task.type === 'collaborative' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                  <Users className="w-3 h-3" />
                  Collaborative
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="font-mono">ID: {task.id.slice(0, 12)}...</span>
        {task.assigned_agents.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {task.assigned_agents.length} agent{task.assigned_agents.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {task.status === 'running' && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium text-indigo-600">{Math.round(task.progress * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${task.progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {task.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {task.error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>Created {formatTime(task.created_at)}</span>
        {task.started_at && <span>Started {formatTime(task.started_at)}</span>}
        {task.completed_at && <span className="text-emerald-600">Completed {formatTime(task.completed_at)}</span>}
      </div>
    </div>
  );
}
