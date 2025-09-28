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
  // Core identification
  id: { id: 'msg-123' },
  priority: 1,
  timestamp: Date.now(),

  // Sender information
  sender: { name: 'agent1', id: 'agent1' },

  // Topic information
  topics: 'test-guild:general',
  topic_published_to: 'test-guild:general',

  // Recipients
  recipient_list: [],

  // Message content
  payload: { type: 'test', content: {} },
  format: 'test.message.TestMessage',

  // Threading
  in_response_to: undefined,
  thread: [],
  conversation_id: null,

  // Computed thread properties
  current_thread_id: null,
  root_thread_id: null,

  // Forwarding
  forward_header: null,

  // Routing
  routing_slip: null,

  // History
  message_history: [],

  // TTL and enrichment
  ttl: null,
  enrich_with_history: 0,

  // Status
  is_error_message: false,
  process_status: 'success',

  // Tracing
  traceparent: null,

  // Session
  session_state: {},
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

    // When enabled: false, the query stays in pending state with fetchStatus idle
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
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

    // When enabled: false, the query stays in pending state with fetchStatus idle
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});

describe('useThreadMessages', () => {
  it.skip('fetches and sorts thread messages - TECH DEBT: needs investigation', async () => {
    const { apiClient } = await import('@/services/api/client');

    const threadMessages = [
      { ...mockMessage, timestamp: 1704067202000 },
      { ...mockMessage, timestamp: 1704067201000 },
      { ...mockMessage, timestamp: 1704067203000 },
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
    const timestamps = result.current.data?.map((m: any) => m.timestamp) || [];
    expect(timestamps).toEqual([
      1704067201000,
      1704067202000,
      1704067203000,
    ]);
  });
  
  it('does not fetch when threadId or guildId is null', () => {
    const { result } = renderHook(
      () => useThreadMessages(null, 'test-guild'),
      { wrapper: createWrapper() }
    );

    // When enabled: false, the query stays in pending state with fetchStatus idle
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});