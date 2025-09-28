import { Handle, Position } from 'react-flow-renderer';
import { MessageSquare, Server, User } from 'lucide-react';

export interface MessageFlowNodeData {
  label: string;
  type: 'guild' | 'topic' | 'agent';
  stats?: {
    messageCount?: number;
    errorRate?: number;
    throughput?: number;
  };
  status?: 'active' | 'idle' | 'error';
}

interface MessageFlowNodeProps {
  data: MessageFlowNodeData;
}

export function MessageFlowNode({ data }: MessageFlowNodeProps) {
  const Icon = {
    guild: Server,
    topic: MessageSquare,
    agent: User,
  }[data.type];
  
  const nodeClasses = {
    guild: 'status-info-bg border-2 border-blue-300 dark:border-blue-600',
    topic: 'status-success-bg border-2 border-green-300 dark:border-green-600',
    agent: 'bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-600',
  }[data.type];
  
  const statusIndicator = data.status && {
    active: 'bg-green-500 dark:bg-green-400',
    idle: 'bg-yellow-500 dark:bg-yellow-400',
    error: 'bg-red-500 dark:bg-red-400',
  }[data.status];
  
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div className={`px-4 py-3 rounded-lg border-2 min-w-[200px] ${nodeClasses}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className="w-5 h-5" />
            <span className="font-medium">{data.label}</span>
          </div>
          {statusIndicator && (
            <div className={`w-2 h-2 rounded-full ${statusIndicator}`} />
          )}
        </div>
        
        {data.stats && (
          <div className="space-y-1 text-xs opacity-75">
            {data.stats.messageCount !== undefined && (
              <div className="flex items-center justify-between">
                <span>Messages:</span>
                <span className="font-medium">{data.stats.messageCount}</span>
              </div>
            )}
            {data.stats.throughput !== undefined && (
              <div className="flex items-center justify-between">
                <span>Throughput:</span>
                <span className="font-medium">{data.stats.throughput.toFixed(1)}/s</span>
              </div>
            )}
            {data.stats.errorRate !== undefined && (
              <div className="flex items-center justify-between">
                <span>Errors:</span>
                <span className="font-medium text-red-600">{data.stats.errorRate}%</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}