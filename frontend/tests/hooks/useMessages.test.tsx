import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessages, useMessage, useThreadMessages } from '@/hooks/useMessages';
import type { Message } from '@rustic-debug/types';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockMessage: Message = {
  id: { id: 'msg-123', timestamp: Date.now() },
  guildId: 'test-guild',
  topicName: 'general',
  threadId: null,
  payload: { type: 'test', content: {} },
  metadata: {
    sourceAgent: 'agent1',
    timestamp: new Date().toISOString(),
    priority: 1,
    retryCount: 0,
    maxRetries: 3,
  },
  status: { current: 'success', history: [] },
  routing: { source: 'agent1', hops: [] },
};

// Mock API client
vi.mock('@/services/api/client', () => ({
  apiClient: {
    getGuildMessages: vi.fn(() => Promise.resolve({
      success: true,
      data: [mockMessage],
      meta: { total: 1, hasMore: false },
    })),
    getTopicMessages: vi.fn(() => Promise.resolve({
      success: true,
      data: [mockMessage],
      meta: { total: 1, hasMore: false },
    })),
    getMessage: vi.fn(() => Promise.resolve(mockMessage)),
  },
}));

describe('useMessages', () => {
  it('fetches guild messages when no topic specified', async () => {
    const { result } = renderHook(
      () => useMessages({ guildId: 'test-guild' }),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].id.id).toBe('msg-123');
  });
  
  it('fetches topic messages when topic specified', async () => {
    const { result } = renderHook(
      () => useMessages({ guildId: 'test-guild', topicName: 'general' }),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data?.data).toHaveLength(1);
  });
  
  it('does not fetch when guildId is null', () => {
    const { result } = renderHook(
      () => useMessages({ guildId: null }),
      { wrapper: createWrapper() }
    );
    
    // When enabled: false, the query stays in idle state
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
  
  it('applies filters to query', async () => {
    const { apiClient } = await import('@/services/api/client');
    
    renderHook(
      () => useMessages({ 
        guildId: 'test-guild',
        status: ['error', 'retry'],
        threadId: 'thread-123',
        limit: 100,
      }),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(apiClient.getGuildMessages).toHaveBeenCalledWith('test-guild', {
        limit: 100,
        status: ['error', 'retry'],
        threadId: 'thread-123',
      });
    });
  });
});

describe('useMessage', () => {
  it('fetches single message by ID', async () => {
    const { result } = renderHook(
      () => useMessage('msg-123'),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data?.id.id).toBe('msg-123');
  });
  
  it('does not fetch when messageId is null', () => {
    const { result } = renderHook(
      () => useMessage(null),
      { wrapper: createWrapper() }
    );
    
    // When enabled: false, the query stays in idle state
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe('useThreadMessages', () => {
  it('fetches and sorts thread messages', async () => {
    const { apiClient } = await import('@/services/api/client');
    
    const threadMessages = [
      { ...mockMessage, metadata: { ...mockMessage.metadata, timestamp: '2024-01-01T00:00:02Z' } },
      { ...mockMessage, metadata: { ...mockMessage.metadata, timestamp: '2024-01-01T00:00:01Z' } },
      { ...mockMessage, metadata: { ...mockMessage.metadata, timestamp: '2024-01-01T00:00:03Z' } },
    ];
    
    apiClient.getGuildMessages = vi.fn(() => Promise.resolve({
      success: true,
      data: threadMessages,
      meta: { total: 3, hasMore: false },
    }));
    
    const { result } = renderHook(
      () => useThreadMessages('thread-123', 'test-guild'),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    // Messages should be sorted by timestamp
    const timestamps = result.current.data?.map((m: any) => m.metadata.timestamp) || [];
    expect(timestamps).toEqual([
      '2024-01-01T00:00:01Z',
      '2024-01-01T00:00:02Z',
      '2024-01-01T00:00:03Z',
    ]);
  });
  
  it('does not fetch when threadId or guildId is null', () => {
    const { result } = renderHook(
      () => useThreadMessages(null, 'test-guild'),
      { wrapper: createWrapper() }
    );
    
    // When enabled: false, the query stays in idle state
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});