import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: () => apiClient.getGuilds(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 2000, // Consider data stale after 2 seconds
  });
}

export function useGuild(guildId: string | null) {
  return useQuery({
    queryKey: ['guild', guildId],
    queryFn: () => guildId ? apiClient.getGuild(guildId) : null,
    enabled: !!guildId,
    refetchInterval: 5000,
  });
}

export function useDeleteGuild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (guildId: string) => apiClient.deleteGuild(guildId),
    onSuccess: (_, guildId) => {
      // Invalidate guild queries
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
      queryClient.removeQueries({ queryKey: ['topics', guildId] });
    },
  });
}