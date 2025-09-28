import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import type { MessageStatus } from '@rustic-debug/types';

interface UseMessagesOptions {
  guildId: string | null;
  topicName?: string | null;
  status?: MessageStatus[];
  threadId?: string;
  start?: Date;
  end?: Date;
  limit?: number;
}

export function useMessages(options: UseMessagesOptions) {
  const { guildId, topicName, status, threadId, start, end, limit = 50 } = options;
  
  return useQuery({
    queryKey: ['messages', guildId, topicName, status, threadId, start, end, limit],
    queryFn: async () => {
      if (!guildId) return null;
      
      const params: any = { limit };
      if (status?.length) params.status = status;
      if (threadId) params.threadId = threadId;
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();
      
      if (topicName) {
        return apiClient.getTopicMessages(guildId, topicName, params);
      } else {
        return apiClient.getGuildMessages(guildId, params);
      }
    },
    enabled: !!guildId,
    refetchInterval: 2000, // Faster refresh for messages
  });
}

export function useInfiniteMessages(options: UseMessagesOptions) {
  const { guildId, topicName, status, threadId, start, end, limit = 50 } = options;
  
  return useInfiniteQuery({
    queryKey: ['messages-infinite', guildId, topicName, status, threadId, start, end],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!guildId) return null;
      
      const params: any = { 
        limit, 
        offset: (pageParam as number) * limit,
      };
      if (status?.length) params.status = status;
      if (threadId) params.threadId = threadId;
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();
      
      if (topicName) {
        return apiClient.getTopicMessages(guildId, topicName, params);
      } else {
        return apiClient.getGuildMessages(guildId, params);
      }
    },
    getNextPageParam: (lastPage: any, pages) => {
      if (!lastPage || !lastPage?.meta?.hasMore) return undefined;
      return pages.length;
    },
    enabled: !!guildId,
    refetchInterval: 2000,
  });
}

export function useMessage(messageId: string | null) {
  return useQuery({
    queryKey: ['message', messageId],
    queryFn: () => messageId ? apiClient.getMessage(messageId) : null,
    enabled: !!messageId,
  });
}

export function useThreadMessages(threadId: string | null, guildId: string | null) {
  return useQuery({
    queryKey: ['thread-messages', threadId, guildId],
    queryFn: async () => {
      if (!threadId || !guildId) return null;
      const response = await apiClient.getGuildMessages(guildId, {
        threadId,
        limit: 100,
      });
      return response.data?.sort((a: any, b: any) => 
        new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
      ) || [];
    },
    enabled: !!threadId && !!guildId,
    refetchInterval: 2000,
  });
}