import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useGuildSubscription, useTopicSubscription } from '@hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import {
  ArrowLeft, RefreshCw, Clock, Hash, Search,
  Filter, ChevronRight, Layers,
  GitBranch, List, Eye, EyeOff, Network,
  Code
} from 'lucide-react';
import type { Message, Topic } from '@rustic-debug/types';
import { MessageFlowGraph } from '@components/MessageFlowGraph';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAgentColorClass } from '@/utils/messageColors';


export function DebugView() {
  const { guildId, topicName } = useParams<{
    guildId: string;
    topicName?: string;
  }>();
  const navigate = useNavigate();

  // State
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(topicName);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'thread' | 'graph'>('list');
  const [compactMode, setCompactMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['completed', 'running', 'error', 'success', 'pending', 'processing', 'timeout', 'rejected']));

  // Subscribe to WebSocket updates
  useGuildSubscription(guildId || null);
  useTopicSubscription(guildId || null, selectedTopic || null);

  // Fetch all guilds for the selector
  const { data: guilds } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => apiClient.getGuilds({ limit: 100 }),
  });

  // Fetch data
  const { data: guild } = useQuery({
    queryKey: ['guild', guildId],
    queryFn: () => apiClient.getGuild(guildId!),
    enabled: !!guildId,
  });

  const { data: topics, refetch: refetchTopics } = useQuery({
    queryKey: ['topics', guildId],
    queryFn: () => apiClient.getTopics(guildId!, { includeStats: false }),
    enabled: !!guildId,
  });

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', guildId, selectedTopic],
    queryFn: () => selectedTopic
      ? apiClient.getTopicMessages(guildId!, selectedTopic, { limit: 100 })
      : null,
    enabled: !!guildId && !!selectedTopic,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch all messages from all topics for graph view
  const { data: allMessagesData } = useQuery({
    queryKey: ['allMessages', guildId, viewMode],
    queryFn: async () => {
      if (!guildId || !topics) return null;

      const allMessages: Message[] = [];
      // Topics is an array directly from the API
      const topicsList = Array.isArray(topics) ? topics : [];

      for (const topic of topicsList) {
        try {
          const response = await apiClient.getTopicMessages(guildId, topic.name, { limit: 100 });
          if (response?.data) {
            // Add topic name to each message for filtering
            response.data.forEach((msg: Message) => {
              msg.topic = topic.name;
              allMessages.push(msg);
            });
          }
        } catch (error) {
          console.error(`Failed to fetch messages for topic ${topic.name}:`, error);
        }
      }
      console.log(`Fetched ${allMessages.length} messages from ${topicsList.length} topics for graph view`);
      return allMessages; // Return array directly, not wrapped in object
    },
    enabled: !!guildId && !!topics && topics.length > 0 && viewMode === 'graph',
    refetchInterval: 10000, // Slower refresh for all messages
  });

  // Set first topic as selected if none selected
  useEffect(() => {
    if (topics && topics.length > 0 && !selectedTopic && topics[0]) {
      setSelectedTopic(topics[0].name);
    }
  }, [topics, selectedTopic]);

  // Extract unique agents from messages
  const agents = useMemo(() => {
    const agentSet = new Set<string>();
    messagesData?.data?.forEach(msg => {
      if (msg.sender?.name) agentSet.add(msg.sender.name);
      if (msg.sender?.id) agentSet.add(msg.sender.id);
      msg.recipient_list?.forEach(r => {
        if (r.name) agentSet.add(r.name);
        if (r.id) agentSet.add(r.id);
      });
    });
    return Array.from(agentSet);
  }, [messagesData]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!messagesData?.data) return [];

    const filtered = messagesData.data.filter(msg => {
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const payloadStr = JSON.stringify(msg.payload).toLowerCase();
        const senderStr = (msg.sender?.name || msg.sender?.id || '').toLowerCase();
        const messageId = (typeof msg.id === 'number' ? msg.id.toString() : msg.id?.id || '').toLowerCase();
        const matchesSearch =
          payloadStr.includes(searchLower) ||
          senderStr.includes(searchLower) ||
          messageId.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Agent filter
      if (selectedAgents.size > 0) {
        const senderMatch = selectedAgents.has(msg.sender?.name || '') || selectedAgents.has(msg.sender?.id || '');
        const recipientMatch = msg.recipient_list?.some(r =>
          selectedAgents.has(r.name || '') || selectedAgents.has(r.id || '')
        );
        if (!senderMatch && !recipientMatch) return false;
      }

      // Status filter - use process_status or derive from is_error_message
      const currentStatus = msg.process_status || (msg.is_error_message ? 'error' : 'completed');
      if (!selectedStatuses.has(currentStatus)) return false;

      return true;
    });

    return filtered;
  }, [messagesData?.data, searchText, selectedAgents, selectedStatuses]);

  // Group messages by thread
  const threadGroups = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    filteredMessages.forEach(msg => {
      // Use conversation_id or thread array or message id
      const threadId = msg.conversation_id?.toString() ||
                       msg.thread?.[0]?.toString() ||
                       (typeof msg.id === 'number' ? msg.id.toString() : msg.id?.id || '');
      if (!groups[threadId]) groups[threadId] = [];
      groups[threadId].push(msg);
    });
    // Sort messages within each thread
    Object.values(groups).forEach(thread => {
      thread.sort((a, b) => a.timestamp - b.timestamp);
    });
    return groups;
  }, [filteredMessages]);

  // Helper functions

  const getAgentInitials = (agent: string): string => {
    return agent.split(/[_#]/).map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (timestamp: number | Date | string) => {
    const d = typeof timestamp === 'number' ? new Date(timestamp) :
             typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
  };

  const getMessageFormatClassName = (message: Message) => {
    if (!message.format) {
      return 'Unknown';
    }

    // Split by dot and get the last element (class name)
    const parts = message.format.split('.');
    return parts[parts.length - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'delivered': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTopicName = (topic: string): string => {
    // Make topic names more readable
    return topic
      .replace(/agent_self_inbox:/g, '📥 ')
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  };

  const handleRefresh = () => {
    refetchTopics();
    refetchMessages();
  };

  const toggleAgent = (agent: string) => {
    const newSet = new Set(selectedAgents);
    if (newSet.has(agent)) {
      newSet.delete(agent);
    } else {
      newSet.add(agent);
    }
    setSelectedAgents(newSet);
  };

  const renderMessageContent = (message: Message) => {
    // Display the entire payload, not just payload.content
    const payload = message.payload;

    if (!payload) {
      return <span className="text-muted-foreground italic">No payload</span>;
    }

    const payloadString = JSON.stringify(payload, null, 2);

    return (
      <div className="rounded overflow-hidden">
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.6',
            backgroundColor: '#1e1e1e',
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
            maxHeight: '200px',
          }}
          wrapLongLines={true}
        >
          {payloadString}
        </SyntaxHighlighter>
      </div>
    );
  };

  const renderListView = () => (
    <div className="p-4 space-y-3">
      {filteredMessages.map((message: Message, index: number) => {
        const messageId = typeof message.id === 'number' ? message.id.toString() : message.id?.id || '';
        const senderName = message.sender?.name || message.sender?.id || 'unknown';
        const currentStatus = message.process_status || (message.is_error_message ? 'error' : 'completed');

        return (
          <Card
            key={`${messageId}-${message.timestamp}-${index}`}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedMessage && (typeof selectedMessage.id === 'number' ? selectedMessage.id === message.id :
                selectedMessage.id?.id === messageId) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedMessage(message)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAgentColorClass(senderName)} flex items-center justify-center text-white font-bold`}>
                    {getAgentInitials(senderName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{senderName}</span>
                      {message.recipient_list && message.recipient_list.length > 0 && (
                        <>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {message.recipient_list.map(r => r.name || r.id || 'unknown').join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(currentStatus)} text-white`}>
                    {currentStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Message Format */}
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary/5 rounded-lg border-l-4 border-primary/20">
                <Code className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">{getMessageFormatClassName(message)}</span>
              </div>
              <div className="bg-muted/50 rounded p-3 mb-3">
                {renderMessageContent(message)}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  ID: {messageId.slice(0, 12)}...
                </span>
                {message.conversation_id && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Conv: {message.conversation_id.toString().slice(0, 12)}...
                  </span>
                )}
                {message.priority > 0 && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Priority: {message.priority}
                  </span>
                )}
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" />
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderThreadView = () => (
    <div className="p-4 space-y-6">
      {Object.entries(threadGroups).map(([threadId, messages]) => (
        <div key={threadId} className="border-l-2 border-primary/20 pl-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
            Thread: {threadId.slice(0, 12)}... ({messages.length} messages)
          </h4>
          <div className="space-y-3">
            {messages.map((message, index) => {
              const messageId = typeof message.id === 'number' ? message.id.toString() : message.id?.id || '';
              const senderName = message.sender?.name || message.sender?.id || 'unknown';
              const hasParent = message.in_response_to !== undefined;

              return (
                <div
                  key={`${messageId}-${message.timestamp}-${index}`}
                  className={`ml-${hasParent ? '8' : '0'} relative`}
                >
                  {hasParent && (
                    <div className="absolute -left-4 top-5 w-4 border-t-2 border-l-2 border-primary/20 rounded-tl h-8" />
                  )}
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedMessage && (typeof selectedMessage.id === 'number' ? selectedMessage.id === message.id :
                        selectedMessage.id?.id === messageId) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${getAgentColorClass(senderName)} flex items-center justify-center text-white text-xs font-bold`}>
                          {getAgentInitials(senderName)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{senderName}</span>
                            {message.recipient_list && message.recipient_list.length > 0 && (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-sm">
                                  {message.recipient_list.map(r => r.name || r.id || 'unknown').join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {/* Message Format */}
                      <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-primary/5 rounded border-l-2 border-primary/30">
                        <Code className="w-3 h-3 text-primary" />
                        <span className="text-sm font-medium text-primary">{getMessageFormatClassName(message)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-sm">
                        {renderMessageContent(message)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // Show guild selector if no guild is selected
  if (!guildId) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Select a Guild</h1>
          <p className="text-sm text-muted-foreground">Choose a guild to view its messages</p>
        </div>
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds?.data?.map((g) => (
              <Card
                key={g.id.id || g.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/debug/${g.id.id || g.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{g.name || g.id.id || g.id}</CardTitle>
                  <p className="text-sm text-muted-foreground">{g.namespace}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{g.metadata?.topicCount || 0} topics</span>
                    <span>{g.metadata?.agentCount || 0} agents</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {(!guilds || guilds.data?.length === 0) && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No guilds found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure RusticAI is running and has active guilds
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/debug')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{guild?.name || guildId}</h1>
              <p className="text-sm text-muted-foreground">
                {guild?.namespace} • {topics?.length || 0} topics • {filteredMessages.length} messages shown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggles */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'thread' ? 'default' : 'ghost'}
                onClick={() => setViewMode('thread')}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'graph' ? 'default' : 'ghost'}
                onClick={() => setViewMode('graph')}
              >
                <Network className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="sm"
              variant={compactMode ? 'default' : 'outline'}
              onClick={() => setCompactMode(!compactMode)}
            >
              {compactMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>

            <Button onClick={handleRefresh} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages, agents, IDs..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Filter by Agent</h4>
              <div className="flex flex-wrap gap-2">
                {agents.map(agent => (
                  <Button
                    key={agent}
                    size="sm"
                    variant={selectedAgents.has(agent) ? 'default' : 'outline'}
                    onClick={() => toggleAgent(agent)}
                    className="gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full ${getAgentColorClass(agent)}`} />
                    {agent}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Filter by Status</h4>
              <div className="flex gap-2">
                {['completed', 'running', 'error'].map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant={selectedStatuses.has(status) ? 'default' : 'outline'}
                    onClick={() => {
                      const newSet = new Set(selectedStatuses);
                      if (newSet.has(status)) {
                        newSet.delete(status);
                      } else {
                        newSet.add(status);
                      }
                      setSelectedStatuses(newSet);
                    }}
                  >
                    <Badge className={`${getStatusColor(status)} text-white`}>
                      {status}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Topics Sidebar */}
        <div className="w-64 border-r bg-muted/10">
          <div className="p-4">
            <h2 className="font-semibold mb-3">Topics</h2>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-1">
                {topics?.map((topic: Topic) => (
                  <button
                    key={topic.name}
                    onClick={() => setSelectedTopic(topic.name)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTopic === topic.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium truncate">{formatTopicName(topic.name)}</div>
                    <div className="text-xs opacity-70">
                      {topic.metadata.messageCount} messages
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {selectedTopic && (
              <div className="border-b px-4 py-2 bg-muted/5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {formatTopicName(selectedTopic)}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{filteredMessages.length} messages</span>
                    {viewMode === 'thread' && (
                      <span>{Object.keys(threadGroups).length} threads</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              {messagesLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading messages...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchText || selectedAgents.size > 0
                    ? "No messages match your filters"
                    : "No messages in this topic"}
                </div>
              ) : (
                viewMode === 'list' ? renderListView() :
                viewMode === 'thread' ? renderThreadView() :
                viewMode === 'graph' ? (
                  <div className="h-[calc(100vh-20rem)]">
                    <MessageFlowGraph
                      messages={allMessagesData || []}
                      selectedMessageId={selectedMessage?.id?.toString()}
                      selectedTopic={selectedTopic}
                      onMessageSelect={(id) => {
                        const allMsgs = allMessagesData || [];
                        const msg = allMsgs.find(m => m.id.toString() === id);
                        if (msg) {
                          setSelectedMessage(msg);
                          // Also select the topic of the clicked message
                          if (msg.topic) {
                            setSelectedTopic(msg.topic);
                          }
                        }
                      }}
                    />
                  </div>
                ) : null
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Message Details Panel */}
        {selectedMessage && (
          <div className="w-96 border-l bg-muted/5 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Message Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                >
                  ✕
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Message ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-xs">
                  {typeof selectedMessage.id === 'number' ? selectedMessage.id : selectedMessage.id?.id || ''}
                </code>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Agents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${getAgentColorClass(selectedMessage.sender?.name || selectedMessage.sender?.id || 'unknown')} flex items-center justify-center text-white text-xs font-bold`}>
                      {getAgentInitials(selectedMessage.sender?.name || selectedMessage.sender?.id || 'unknown')}
                    </div>
                    <span className="text-sm">Sender: {selectedMessage.sender?.name || selectedMessage.sender?.id || 'unknown'}</span>
                  </div>
                  {selectedMessage.recipient_list && selectedMessage.recipient_list.length > 0 && (
                    selectedMessage.recipient_list.map((recipient, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${getAgentColorClass(recipient.name || recipient.id || 'unknown')} flex items-center justify-center text-white text-xs font-bold`}>
                          {getAgentInitials(recipient.name || recipient.id || 'unknown')}
                        </div>
                        <span className="text-sm">Recipient: {recipient.name || recipient.id || 'unknown'}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Priority:</span>{' '}
                    {selectedMessage.priority}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>{' '}
                    {formatTimestamp(selectedMessage.timestamp)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge className={`${getStatusColor(selectedMessage.process_status || (selectedMessage.is_error_message ? 'error' : 'completed'))} text-white`}>
                      {selectedMessage.process_status || (selectedMessage.is_error_message ? 'error' : 'completed')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {(selectedMessage.conversation_id || selectedMessage.thread) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Thread Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMessage.conversation_id && (
                      <div>
                        <span className="text-muted-foreground">Conversation ID:</span>{' '}
                        <code className="text-xs">{selectedMessage.conversation_id}</code>
                      </div>
                    )}
                    {selectedMessage.thread && selectedMessage.thread.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Thread:</span>{' '}
                        <code className="text-xs">{selectedMessage.thread.join(' → ')}</code>
                      </div>
                    )}
                    {selectedMessage.in_response_to !== undefined && (
                      <div>
                        <span className="text-muted-foreground">In Response To:</span>{' '}
                        <code className="text-xs">{selectedMessage.in_response_to}</code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Payload</CardTitle>
                </CardHeader>
                <CardContent>
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
                        maxHeight: '400px',
                        fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                      }}
                      wrapLongLines={true}
                      showLineNumbers={false}
                    >
                      {JSON.stringify(selectedMessage.payload, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </CardContent>
              </Card>

              {selectedMessage.is_error_message && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-sm text-red-800">Error Message</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="text-red-600">
                      This message indicates an error occurred
                    </div>
                    {selectedMessage.process_status && (
                      <div className="mt-2">
                        <span className="text-red-600">Status:</span>{' '}
                        {selectedMessage.process_status}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}