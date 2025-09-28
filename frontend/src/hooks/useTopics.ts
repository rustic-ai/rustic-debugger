import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';

export function useTopics(guildId: string | null) {
  return useQuery({
    queryKey: ['topics', guildId],
    queryFn: () => guildId ? apiClient.getTopics(guildId) : null,
    enabled: !!guildId,
    refetchInterval: 5000,
  });
}

export function useTopic(guildId: string | null, topicName: string | null) {
  return useQuery({
    queryKey: ['topic', guildId, topicName],
    queryFn: () => (guildId && topicName) ? apiClient.getTopic(guildId, topicName) : null,
    enabled: !!guildId && !!topicName,
    refetchInterval: 5000,
  });
}