import { useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Activity } from 'lucide-react';

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

  const getActivityIcon = (_type: string) => {
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getActivityDescription = (entry: { type: string; data: Record<string, unknown> }) => {
    switch (entry.type) {
      case 'agent_registered':
        return `Agent registered: ${(entry.data.agent as { name?: string })?.name || 'Unknown'}`;
      case 'agent_removed':
        return `Agent removed: ${entry.data.agent_id}`;
      case 'task_created':
        return `Task created: ${(entry.data.task as { name?: string })?.name || 'Unknown'}`;
      case 'task_status_changed':
        return `Task ${(entry.data.task_id as string)?.slice(0, 8)} status: ${entry.data.status}`;
      case 'a2a_message_sent':
        return `A2A: ${entry.data.message ? 'Message sent' : 'Unknown'}`;
      case 'capabilities_discovered':
        return `Agent ${(entry.data.requesting_agent as string)?.slice(0, 8)} discovered capabilities`;
      default:
        return entry.type;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-gray-600" />
        <h2 className="font-semibold text-gray-900">Activity Log</h2>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
        style={{ maxHeight: '400px' }}
      >
        {activityLog.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No activity yet
          </div>
        ) : (
          activityLog.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
            >
              {getActivityIcon(entry.type)}
              <div className="flex-1 min-w-0">
                <div className="text-gray-700">
                  {getActivityDescription(entry)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatTimestamp(entry.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
