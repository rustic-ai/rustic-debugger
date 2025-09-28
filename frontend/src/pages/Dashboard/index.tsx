import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { GuildCard } from './GuildCard';
import { StatsOverview } from './StatsOverview';

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => apiClient.getGuilds({ limit: 50 }),
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading guilds...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">
          Failed to load guilds: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }
  
  const guilds = data?.data || [];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and debug Redis message flow across all guilds
        </p>
      </div>
      
      <StatsOverview guilds={guilds} />
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Guilds</h2>
        {guilds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No guilds found. Make sure RusticAI is running and has active guilds.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.map((guild) => (
              <GuildCard key={guild.id.id} guild={guild} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}