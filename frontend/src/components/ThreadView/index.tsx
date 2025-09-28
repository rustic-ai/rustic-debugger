import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useMessageStore } from '@stores/messageStore';
import { useGuildStore } from '@stores/guildStore';
import type { Message } from '@rustic-debug/types';
import { MessageSquare, ArrowDown, ArrowUp, User } from 'lucide-react';
import { useState } from 'react';

export function ThreadView() {
  const { selectedMessageId } = useMessageStore();
  const { selectedGuildId } = useGuildStore();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  
  // Get the selected message
  const { data: selectedMessage } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => selectedMessageId ? apiClient.getMessage(selectedMessageId) : null,
    enabled: !!selectedMessageId,
  });
  
  // Get thread messages if selected message has a threadId
  const { data: threadMessages, isLoading } = useQuery({
    queryKey: ['thread', selectedMessage?.threadId],
    queryFn: async () => {
      if (!selectedMessage?.threadId || !selectedGuildId) return [];
      
      // Fetch all messages in the thread
      const response = await apiClient.getGuildMessages(selectedGuildId, {
        threadId: selectedMessage.threadId,
        limit: 100,
      });
      
      return response.data?.sort((a, b) => 
        new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
      ) || [];
    },
    enabled: !!selectedMessage?.threadId && !!selectedGuildId,
  });
  
  const toggleMessage = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };
  
  if (!selectedMessage?.threadId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a message with a thread to view conversation</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading thread messages...
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Thread View</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Thread ID: {selectedMessage.threadId}
        </p>
        <p className="text-sm text-muted-foreground">
          {threadMessages?.length || 0} messages in thread
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {threadMessages?.map((message: any, index: number) => (
            <ThreadMessage
              key={message.id.id}
              message={message}
              isExpanded={expandedMessages.has(message.id.id)}
              onToggle={() => toggleMessage(message.id.id)}
              isSelected={message.id.id === selectedMessageId}
              isFirst={index === 0}
              isLast={index === (threadMessages.length - 1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThreadMessageProps {
  message: Message;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
}

function ThreadMessage({ 
  message, 
  isExpanded, 
  onToggle, 
  isSelected,
  isFirst,
  isLast 
}: ThreadMessageProps) {
  const timestamp = new Date(message.metadata.timestamp);
  const payloadPreview = JSON.stringify(message.payload.content).slice(0, 100);
  
  return (
    <div className="relative">
      {/* Thread line */}
      {!isFirst && (
        <div className="absolute left-4 -top-4 w-0.5 h-4 bg-border" />
      )}
      {!isLast && (
        <div className="absolute left-4 bottom-0 w-0.5 h-full bg-border" />
      )}
      
      <div className={`relative flex items-start space-x-3 ${
        isSelected ? 'bg-primary/10 -mx-2 px-2 py-2 rounded' : ''
      }`}>
        {/* Thread node */}
        <div className="relative z-10 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${
            message.status.current === 'success' ? 'bg-green-500 dark:bg-green-400' :
            message.status.current === 'error' ? 'bg-red-500 dark:bg-red-400' :
            message.status.current === 'processing' ? 'bg-blue-500 dark:bg-blue-400' :
            'bg-gray-400'
          }`} />
        </div>
        
        <div className="flex-1 space-y-2">
          <button
            onClick={onToggle}
            className="w-full text-left group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{message.payload.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{message.metadata.sourceAgent}</span>
                  </div>
                  {message.metadata.targetAgent && (
                    <>
                      <span>→</span>
                      <span>{message.metadata.targetAgent}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {isExpanded ? (
                  <ArrowUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
            
            {!isExpanded && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {payloadPreview}...
              </p>
            )}
          </button>
          
          {isExpanded && (
            <div className="space-y-3 pl-3 border-l-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Payload</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  <code>{JSON.stringify(message.payload.content, null, 2)}</code>
                </pre>
              </div>
              
              {message.error && (
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">Error</p>
                  <div className="text-xs status-error-bg p-2 rounded">
                    <p className="font-medium">{message.error.code}</p>
                    <p>{message.error.message}</p>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Message ID: {message.id.id}</p>
                <p>Priority: {message.metadata.priority}</p>
                <p>Retries: {message.metadata.retryCount}/{message.metadata.maxRetries}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}