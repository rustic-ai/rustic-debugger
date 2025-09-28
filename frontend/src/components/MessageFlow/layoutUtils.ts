import type { Node, Edge } from 'react-flow-renderer';
import type { Guild, Topic } from '@rustic-debug/types';
import type { MessageFlowNodeData } from './MessageFlowNode';

export function generateFlowLayout(
  guild: Guild,
  topics: Topic[]
): { nodes: Node<MessageFlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<MessageFlowNodeData>[] = [];
  const edges: Edge[] = [];
  
  // Create guild node (root)
  const guildNode: Node<MessageFlowNodeData> = {
    id: `guild-${guild.id.id}`,
    type: 'guild',
    position: { x: 400, y: 50 },
    data: {
      label: guild.name,
      type: 'guild',
      status: guild.status === 'active' ? 'active' : guild.status === 'inactive' ? 'idle' : 'error',
      stats: {
        messageCount: topics.reduce((sum, t) => sum + t.metadata.messageCount, 0),
        throughput: guild.metadata.messageRate,
      },
    },
  };
  nodes.push(guildNode);
  
  // Create topic nodes
  const topicNodeSpacing = 250;
  const topicStartX = 100;
  const topicY = 200;
  
  topics.forEach((topic, index) => {
    const topicNode: Node<MessageFlowNodeData> = {
      id: `topic-${topic.name}`,
      type: 'topic',
      position: { x: topicStartX + (index * topicNodeSpacing), y: topicY },
      data: {
        label: topic.name,
        type: 'topic',
        status: topic.metadata.messageCount > 0 ? 'active' : 'idle',
        stats: {
          messageCount: topic.metadata.messageCount,
          throughput: (topic as any).stats?.metrics?.throughput || 0,
          errorRate: (topic as any).stats?.metrics?.errorCount || 0,
        },
      },
    };
    nodes.push(topicNode);
    
    // Connect guild to topic
    edges.push({
      id: `${guildNode.id}-${topicNode.id}`,
      source: guildNode.id,
      target: topicNode.id,
      type: 'smoothstep',
      animated: topic.metadata.messageCount > 0,
    });
    
    // Create agent nodes for this topic
    const agents = new Set([...topic.publishers, ...topic.subscribers]);
    const agentY = topicY + 150;
    const agentStartX = topicStartX + (index * topicNodeSpacing) - 50;
    const agentSpacing = 100;
    
    Array.from(agents).forEach((agent, agentIndex) => {
      // Check if agent node already exists
      const existingAgent = nodes.find(n => n.id === `agent-${agent}`);
      
      if (!existingAgent) {
        const agentNode: Node<MessageFlowNodeData> = {
          id: `agent-${agent}`,
          type: 'agent',
          position: { 
            x: agentStartX + (agentIndex * agentSpacing), 
            y: agentY 
          },
          data: {
            label: agent,
            type: 'agent',
            status: 'active',
          },
        };
        nodes.push(agentNode);
      }
      
      // Connect topic to agent
      if (topic.subscribers.includes(agent)) {
        edges.push({
          id: `${topicNode.id}-agent-${agent}`,
          source: topicNode.id,
          target: `agent-${agent}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981' }, // green for subscribers
        });
      }
      
      // Connect agent to topic (if publisher)
      if (topic.publishers.includes(agent)) {
        edges.push({
          id: `agent-${agent}-${topicNode.id}`,
          source: `agent-${agent}`,
          target: topicNode.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6' }, // blue for publishers
        });
      }
    });
  });
  
  return { nodes, edges };
}