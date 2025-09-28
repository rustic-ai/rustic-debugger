import type { Guild } from '@rustic-debug/types';
import { Server, Activity, MessageSquare, Users } from 'lucide-react';

interface StatsOverviewProps {
  guilds: Guild[];
}

export function StatsOverview({ guilds }: StatsOverviewProps) {
  const activeGuilds = guilds.filter(g => g.status === 'active').length;
  const totalTopics = guilds.reduce((sum, g) => sum + g.metadata.topicCount, 0);
  const totalAgents = guilds.reduce((sum, g) => sum + g.metadata.agentCount, 0);
  const totalMessageRate = guilds.reduce((sum, g) => sum + g.metadata.messageRate, 0);
  
  const stats = [
    {
      label: 'Active Guilds',
      value: activeGuilds,
      total: guilds.length,
      icon: Server,
      color: 'text-blue-600',
    },
    {
      label: 'Total Topics',
      value: totalTopics,
      icon: MessageSquare,
      color: 'text-green-600',
    },
    {
      label: 'Active Agents',
      value: totalAgents,
      icon: Users,
      color: 'text-purple-600',
    },
    {
      label: 'Message Rate',
      value: `${totalMessageRate.toFixed(1)}/s`,
      icon: Activity,
      color: 'text-orange-600',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">
                {stat.value}
                {stat.total && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {stat.total}
                  </span>
                )}
              </p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}