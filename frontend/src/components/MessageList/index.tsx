import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useGuildStore } from '@stores/guildStore';
import { useMessageStore } from '@stores/messageStore';
import { useFilterStore } from '@stores/filterStore';
import { MessageListItem } from './MessageListItem';
import { MessageListHeader } from './MessageListHeader';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { EmptyState } from '../EmptyState';
import { useState } from 'react';

export function MessageList() {
  const { selectedGuildId, selectedTopicName } = useGuildStore();
  const { selectMessage, selectedMessageId } = useMessageStore();
  const filters = useFilterStore();
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'messages',
      selectedGuildId,
      selectedTopicName,
      filters.statusFilter,
      filters.searchText,
      filters.timeRange,
      page,
    ],
    queryFn: async () => {
      if (!selectedGuildId || !selectedTopicName) return null;
      
      const params: any = {
        limit: pageSize,
        offset: page * pageSize,
      };
      
      if (filters.statusFilter?.length) {
        params.status = filters.statusFilter;
      }
      
      if (filters.timeRange.start) {
        params.start = filters.timeRange.start.toISOString();
      }
      
      if (filters.timeRange.end) {
        params.end = filters.timeRange.end.toISOString();
      }
      
      return apiClient.getTopicMessages(selectedGuildId, selectedTopicName, params);
    },
    enabled: !!selectedGuildId && !!selectedTopicName,
    placeholderData: (previousData) => previousData,
  });
  
  const messages = data?.data || [];
  const totalMessages = data?.meta?.total || 0;
  const hasMore = data?.meta?.hasMore || false;
  
  const filteredMessages = messages.filter(msg => {
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const payloadStr = JSON.stringify(msg.payload.content).toLowerCase();
      const agentMatch = msg.metadata.sourceAgent.toLowerCase().includes(searchLower) ||
                        (msg.metadata.targetAgent?.toLowerCase().includes(searchLower) || false);
      
      if (!payloadStr.includes(searchLower) && !agentMatch) {
        return false;
      }
    }
    
    if (filters.agentFilter) {
      if (msg.metadata.sourceAgent !== filters.agentFilter &&
          msg.metadata.targetAgent !== filters.agentFilter) {
        return false;
      }
    }
    
    return true;
  });
  
  if (!selectedGuildId || !selectedTopicName) {
    return (
      <div className="h-full">
        <EmptyState 
          variant="no-data" 
          title="Select a guild and topic"
          description="Choose a guild and topic from the sidebar to view messages"
          className="h-full"
        />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <MessageListHeader
        messageCount={totalMessages}
        isRefreshing={isFetching}
        onRefresh={() => refetch()}
      />
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton variant="list" lines={5} />
          </div>
        ) : filteredMessages.length === 0 ? (
          <EmptyState 
            variant={filters.searchText || filters.statusFilter?.length || filters.agentFilter ? "no-results" : "no-messages"}
            action={
              filters.searchText || filters.statusFilter?.length || filters.agentFilter ? (
                <button
                  onClick={() => filters.clearFilters()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y">
            {filteredMessages.map((message) => {
              const msgId = typeof message.id === 'number' ? message.id.toString() :
                            typeof message.id === 'string' ? message.id :
                            message.id?.id || 'unknown';
              return (
                <MessageListItem
                  key={msgId}
                  message={message}
                  isSelected={selectedMessageId === msgId}
                  onSelect={() => selectMessage(msgId)}
                />
              );
            })}
          </div>
        )}
      </div>
      
      {(hasMore || page > 0) && (
        <div className="p-4 border-t flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="text-sm text-muted-foreground">
            Page {page + 1}
          </span>
          
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}