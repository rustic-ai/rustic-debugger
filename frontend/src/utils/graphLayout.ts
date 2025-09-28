import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

const nodeWidth = 250;
const nodeHeight = 120;

// Create a hierarchical layout using Dagre
export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the graph layout
  dagreGraph.setGraph({
    rankdir: 'TB', // Top to Bottom
    align: 'UL',   // Upper Left alignment
    nodesep: 50,   // Horizontal spacing between nodes
    ranksep: 100,  // Vertical spacing between ranks
    marginx: 20,
    marginy: 20
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply the calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      targetPosition: 'top' as const,
      sourcePosition: 'bottom' as const,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Alternative force-directed layout (simpler, good for smaller graphs)
export const getForceLayoutElements = (nodes: Node[], edges: Edge[]) => {
  // Group nodes by topic for better clustering
  const topicGroups = new Map<string, Node[]>();

  nodes.forEach(node => {
    const topic = node.data.message.topic || 'unknown';
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, []);
    }
    topicGroups.get(topic)!.push(node);
  });

  let layoutedNodes: Node[] = [];
  let startY = 0;
  const topicSpacing = 300;
  const nodeSpacing = 280;

  // Arrange nodes by topic vertically, with messages horizontally
  Array.from(topicGroups.entries()).forEach(([topic, topicNodes], topicIndex) => {
    // Sort nodes by timestamp within each topic
    const sortedNodes = topicNodes.sort((a, b) => {
      const timeA = a.data.message.metadata?.timestamp || a.data.message.timestamp || 0;
      const timeB = b.data.message.metadata?.timestamp || b.data.message.timestamp || 0;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });

    const topicY = startY + (topicIndex * topicSpacing);

    sortedNodes.forEach((node, index) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: index * nodeSpacing,
          y: topicY
        },
        targetPosition: 'top' as const,
        sourcePosition: 'bottom' as const,
      });
    });
  });

  return { nodes: layoutedNodes, edges };
};

// Circular layout (good for showing agent interactions)
export const getCircularLayoutElements = (nodes: Node[], edges: Edge[]) => {
  const centerX = 400;
  const centerY = 300;
  const radius = Math.max(200, nodes.length * 20);

  const layoutedNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const x = centerX + radius * Math.cos(angle) - nodeWidth / 2;
    const y = centerY + radius * Math.sin(angle) - nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
      targetPosition: 'top' as const,
      sourcePosition: 'bottom' as const,
    };
  });

  return { nodes: layoutedNodes, edges };
};