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
  X,
  Hash,
  Code
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
        {message.is_error_message && <MessageError message={message} />}
      </div>
    </div>
  );
}

interface MessageHeaderProps {
  message: Message;
  onClose: () => void;
}

function MessageHeader({ message, onClose }: MessageHeaderProps) {
  const msgId = typeof message.id === 'number' ? message.id.toString() :
                typeof message.id === 'string' ? message.id :
                message.id?.id || 'unknown';

  return (
    <div className="p-4 border-b">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">Message Details</h3>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {msgId}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
          aria-label="close"
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
    running: { icon: Clock, color: 'text-blue-600 bg-blue-100' },
    completed: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    success: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    error: { icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    timeout: { icon: Clock, color: 'text-orange-600 bg-orange-100' },
    rejected: { icon: X, color: 'text-gray-600 bg-gray-100' },
  };

  const status = message.process_status || (message.is_error_message ? 'error' : 'completed');
  const config = statusConfig[status] || statusConfig.completed;
  const Icon = config.icon;

  return (
    <div className="p-4 border-b">
      <h4 className="text-sm font-medium mb-3">Status</h4>
      <div className="flex items-center space-x-3">
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${config.color}`}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium capitalize">
            {status}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(message.timestamp).toLocaleString()}
        </span>
      </div>

      {message.message_history && message.message_history.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">History</p>
          <div className="space-y-1">
            {message.message_history.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <span className="text-muted-foreground">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{item.status}</span>
                {item.message && (
                  <span className="text-muted-foreground">({item.message})</span>
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
  const topics = typeof message.topics === 'string' ? message.topics :
                Array.isArray(message.topics) ? message.topics.join(', ') :
                'None';

  const threadId = message.current_thread_id ? message.current_thread_id.toString() :
                   message.thread && message.thread.length > 0 ? message.thread[0].toString() :
                   'None';

  const fields = [
    { label: 'Sender', value: message.sender?.name || message.sender?.id || 'unknown', field: 'sender' },
    { label: 'Topics', value: topics, field: 'topics' },
    { label: 'Thread ID', value: threadId, field: 'threadId' },
    { label: 'Recipients', value: message.recipient_list?.map(r => r.name || r.id).join(', ') || 'None', field: 'recipients' },
    { label: 'Priority', value: message.priority?.toString() || 'N/A', field: 'priority' },
    { label: 'Format', value: message.format || 'unknown', field: 'format' },
    { label: 'TTL', value: message.ttl ? `${message.ttl}s` : 'None', field: 'ttl' },
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
  // Display the entire payload object
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
      <div className="rounded-lg overflow-hidden border border-slate-700">
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '1rem',
            backgroundColor: '#1e1e1e',
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
          }}
          wrapLongLines={true}
          showLineNumbers={false}
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
  if (!message.routing_slip && (!message.recipient_list || message.recipient_list.length === 0)) {
    return null;
  }

  return (
    <div className="p-4 border-b">
      <h4 className="text-sm font-medium mb-3">Routing</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{message.sender?.name || message.sender?.id || 'unknown'}</span>
          {message.recipient_list && message.recipient_list.length > 0 && (
            <>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {message.recipient_list.map(r => r.name || r.id).join(', ')}
              </span>
            </>
          )}
        </div>

        {message.routing_slip?.hops && message.routing_slip.hops.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Hops</p>
            <div className="space-y-2">
              {message.routing_slip.hops.map((hop, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(hop.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">{hop.agent_id || 'unknown'}</span>
                  {hop.action && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      hop.action === 'forwarded' ? 'bg-blue-100 text-blue-700' :
                      hop.action === 'processed' ? 'bg-green-100 text-green-700' :
                      hop.action === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {hop.action}
                    </span>
                  )}
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
  message: Message;
}

function MessageError({ message }: MessageErrorProps) {
  // Find the last error in message history
  const errorHistory = message.message_history?.filter(h => h.status === 'error') || [];
  const lastError = errorHistory[errorHistory.length - 1];

  if (!lastError && !message.is_error_message) {
    return null;
  }

  return (
    <div className="p-4 status-error-bg rounded-lg">
      <h4 className="text-sm font-medium status-error mb-2">Error Details</h4>
      <div className="space-y-2">
        {lastError?.error_code && (
          <div>
            <p className="text-xs status-error">Code</p>
            <p className="text-sm font-mono">{lastError.error_code}</p>
          </div>
        )}
        <div>
          <p className="text-xs status-error">Message</p>
          <p className="text-sm">{lastError?.message || 'Error occurred during message processing'}</p>
        </div>
      </div>
    </div>
  );
}