import type { Message } from '@rustic-debug/types';

export class MessageOrdering {
  /**
   * Order messages by timestamp and priority
   * Maintains FIFO ordering within same timestamp
   */
  orderMessages(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      // First sort by timestamp
      const timeDiff = a.timestamp - b.timestamp;
      if (timeDiff !== 0) {
        return timeDiff;
      }

      // Same timestamp - sort by priority (higher priority first)
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Same timestamp and priority - use message ID for stable ordering
      return a.id - b.id;
    });
  }
  
  /**
   * Order messages in a thread hierarchy
   * Parent messages appear before their children
   */
  orderThreadMessages(messages: Message[]): Message[] {
    // Build parent-child map
    const childrenMap = new Map<string, Message[]>();
    const rootMessages: Message[] = [];
    
    for (const message of messages) {
      // Use in_response_to field to determine parent
      if (message.in_response_to) {
        const parentId = message.in_response_to.toString();
        const siblings = childrenMap.get(parentId) || [];
        siblings.push(message);
        childrenMap.set(parentId, siblings);
      } else {
        rootMessages.push(message);
      }
    }
    
    // Sort root messages by timestamp
    rootMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Build ordered list with depth-first traversal
    const ordered: Message[] = [];
    
    const addMessageAndChildren = (message: Message, depth = 0): void => {
      // Add depth information for UI rendering
      (message as any).threadDepth = depth;
      ordered.push(message);
      
      // Add children recursively
      const children = childrenMap.get(message.id.toString()) || [];
      children
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(child => addMessageAndChildren(child, depth + 1));
    };
    
    // Process all root messages
    rootMessages.forEach(message => addMessageAndChildren(message));
    
    return ordered;
  }
  
  /**
   * Group messages by time buckets for visualization
   */
  groupMessagesByTime(
    messages: Message[],
    bucketSizeMs = 60000 // 1 minute buckets by default
  ): Map<number, Message[]> {
    const buckets = new Map<number, Message[]>();
    
    for (const message of messages) {
      const timestamp = message.timestamp;
      const bucket = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
      
      const bucketMessages = buckets.get(bucket) || [];
      bucketMessages.push(message);
      buckets.set(bucket, bucketMessages);
    }
    
    // Sort messages within each bucket
    for (const [bucket, bucketMessages] of buckets) {
      buckets.set(bucket, this.orderMessages(bucketMessages));
    }
    
    return buckets;
  }
}