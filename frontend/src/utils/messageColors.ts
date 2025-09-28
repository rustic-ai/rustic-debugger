import type { Message } from '@rustic-debug/types';

/**
 * Centralized color system for messages across all view modes
 */

// Agent color palette (Tailwind classes) - matches DebugView
export const AGENT_COLOR_CLASSES = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-yellow-500',
];

// Tailwind to hex mapping for ReactFlow components
export const TAILWIND_TO_HEX = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#10b981',
  'bg-purple-500': '#8b5cf6',
  'bg-orange-500': '#f97316',
  'bg-pink-500': '#ec4899',
  'bg-teal-500': '#14b8a6',
  'bg-indigo-500': '#6366f1',
  'bg-yellow-500': '#eab308',
} as const;

// Status-based color mapping (for status indicators)
export const STATUS_COLORS = {
  pending: '#f59e0b', // amber-500
  processing: '#3b82f6', // blue-500
  running: '#06b6d4', // cyan-500
  completed: '#10b981', // emerald-500
  success: '#10b981', // emerald-500
  error: '#ef4444', // red-500
  timeout: '#f97316', // orange-500
  rejected: '#6b7280', // gray-500
} as const;

/**
 * Get agent color class based on agent name (using hash-based selection)
 */
export function getAgentColorClass(agentName: string): string {
  let hash = 0;
  for (let i = 0; i < agentName.length; i++) {
    hash = agentName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AGENT_COLOR_CLASSES[Math.abs(hash) % AGENT_COLOR_CLASSES.length];
}

/**
 * Get agent color hex value based on agent name (for ReactFlow components)
 */
export function getAgentColorHex(agentName: string): string {
  const colorClass = getAgentColorClass(agentName);
  return TAILWIND_TO_HEX[colorClass as keyof typeof TAILWIND_TO_HEX];
}

/**
 * Get agent color based on sender information (legacy function - now uses hash-based selection)
 */
export function getAgentColor(message: Message): string {
  const agentName = message.sender?.name || message.sender?.id || 'unknown';
  return getAgentColorHex(agentName);
}

/**
 * Get status color for message status indicators
 */
export function getStatusColor(message: Message): string {
  const status = message.process_status || (message.is_error_message ? 'error' : 'completed');
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.completed;
}

/**
 * Get agent initials for avatar display
 */
export function getAgentInitials(message: Message): string {
  const agentName = message.sender?.name || message.sender?.id || 'UK';
  return agentName.substring(0, 2).toUpperCase();
}

/**
 * Get agent display name
 */
export function getAgentDisplayName(message: Message): string {
  return message.sender?.name || message.sender?.id || 'Unknown';
}