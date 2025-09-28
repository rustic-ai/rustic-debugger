import { RefreshCw } from 'lucide-react';

interface MessageListHeaderProps {
  messageCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function MessageListHeader({ messageCount, isRefreshing, onRefresh }: MessageListHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-2">
        <h3 className="font-medium">Messages</h3>
        <span className="text-sm text-muted-foreground">
          ({messageCount.toLocaleString()})
        </span>
      </div>
      
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
        title="Refresh messages"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}