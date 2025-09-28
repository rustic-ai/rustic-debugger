import { Link } from 'react-router-dom';
import type { Guild } from '@rustic-debug/types';
import { Activity, MessageSquare, Users } from 'lucide-react';

interface GuildCardProps {
  guild: Guild;
}

export function GuildCard({ guild }: GuildCardProps) {
  const statusColor = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    inactive: 'bg-gray-500',
  }[guild.status];
  
  return (
    <Link
      to={`/debug/${guild.id.id}`}
      className="block p-6 bg-card border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{guild.name}</h3>
          <p className="text-sm text-muted-foreground">{guild.namespace}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm capitalize">{guild.status}</span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1 text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>Topics</span>
          </span>
          <span className="font-medium">{guild.metadata.topicCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Agents</span>
          </span>
          <span className="font-medium">{guild.metadata.agentCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1 text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Message Rate</span>
          </span>
          <span className="font-medium">{guild.metadata.messageRate.toFixed(1)}/s</span>
        </div>
      </div>
    </Link>
  );
}