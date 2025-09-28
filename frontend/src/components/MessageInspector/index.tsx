import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useMessageStore } from '@stores/messageStore';
import type { Message } from '@rustic-debug/types';
import {
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  ArrowRight,
  X
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function MessageInspector() {
  const { selectedMessageId, selectMessage } = useMessageStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const { data: message, isLoading } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => selectedMessageId ? apiClient.getMessage(selectedMessageId) : null,
    enabled: !!selectedMessageId,
  });
  
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  if (!selectedMessageId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a message to inspect
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading message details...
      </div>
    );
  }
  
  if (!message) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Message not found
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-card">
      <MessageHeader message={message} onClose={() => selectMessage(null)} />
      <div className="flex-1 overflow-y-auto">
        <MessageStatus message={message} />
        <MessageMetadata message={message} onCopy={copyToClipboard} copiedField={copiedField} />
        <MessagePayload message={message} onCopy={copyToClipboard} copiedField={copiedField} />
        <MessageRouting message={message} />
        {message.error && <MessageError error={message.error} />}
      </div>
    </div>
  );
}

interface MessageHeaderProps {
  message: Message;
  onClose: () => void;
}

function MessageHeader({ message, onClose }: MessageHeaderProps) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">Message Details</h3>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {message.id.id}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface MessageStatusProps {
  message: Message;
}

function MessageStatus({ message }: MessageStatusProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    processing: { icon: Clock, color: 'text-blue-600 bg-blue-100' },
    success: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    error: { icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    timeout: { icon: Clock, color: 'text-orange-600 bg-orange-100' },
    rejected: { icon: X, color: 'text-gray-600 bg-gray-100' },
  };
  
  const config = statusConfig[message.status.current];
  const Icon = config.icon;
  
  return (
    <div className="p-4 border-b">
      <h4 className="text-sm font-medium mb-3">Status</h4>
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${config.color}`}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium capitalize">
            {message.status.current}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(message.metadata.timestamp).toLocaleString()}
        </span>
      </div>
      
      {message.status.history.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">History</p>
          <div className="space-y-1">
            {message.status.history.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <span className="text-muted-foreground">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{item.status}</span>
                {item.reason && (
                  <span className="text-muted-foreground">({item.reason})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageMetadataProps {
  message: Message;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

function MessageMetadata({ message, onCopy, copiedField }: MessageMetadataProps) {
  const fields = [
    { label: 'Guild ID', value: message.guildId, field: 'guildId' },
    { label: 'Topic', value: message.topicName, field: 'topic' },
    { label: 'Thread ID', value: message.threadId || 'None', field: 'threadId' },
    { label: 'Source Agent', value: message.metadata.sourceAgent, field: 'sourceAgent' },
    { label: 'Target Agent', value: message.metadata.targetAgent || 'None', field: 'targetAgent' },
    { label: 'Priority', value: message.metadata.priority.toString(), field: 'priority' },
    { label: 'Retry Count', value: `${message.metadata.retryCount}/${message.metadata.maxRetries}`, field: 'retries' },
  ];
  
  return (
    <div className="p-4 border-b">
      <h4 className="text-sm font-medium mb-3">Metadata</h4>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ label, value, field }) => (
          <div key={field}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm font-medium">{value}</p>
              <button
                onClick={() => onCopy(value, field)}
                className="opacity-0 hover:opacity-100 transition-opacity"
              >
                {copiedField === field ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MessagePayloadProps {
  message: Message;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

function MessagePayload({ message, onCopy, copiedField }: MessagePayloadProps) {
  // Display the entire payload object, not just payload.content
  const payloadString = JSON.stringify(message.payload, null, 2);

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Payload</h4>
        <button
          onClick={() => onCopy(payloadString, 'payload')}
          className="p-1 hover:bg-muted rounded"
        >
          {copiedField === 'payload' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="rounded overflow-hidden">
        <SyntaxHighlighter
          language="json"
          style={tomorrow}
          customStyle={{
            margin: 0,
            fontSize: '12px',
            backgroundColor: 'hsl(var(--muted))',
          }}
          wrapLongLines={true}
        >
          {payloadString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

interface MessageRoutingProps {
  message: Message;
}

function MessageRouting({ message }: MessageRoutingProps) {
  return (
    <div className="p-4 border-b">
      <h4 className="text-sm font-medium mb-3">Routing</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{message.routing.source}</span>
          {message.routing.destination && (
            <>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{message.routing.destination}</span>
            </>
          )}
        </div>
        
        {message.routing.hops.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Hops</p>
            <div className="space-y-2">
              {message.routing.hops.map((hop, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(hop.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">{hop.agentId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    hop.action === 'forwarded' ? 'bg-blue-100 text-blue-700' :
                    hop.action === 'processed' ? 'bg-green-100 text-green-700' :
                    hop.action === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {hop.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageErrorProps {
  error: NonNullable<Message['error']>;
}

function MessageError({ error }: MessageErrorProps) {
  return (
    <div className="p-4 status-error-bg rounded-lg">
      <h4 className="text-sm font-medium status-error mb-2">Error Details</h4>
      <div className="space-y-2">
        <div>
          <p className="text-xs status-error">Code</p>
          <p className="text-sm font-mono">{error.code}</p>
        </div>
        <div>
          <p className="text-xs status-error">Message</p>
          <p className="text-sm">{error.message}</p>
        </div>
        {error.stack && (
          <div>
            <p className="text-xs status-error">Stack Trace</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-1">
              <code>{error.stack}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}