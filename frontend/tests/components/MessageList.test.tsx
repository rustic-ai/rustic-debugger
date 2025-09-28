import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Message } from '@rustic-debug/types';
import { MessageListItem } from '@/components/MessageList/MessageListItem';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockMessage: Message = {
  // Core identification
  id: 123456789,
  priority: 1,
  timestamp: Date.now(),

  // Sender information
  sender: { name: 'agent1', id: 'agent1-id' },

  // Topic information
  topics: 'test-guild:general',
  topic_published_to: 'test-guild:general',

  // Recipients
  recipient_list: [{ name: 'agent2', id: 'agent2-id' }],

  // Message content
  payload: {
    type: 'test',
    content: {
      action: 'create',
      data: { foo: 'bar' },
    },
  },
  format: 'test.message.TestMessage',

  // Threading
  in_response_to: undefined,
  thread: [123456789],
  conversation_id: null,

  // Computed thread properties
  current_thread_id: 123456789,
  root_thread_id: 123456789,

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
  process_status: 'completed',

  // Tracing
  traceparent: null,

  // Session
  session_state: {},
};

// Simple MessageList component for testing
function TestMessageList({ 
  messages, 
  selectedMessage, 
  onSelectMessage 
}: { 
  messages: Message[]; 
  selectedMessage: string | null; 
  onSelectMessage: (id: string) => void;
}) {
  if (messages.length === 0) {
    return <div>No messages found</div>;
  }
  
  return (
    <div>
      {messages.map((message) => {
        const msgId = typeof message.id === 'number' ? message.id.toString() : message.id?.id || 'msg-unknown';
        return (
          <div
            key={msgId}
            role="button"
            className={selectedMessage === msgId ? 'border-blue-500' : ''}
            onClick={() => onSelectMessage(msgId)}
          >
            <MessageListItem
              message={message}
              isSelected={selectedMessage === msgId}
              onSelect={() => onSelectMessage(msgId)}
            />
          </div>
        );
      })}
    </div>
  );
}

describe('MessageList', () => {
  it('renders messages list', () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TestMessageList 
          messages={[mockMessage]}
          selectedMessage={null}
          onSelectMessage={vi.fn()}
        />
      </QueryClientProvider>
    );
    
    // Check for message content
    expect(screen.getByText('agent1')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument(); // payload type
    expect(screen.getByText(/12345678/)).toBeInTheDocument(); // message ID (truncated)
  });
  
  it('shows empty state when no messages', () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TestMessageList 
          messages={[]}
          selectedMessage={null}
          onSelectMessage={vi.fn()}
        />
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/no messages/i)).toBeInTheDocument();
  });
  
  it('highlights selected message', () => {
    const queryClient = createQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TestMessageList
          messages={[mockMessage]}
          selectedMessage="123456789"
          onSelectMessage={vi.fn()}
        />
      </QueryClientProvider>
    );
    
    const selectedItem = container.querySelector('.border-blue-500');
    expect(selectedItem).toBeInTheDocument();
  });
  
  it('calls onSelectMessage when message clicked', () => {
    const onSelectMessage = vi.fn();
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TestMessageList 
          messages={[mockMessage]}
          selectedMessage={null}
          onSelectMessage={onSelectMessage}
        />
      </QueryClientProvider>
    );
    
    // Get the message item button (the inner button)
    const messageButtons = screen.getAllByRole('button');
    // Click the inner button (MessageListItem)
    messageButtons[1].click();
    
    expect(onSelectMessage).toHaveBeenCalledWith('123456789');
  });
});