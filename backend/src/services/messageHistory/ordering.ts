import type { Message } from '@rustic-debug/types';

export class MessageOrdering {
  /**
   * Order messages by timestamp and priority
   * Maintains FIFO ordering within same timestamp
   */
  orderMessages(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      // First sort by timestamp
      const timeDiff = a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      
      // Same timestamp - sort by priority (higher priority first)
      const priorityDiff = b.metadata.priority - a.metadata.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Same timestamp and priority - use GemstoneID counter for stable ordering
      return a.id.counter - b.id.counter;
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
      if (message.parentMessageId) {
        const siblings = childrenMap.get(message.parentMessageId) || [];
        siblings.push(message);
        childrenMap.set(message.parentMessageId, siblings);
      } else {
        rootMessages.push(message);
      }
    }
    
    // Sort root messages by timestamp
    rootMessages.sort((a, b) => 
      a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );
    
    // Build ordered list with depth-first traversal
    const ordered: Message[] = [];
    
    const addMessageAndChildren = (message: Message, depth = 0): void => {
      // Add depth information for UI rendering
      (message as any).threadDepth = depth;
      ordered.push(message);
      
      // Add children recursively
      const children = childrenMap.get(message.id.id) || [];
      children
        .sort((a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime())
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
      const timestamp = message.metadata.timestamp.getTime();
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