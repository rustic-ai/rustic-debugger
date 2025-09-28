import { ReactNode } from 'react';
import { 
  Inbox, 
  Search, 
  ServerCrash, 
  MessageSquareOff,
  Database
} from 'lucide-react';

interface EmptyStateProps {
  variant?: 'no-data' | 'no-results' | 'error' | 'no-messages' | 'no-connection';
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const variants = {
  'no-data': {
    icon: Inbox,
    title: 'No data yet',
    description: 'Data will appear here once available',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters',
  },
  'error': {
    icon: ServerCrash,
    title: 'Something went wrong',
    description: 'An error occurred while loading the data',
  },
  'no-messages': {
    icon: MessageSquareOff,
    title: 'No messages',
    description: 'Messages will appear here as they are sent',
  },
  'no-connection': {
    icon: Database,
    title: 'Connection lost',
    description: 'Unable to connect to the Redis server',
  },
};

export function EmptyState({ 
  variant = 'no-data', 
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  const config = variants[variant];
  const Icon = config.icon;
  
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {title || config.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {description || config.description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}