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
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Color palette for agents
const AGENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-yellow-500',
];

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
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['success', 'pending', 'processing', 'error', 'timeout', 'rejected']));

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
      agentSet.add(msg.metadata.sourceAgent);
      if (msg.metadata.targetAgent) {
        agentSet.add(msg.metadata.targetAgent);
      }
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
        const matchesSearch =
          payloadStr.includes(searchLower) ||
          msg.metadata.sourceAgent.toLowerCase().includes(searchLower) ||
          msg.id.id.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Agent filter
      if (selectedAgents.size > 0) {
        if (!selectedAgents.has(msg.metadata.sourceAgent)) return false;
      }

      // Status filter
      if (!selectedStatuses.has(msg.status.current)) return false;

      return true;
    });

    return filtered;
  }, [messagesData?.data, searchText, selectedAgents, selectedStatuses]);

  // Group messages by thread
  const threadGroups = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    filteredMessages.forEach(msg => {
      const threadId = msg.threadId || msg.id.id;
      if (!groups[threadId]) groups[threadId] = [];
      groups[threadId].push(msg);
    });
    // Sort messages within each thread
    Object.values(groups).forEach(thread => {
      thread.sort((a, b) =>
        new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
      );
    });
    return groups;
  }, [filteredMessages]);

  // Helper functions
  const getAgentColor = (agent: string): string => {
    let hash = 0;
    for (let i = 0; i < agent.length; i++) {
      hash = agent.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
  };

  const getAgentInitials = (agent: string): string => {
    return agent.split(/[_#]/).map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
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
      case 'delivered': return 'bg-green-500';
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
          style={tomorrow}
          customStyle={{
            margin: 0,
            fontSize: '11px',
            backgroundColor: 'hsl(var(--muted))',
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
      {filteredMessages.map((message: Message, index: number) => (
        <Card
          key={`${message.id.id}-${message.metadata.timestamp}-${index}`}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedMessage?.id.id === message.id.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedMessage(message)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${getAgentColor(message.metadata.sourceAgent)} flex items-center justify-center text-white font-bold`}>
                  {getAgentInitials(message.metadata.sourceAgent)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{message.metadata.sourceAgent}</span>
                    {message.metadata.targetAgent && (
                      <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{message.metadata.targetAgent}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(message.metadata.timestamp)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(message.status.current)} text-white`}>
                  {message.status.current}
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
                ID: {message.id.id.slice(0, 12)}...
              </span>
              {message.threadId && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Thread: {message.threadId.slice(0, 12)}...
                </span>
              )}
              {message.metadata.priority > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Priority: {message.metadata.priority}
                </span>
              )}
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {new Date(message.metadata.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
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
            {messages.map((message, index) => (
              <div
                key={`${message.id.id}-${message.metadata.timestamp}-${index}`}
                className={`ml-${message.parentMessageId ? '8' : '0'} relative`}
              >
                {message.parentMessageId && (
                  <div className="absolute -left-4 top-5 w-4 border-t-2 border-l-2 border-primary/20 rounded-tl h-8" />
                )}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedMessage?.id.id === message.id.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${getAgentColor(message.metadata.sourceAgent)} flex items-center justify-center text-white text-xs font-bold`}>
                        {getAgentInitials(message.metadata.sourceAgent)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{message.metadata.sourceAgent}</span>
                          {message.metadata.targetAgent && (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              <span className="text-sm">{message.metadata.targetAgent}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(message.metadata.timestamp).toLocaleTimeString()}
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
            ))}
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
                    <div className={`w-4 h-4 rounded-full ${getAgentColor(agent)}`} />
                    {agent}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Filter by Status</h4>
              <div className="flex gap-2">
                {['delivered', 'pending', 'error'].map(status => (
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
                      selectedMessageId={selectedMessage?.id.id || selectedMessage?.id}
                      selectedTopic={selectedTopic}
                      onMessageSelect={(id) => {
                        const allMsgs = allMessagesData || [];
                        const msg = allMsgs.find(m => (m.id.id || m.id) === id);
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
                  <code className="text-xs">{selectedMessage.id.id}</code>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Agents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${getAgentColor(selectedMessage.metadata.sourceAgent)} flex items-center justify-center text-white text-xs font-bold`}>
                      {getAgentInitials(selectedMessage.metadata.sourceAgent)}
                    </div>
                    <span className="text-sm">Source: {selectedMessage.metadata.sourceAgent}</span>
                  </div>
                  {selectedMessage.metadata.targetAgent && (
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${getAgentColor(selectedMessage.metadata.targetAgent)} flex items-center justify-center text-white text-xs font-bold`}>
                        {getAgentInitials(selectedMessage.metadata.targetAgent)}
                      </div>
                      <span className="text-sm">Target: {selectedMessage.metadata.targetAgent}</span>
                    </div>
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
                    {selectedMessage.metadata.priority}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>{' '}
                    {formatTimestamp(selectedMessage.metadata.timestamp)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge className={`${getStatusColor(selectedMessage.status.current)} text-white`}>
                      {selectedMessage.status.current}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {selectedMessage.threadId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Thread Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Thread ID:</span>{' '}
                      <code className="text-xs">{selectedMessage.threadId}</code>
                    </div>
                    {selectedMessage.parentMessageId && (
                      <div>
                        <span className="text-muted-foreground">Parent:</span>{' '}
                        <code className="text-xs">{selectedMessage.parentMessageId}</code>
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
                  <div className="rounded overflow-hidden">
                    <SyntaxHighlighter
                      language="json"
                      style={tomorrow}
                      customStyle={{
                        margin: 0,
                        fontSize: '12px',
                        backgroundColor: 'hsl(var(--muted))',
                        maxHeight: '400px',
                      }}
                      wrapLongLines={true}
                    >
                      {JSON.stringify(selectedMessage.payload, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </CardContent>
              </Card>

              {selectedMessage.error && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-sm text-red-800">Error</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div>
                      <span className="text-red-600">Code:</span>{' '}
                      {selectedMessage.error.code}
                    </div>
                    <div>
                      <span className="text-red-600">Message:</span>{' '}
                      {selectedMessage.error.message}
                    </div>
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