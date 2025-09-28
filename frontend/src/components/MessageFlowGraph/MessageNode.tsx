import { Handle, Position, NodeProps } from 'reactflow';
import type { Message } from '@rustic-debug/types';
import { Clock, Hash, Code } from 'lucide-react';

interface MessageNodeData {
  message: Message;
  color: string;
  isSelected?: boolean;
  isFromSelectedTopic?: boolean;
  onSelect?: (messageId: string) => void;
}

export function MessageNode({ data }: NodeProps<MessageNodeData>) {
  const { message, color, isSelected, isFromSelectedTopic, onSelect } = data;
  const msgId = typeof message.id === 'number' ? message.id.toString() :
                typeof message.id === 'string' ? message.id :
                message.id?.id || '';

  // Format timestamp
  const timestamp = message.timestamp;
  const date = typeof timestamp === 'number' ? new Date(timestamp) :
               timestamp instanceof Date ? timestamp : new Date(timestamp);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const agentName = message.sender?.name || message.sender?.id || 'unknown';
  const topicName = typeof message.topics === 'string' ? message.topics :
                   Array.isArray(message.topics) ? message.topics[0] :
                   message.topic || 'unknown';

  // Helper function to get message format class name
  const getMessageFormatClassName = (message: Message) => {
    if (!message.format) {
      return 'Unknown';
    }

    // Split by dot and get the last element (class name)
    const parts = message.format.split('.');
    return parts[parts.length - 1];
  };

  return (
    <div
      className={`
        bg-card border-2 rounded-lg p-3 min-w-[220px] max-w-[280px]
        ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-border'}
        hover:shadow-lg transition-all cursor-pointer
        ${isFromSelectedTopic === false ? 'opacity-40' : ''}
        ${isFromSelectedTopic === true ? 'ring-2 ring-accent/30' : ''}
      `}
      onClick={() => onSelect?.(msgId)}
      style={{
        borderLeftColor: color,
        borderLeftWidth: '4px',
      }}
    >
      <Handle type="target" position={Position.Top} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: color }}
          >
            {agentName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-medium truncate max-w-[100px]">
            {agentName}
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
      </div>

      {/* Message Format - Prominent */}
      <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-primary/10 rounded-md border-l-2 border-primary/40">
        <Code className="w-3 h-3 text-primary" />
        <span className="text-xs font-semibold text-primary truncate font-code">
          {getMessageFormatClassName(message)}
        </span>
      </div>

      {/* Topic */}
      <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
        <Hash className="w-3 h-3" />
        <span className="truncate">{topicName}</span>
      </div>

      {/* Message ID */}
      <div className="text-xs text-muted-foreground truncate font-code">
        ID: {msgId.substring(0, 12)}...
      </div>

      {/* Thread indicator */}
      {message.in_response_to !== undefined && message.in_response_to !== null && (
        <div className="text-xs text-muted-foreground mt-1">
          ↩ Response to: {message.in_response_to.toString().substring(0, 8)}...
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}