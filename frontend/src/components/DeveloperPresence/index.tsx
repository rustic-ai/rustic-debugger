import { useWebSocket } from '@hooks/useWebSocket';
import { Users, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Developer {
  id: string;
  name: string;
  viewing: {
    guildId?: string;
    topicName?: string;
  };
  lastActive: string;
}

export function DeveloperPresence() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const { subscribe, isConnected } = useWebSocket();
  
  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = subscribe('developer-presence', (data: any) => {
      if (data.type === 'update') {
        setDevelopers(data.developers || []);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [subscribe]);
  
  const activeDevelopers = developers.filter(dev => {
    const lastActive = new Date(dev.lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Active within last 5 minutes
  });
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <Circle className={`w-2 h-2 fill-current ${
          isConnected ? 'text-green-500' : 'text-red-500'
        }`} />
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {activeDevelopers.length > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-muted rounded-full">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">{activeDevelopers.length}</span>
          <div className="flex -space-x-2">
            {activeDevelopers.slice(0, 3).map((dev) => (
              <div
                key={dev.id}
                className="w-6 h-6 rounded-full bg-primary/20 border border-background flex items-center justify-center"
                title={`${dev.name}${dev.viewing.guildId ? ` - Viewing ${dev.viewing.guildId}` : ''}`}
              >
                <span className="text-xs font-medium">
                  {dev.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {activeDevelopers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-muted border border-background flex items-center justify-center">
                <span className="text-xs">+{activeDevelopers.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function usePresenceTracking() {
  const { isConnected } = useWebSocket();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  useEffect(() => {
    if (!isConnected) return;
    
    // Send presence update every 30 seconds
    const interval = setInterval(() => {
      // This would be implemented by the WebSocket client
      // wsClient.sendPresence({ viewing: currentViewState });
      setLastUpdate(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected]);
  
  return { lastUpdate };
}