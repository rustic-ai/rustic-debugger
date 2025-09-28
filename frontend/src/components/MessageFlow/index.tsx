import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'react-flow-renderer';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import { useGuildStore } from '@stores/guildStore';
import { MessageFlowNode } from './MessageFlowNode';
import { generateFlowLayout } from './layoutUtils';

const nodeTypes = {
  guild: MessageFlowNode,
  topic: MessageFlowNode,
  agent: MessageFlowNode,
};

export function MessageFlow() {
  const { selectedGuildId } = useGuildStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { data: guild } = useQuery({
    queryKey: ['guild', selectedGuildId],
    queryFn: () => selectedGuildId ? apiClient.getGuild(selectedGuildId) : null,
    enabled: !!selectedGuildId,
  });
  
  const { data: topics } = useQuery({
    queryKey: ['topics', selectedGuildId],
    queryFn: () => selectedGuildId ? apiClient.getTopics(selectedGuildId, { includeStats: true }) : null,
    enabled: !!selectedGuildId,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });
  
  useEffect(() => {
    if (!guild || !topics) return;
    
    // Generate flow layout from guild and topics data
    const { nodes: layoutNodes, edges: layoutEdges } = generateFlowLayout(guild, topics);
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [guild, topics, setNodes, setEdges]);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );
  
  if (!selectedGuildId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a guild to view message flow
      </div>
    );
  }
  
  if (!guild || !topics) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading message flow...
      </div>
    );
  }
  
  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'guild':
                return '#3b82f6'; // blue
              case 'topic':
                return '#10b981'; // green
              case 'agent':
                return '#8b5cf6'; // purple
              default:
                return '#6b7280'; // gray
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}