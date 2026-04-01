import { useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Activity, UserPlus, UserMinus, ListChecks, MessageSquare, Radar, Zap } from 'lucide-react';

const typeConfig: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  agent_registered: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  agent_removed: { icon: UserMinus, color: 'text-red-600', bg: 'bg-red-100' },
  task_created: { icon: ListChecks, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  task_status_changed: { icon: ListChecks, color: 'text-purple-600', bg: 'bg-purple-100' },
  a2a_message_sent: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  capabilities_discovered: { icon: Radar, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  discovery_completed: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' },
  gateway_discovery_completed: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' },
  session_spawned: { icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
};

export function ActivityLog() {
  const { activityLog } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityLog]);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  const getActivityDescription = (entry: { type: string; data: Record<string, unknown> }) => {
    switch (entry.type) {
      case 'agent_registered':
        return `Agent registered: ${(entry.data.agent as { name?: string })?.name || (entry.data.name as string) || 'Unknown'}`;
      case 'agent_removed':
        return `Agent removed: ${(entry.data.agent_id as string)?.slice(0, 8)}`;
      case 'task_created':
        return `Task created: ${(entry.data.task as { name?: string })?.name || (entry.data.name as string) || 'Unknown'}`;
      case 'task_status_changed':
        return `Task ${(entry.data.task_id as string)?.slice(0, 8)} → ${entry.data.status}`;
      case 'a2a_message_sent':
        return 'A2A message sent';
      case 'capabilities_discovered':
        return `Capabilities discovered`;
      case 'gateway_discovery_completed':
        return `Discovery found ${entry.data.count} agents`;
      case 'discovery_completed':
        return `Discovery found ${entry.data.count} agents`;
      case 'session_spawned':
        return `Session spawned for ${(entry.data.target_agent_id as string)?.slice(0, 8)}`;
      default:
        return entry.type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900">Activity</h2>
          {activityLog.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
              {activityLog.length}
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: '360px' }}
      >
        {activityLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No activity yet</p>
            <p className="text-xs text-slate-400 mt-1">Events will appear here</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {[...activityLog].reverse().map((entry, index) => {
              const config = typeConfig[entry.type] || { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100' };
              const IconComponent = config.icon;
              
              return (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-150"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg} flex-shrink-0`}>
                    <IconComponent className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {getActivityDescription(entry)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
