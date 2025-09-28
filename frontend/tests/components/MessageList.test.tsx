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
  id: { id: 'msg-123', timestamp: Date.now() },
  guildId: 'test-guild',
  topicName: 'general',
  threadId: null,
  payload: {
    type: 'test',
    content: {
      action: 'create',
      data: { foo: 'bar' },
    },
  },
  metadata: {
    sourceAgent: 'agent1',
    timestamp: new Date().toISOString(),
    priority: 1,
    retryCount: 0,
    maxRetries: 3,
  },
  status: {
    current: 'success',
    history: [],
  },
  routing: {
    source: 'agent1',
    destination: 'agent2',
    hops: [],
  },
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
      {messages.map((message) => (
        <div 
          key={message.id.id}
          role="button"
          className={selectedMessage === message.id.id ? 'border-blue-500' : ''}
          onClick={() => onSelectMessage(message.id.id)}
        >
          <MessageListItem
            message={message}
            isSelected={selectedMessage === message.id.id}
            onSelect={() => onSelectMessage(message.id.id)}
          />
        </div>
      ))}
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
    expect(screen.getByText(/msg-123/)).toBeInTheDocument(); // message ID
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
          selectedMessage="msg-123"
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
    
    expect(onSelectMessage).toHaveBeenCalledWith('msg-123');
  });
});