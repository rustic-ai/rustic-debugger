import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@services/api/client';
import { useGuildStore } from '@stores/guildStore';
import type { Guild } from '@rustic-debug/types';
import { Search, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { LoadingSkeleton } from '../LoadingSkeleton';

export function GuildExplorer() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedGuildId, setSelectedGuild } = useGuildStore();
  
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => apiClient.getGuilds({ limit: 100 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const guilds = data?.data || [];
  const filteredGuilds = guilds.filter(guild => 
    guild.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.namespace.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleGuildSelect = (guild: Guild) => {
    setSelectedGuild(guild.id.id);
    navigate(`/debug/${guild.id.id}`);
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <h2 className="text-lg font-semibold">Guild Explorer</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search guilds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background"
          />
        </div>
        
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton variant="list" lines={3} />
          </div>
        ) : filteredGuilds.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? 'No guilds match your search' : 'No guilds found'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredGuilds.map((guild) => (
              <GuildItem
                key={guild.id.id}
                guild={guild}
                isSelected={selectedGuildId === guild.id.id}
                onSelect={() => handleGuildSelect(guild)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GuildItemProps {
  guild: Guild;
  isSelected: boolean;
  onSelect: () => void;
}

function GuildItem({ guild, isSelected, onSelect }: GuildItemProps) {
  const statusColors = {
    active: 'text-green-600 bg-green-100',
    idle: 'text-yellow-600 bg-yellow-100',
    inactive: 'text-gray-600 bg-gray-100',
  };
  
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 hover:bg-muted hover:shadow-sm transition-all duration-200 ${
        isSelected ? 'bg-primary/10 border-l-4 border-primary shadow-sm' : ''
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{guild.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[guild.status]}`}>
            {guild.status}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">{guild.namespace}</p>
        
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span>{guild.metadata.topicCount} topics</span>
          <span>{guild.metadata.agentCount} agents</span>
          <span>{guild.metadata.messageRate.toFixed(1)} msg/s</span>
        </div>
      </div>
    </button>
  );
}