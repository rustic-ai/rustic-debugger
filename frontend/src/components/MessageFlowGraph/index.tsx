import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Message } from '@rustic-debug/types';
import { MessageNode } from './MessageNode';
import { getLayoutedElements, getForceLayoutElements, getCircularLayoutElements } from '@/utils/graphLayout';
import { Button } from '@/components/ui/button';

interface MessageFlowGraphProps {
  messages: Message[];
  selectedMessageId?: string;
  selectedTopic?: string;
  onMessageSelect?: (messageId: string) => void;
}

type LayoutType = 'hierarchical' | 'force' | 'circular' | 'timeline';

const nodeTypes = {
  message: MessageNode,
};

export function MessageFlowGraph({
  messages,
  selectedMessageId,
  selectedTopic,
  onMessageSelect,
}: MessageFlowGraphProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchical');

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const messageMap = new Map<string, Message>();
    const levelMap = new Map<string, number>();

    // Ensure messages is an array
    const messageList = Array.isArray(messages) ? messages : [];

    console.log('MessageFlowGraph received messages:', messageList.length);
    if (messageList.length > 0) {
      console.log('First message structure:', messageList[0]);
    }

    // Build message map
    messageList.forEach(msg => {
      const msgId = msg.id?.id || msg.id || msg.message_id || `msg-${Math.random()}`;
      messageMap.set(msgId, msg);
    });

    // Calculate levels (depth) for each message
    const calculateLevel = (msgId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(msgId)) return 0;
      visited.add(msgId);

      const msg = messageMap.get(msgId);
      if (!msg || !msg.in_response_to?.id) {
        levelMap.set(msgId, 0);
        return 0;
      }

      const parentId = msg.in_response_to.id;
      const parentLevel = calculateLevel(parentId, visited);
      const level = parentLevel + 1;
      levelMap.set(msgId, level);
      return level;
    };

    // Calculate levels for all messages
    messageList.forEach(msg => {
      const msgId = msg.id?.id || msg.id || msg.message_id || `msg-${Math.random()}`;
      if (!levelMap.has(msgId)) {
        calculateLevel(msgId);
      }
    });

    // Create nodes without positions (will be positioned by layout algorithm)
    messageList.forEach((msg, index) => {
      const msgId = msg.id?.id || msg.id || msg.message_id || `msg-${index}`;

      // Determine agent color
      const agentName = msg.metadata?.sourceAgent || msg.metadata?.agent_name || msg.agent_name || 'unknown';
      const agentColors: Record<string, string> = {
        'upa-test_user': '#3b82f6',
        'test_user': '#3b82f6',
        'scheduler_agent': '#8b5cf6',
        'manager_agent': '#ec4899',
        'monitor': '#f59e0b',
        'unknown': '#6b7280',
      };

      const color = Object.entries(agentColors).find(([key]) =>
        agentName.toLowerCase().includes(key)
      )?.[1] || agentColors.unknown;

      // Check if message belongs to selected topic
      const isFromSelectedTopic = selectedTopic && (msg.topic === selectedTopic ||
        msg.metadata?.topic === selectedTopic);

      nodes.push({
        id: msgId,
        type: 'message',
        position: { x: 0, y: 0 }, // Temporary position, will be overridden by layout
        data: {
          message: msg,
          color,
          isSelected: msgId === selectedMessageId,
          isFromSelectedTopic,
          onSelect: onMessageSelect,
        },
        sourcePosition: 'bottom' as const,
        targetPosition: 'top' as const,
      });
    });

    // Create edges based on in_response_to or parentMessageId relationships
    messageList.forEach(msg => {
      const msgId = msg.id?.id || msg.id || msg.message_id;
      const parentId = msg.in_response_to?.id || msg.parentMessageId;
      if (parentId && parentId !== msgId) {
        // Only create edge if parent node exists
        if (messageMap.has(parentId)) {
          edges.push({
            id: `${parentId}-${msgId}`,
            source: parentId,
            target: msgId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#94a3b8',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#94a3b8',
            },
          });
        }
      }
    });

    console.log(`Created ${nodes.length} nodes and ${edges.length} edges from ${messageList.length} messages`);
    return { nodes, edges };
  }, [messages, selectedMessageId, selectedTopic, onMessageSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Apply layout algorithm to nodes and edges
  const layoutedElements = useMemo(() => {
    if (initialNodes.length === 0) return { nodes: [], edges: initialEdges };

    switch (layoutType) {
      case 'hierarchical':
        return getLayoutedElements(initialNodes, initialEdges);
      case 'force':
        return getForceLayoutElements(initialNodes, initialEdges);
      case 'circular':
        return getCircularLayoutElements(initialNodes, initialEdges);
      case 'timeline':
        return getForceLayoutElements(initialNodes, initialEdges); // Use force layout for timeline
      default:
        return { nodes: initialNodes, edges: initialEdges };
    }
  }, [initialNodes, initialEdges, layoutType]);

  // Update nodes and edges when layoutedElements change
  React.useEffect(() => {
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
  }, [layoutedElements, setNodes, setEdges]);

  return (
    <div className="h-full w-full relative">
      {/* Layout Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg border p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Layout:</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={layoutType === 'hierarchical' ? 'default' : 'outline'}
              onClick={() => setLayoutType('hierarchical')}
            >
              Tree
            </Button>
            <Button
              size="sm"
              variant={layoutType === 'force' ? 'default' : 'outline'}
              onClick={() => setLayoutType('force')}
            >
              Timeline
            </Button>
            <Button
              size="sm"
              variant={layoutType === 'circular' ? 'default' : 'outline'}
              onClick={() => setLayoutType('circular')}
            >
              Circle
            </Button>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => node.data.color}
          style={{
            backgroundColor: '#f8fafc',
          }}
          maskColor="rgb(50, 50, 50, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}