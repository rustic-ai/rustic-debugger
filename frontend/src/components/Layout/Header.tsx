import { Link } from 'react-router-dom';
import { useConnectionStatus } from '@hooks/useConnectionStatus';

export function Header() {
  const { isConnected, latency } = useConnectionStatus();

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-xl font-semibold">
          Rustic Debug
        </Link>
        <span className="text-sm text-muted-foreground">
          Redis Messaging Debugger
        </span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'
          }`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? `Connected (${latency}ms)` : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
}