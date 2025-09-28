import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageInspector } from '@/components/MessageInspector';
import type { Message } from '@rustic-debug/types';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockMessage: Message = {
  id: { id: 'msg-123', timestamp: 1704067200000 },
  guildId: 'test-guild',
  topicName: 'general',
  threadId: 'thread-456',
  payload: {
    type: 'action',
    content: {
      action: 'create',
      data: { 
        name: 'Test Item',
        description: 'A test item for testing',
        tags: ['test', 'demo'],
      },
    },
  },
  metadata: {
    sourceAgent: 'agent1',
    timestamp: '2024-01-01T00:00:00Z',
    priority: 1,
    retryCount: 0,
    maxRetries: 3,
  },
  status: {
    current: 'success',
    history: [
      {
        status: 'pending',
        timestamp: '2024-01-01T00:00:00Z',
        message: 'Message created',
      },
      {
        status: 'processing',
        timestamp: '2024-01-01T00:00:01Z',
        message: 'Processing started',
      },
      {
        status: 'success',
        timestamp: '2024-01-01T00:00:02Z',
        message: 'Processing completed',
      },
    ],
  },
  routing: {
    source: 'agent1',
    destination: 'agent2',
    hops: [
      {
        agentId: 'router1',
        timestamp: '2024-01-01T00:00:01Z',
        latency: 10,
      },
    ],
  },
};

// Mock API client
vi.mock('@/services/api/client', () => ({
  apiClient: {
    getMessage: vi.fn((id) => {
      if (id === 'msg-123') {
        return Promise.resolve(mockMessage);
      }
      return Promise.resolve(null);
    }),
    getGuildMessages: vi.fn(() => Promise.resolve({
      success: true,
      data: [],
      meta: { total: 0, hasMore: false },
    })),
  },
}));

// Mock the message store
vi.mock('@stores/messageStore', () => ({
  useMessageStore: vi.fn(() => ({
    selectedMessageId: 'msg-123',
    selectMessage: vi.fn(),
  })),
}));

describe('MessageInspector', () => {
  it('renders message details', async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      // Check header
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
      expect(screen.getByText('Message Details')).toBeInTheDocument();
    });
    
    // Check tabs
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /payload/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /routing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /status history/i })).toBeInTheDocument();
  });
  
  it('shows overview by default', async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
    });
    
    // Overview content
    expect(screen.getByText('Guild ID')).toBeInTheDocument();
    expect(screen.getByText('test-guild')).toBeInTheDocument();
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('Thread ID')).toBeInTheDocument();
    expect(screen.getByText('thread-456')).toBeInTheDocument();
  });
  
  it('switches tabs when clicked', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
    });
    
    // Click payload tab
    const payloadTab = screen.getByRole('tab', { name: /payload/i });
    await user.click(payloadTab);
    
    // Should show JSON content
    expect(screen.getByText(/action/)).toBeInTheDocument();
    expect(screen.getByText(/Test Item/)).toBeInTheDocument();
  });
  
  it('shows status history with timeline', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
    });
    
    // Click status history tab
    const historyTab = screen.getByRole('tab', { name: /status history/i });
    await user.click(historyTab);
    
    // Should show status entries
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('Message created')).toBeInTheDocument();
    expect(screen.getByText('Processing started')).toBeInTheDocument();
    expect(screen.getByText('Processing completed')).toBeInTheDocument();
  });
  
  it('calls selectMessage(null) when close button clicked', async () => {
    const user = userEvent.setup();
    const { useMessageStore } = await import('@stores/messageStore');
    const mockSelectMessage = vi.fn();
    
    (useMessageStore as any).mockReturnValue({
      selectedMessageId: 'msg-123',
      selectMessage: mockSelectMessage,
    });
    
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
    });
    
    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);
    
    expect(mockSelectMessage).toHaveBeenCalledWith(null);
  });
  
  it('renders error message if present', async () => {
    const { apiClient } = await import('@/services/api/client');
    const messageWithError = {
      ...mockMessage,
      status: { current: 'error' as const, history: [] },
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process message',
        timestamp: '2024-01-01T00:00:03Z',
        context: {
          retryCount: 3,
          lastError: 'Connection timeout',
        },
      },
    };
    
    // Override getMessage to return error message
    (apiClient.getMessage as any).mockImplementation(() => 
      Promise.resolve(messageWithError)
    );
    
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MessageInspector />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/ID: msg-123/)).toBeInTheDocument();
    });
    
    // Error should be visible in overview
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Failed to process message')).toBeInTheDocument();
  });
});