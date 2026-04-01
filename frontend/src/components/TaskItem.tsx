import { Task } from '../types';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onSelect?: (task: Task) => void;
}

export function TaskItem({ task, onSelect }: TaskItemProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
    running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
    cancelled: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-100' },
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
      className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${config.color} ${task.status === 'running' ? 'animate-spin' : ''}`} />
          <span className="font-medium text-gray-900">{task.name}</span>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.color}`}>
          {task.status}
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <span className="font-mono">ID: {task.id.slice(0, 8)}...</span>
        <span className="ml-3">Type: {task.type}</span>
        {task.assigned_agents.length > 0 && (
          <span className="ml-3">Agents: {task.assigned_agents.length}</span>
        )}
      </div>

      {task.status === 'running' && task.progress > 0 && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${task.progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 mt-1">{Math.round(task.progress * 100)}%</span>
        </div>
      )}

      {task.error && (
        <div className="mt-2 text-xs text-red-500">
          Error: {task.error}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 flex gap-4">
        <span>Created: {formatTime(task.created_at)}</span>
        {task.started_at && <span>Started: {formatTime(task.started_at)}</span>}
        {task.completed_at && <span>Completed: {formatTime(task.completed_at)}</span>}
      </div>
    </div>
  );
}
