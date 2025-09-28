import type { Message } from '@rustic-debug/types';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  User,
  ArrowRight
} from 'lucide-react';

interface MessageListItemProps {
  message: Message;
  isSelected: boolean;
  onSelect: () => void;
}

export function MessageListItem({ message, isSelected, onSelect }: MessageListItemProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600' },
    processing: { icon: Clock, color: 'text-blue-600' },
    running: { icon: Clock, color: 'text-blue-600' },
    completed: { icon: CheckCircle, color: 'text-green-600' },
    success: { icon: CheckCircle, color: 'text-green-600' },
    error: { icon: AlertCircle, color: 'text-red-600' },
    timeout: { icon: Clock, color: 'text-orange-600' },
    rejected: { icon: X, color: 'text-gray-600' },
  };

  // Determine the status - use process_status if available, otherwise check is_error_message
  const status = message.process_status || (message.is_error_message ? 'error' : 'completed');
  const config = statusConfig[status] || statusConfig.completed;
  const Icon = config.icon;

  // Get timestamp - it's now a direct field
  const timestamp = new Date(message.timestamp);

  // Get message ID
  const msgId = typeof message.id === 'number' ? message.id.toString() :
                typeof message.id === 'string' ? message.id :
                message.id?.id || 'unknown';

  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left p-4 hover:bg-muted/50 hover:shadow-sm transition-all duration-200 ${
        isSelected ? 'bg-primary/10 border-l-4 border-primary shadow-sm' : ''
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-medium">
              {message.payload?.type || 'message'}
            </span>
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-code">
            {msgId.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{message.sender?.name || message.sender?.id || 'unknown'}</span>
          </div>

          {message.recipient_list && message.recipient_list.length > 0 && (
            <>
              <ArrowRight className="w-3 h-3" />
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{message.recipient_list[0]?.name || message.recipient_list[0]?.id || 'unknown'}</span>
              </div>
            </>
          )}

          {message.thread && message.thread.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
              Thread
            </span>
          )}
        </div>

        {message.is_error_message && (
          <p className="text-xs text-red-600 truncate">
            Error in message
          </p>
        )}
      </div>
    </button>
  );
}