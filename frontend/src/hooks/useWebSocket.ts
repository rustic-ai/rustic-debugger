import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@services/websocket/client';
import type { Message } from '@rustic-debug/types';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);
  
  const handleNewMessage = useCallback((message: Message) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ 
      queryKey: ['messages', message.guildId, message.topicName] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['messages-infinite', message.guildId, message.topicName] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['topic', message.guildId, message.topicName] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guild', message.guildId] 
    });
    
    if (message.threadId) {
      queryClient.invalidateQueries({ 
        queryKey: ['thread-messages', message.threadId, message.guildId] 
      });
    }
  }, [queryClient]);
  
  const handlePresenceUpdate = useCallback(() => {
    // Invalidate developer presence queries
    queryClient.invalidateQueries({ queryKey: ['developer-presence'] });
  }, [queryClient]);
  
  useEffect(() => {
    // Subscribe to events
    wsClient.on('message', handleNewMessage);
    wsClient.on('developer-presence', handlePresenceUpdate);
    
    cleanupRef.current = () => {
      wsClient.off('message', handleNewMessage);
      wsClient.off('developer-presence', handlePresenceUpdate);
    };
    
    return () => {
      cleanupRef.current?.();
    };
  }, [handleNewMessage, handlePresenceUpdate]);
  
  return {
    isConnected: wsClient.isConnected,
    subscribe: (event: string, handler: (...args: any[]) => void) => {
      wsClient.on(event, handler);
      return () => wsClient.off(event, handler);
    },
    subscribeToGuild: wsClient.subscribeToGuild.bind(wsClient),
    subscribeToTopic: wsClient.subscribeToTopic.bind(wsClient),
    unsubscribeFromGuild: wsClient.unsubscribeFromGuild.bind(wsClient),
    unsubscribeFromTopic: wsClient.unsubscribeFromTopic.bind(wsClient),
  };
}

export function useGuildSubscription(guildId: string | null) {
  const { subscribeToGuild, unsubscribeFromGuild } = useWebSocket();
  
  useEffect(() => {
    if (!guildId) return;
    
    subscribeToGuild(guildId);
    
    return () => {
      unsubscribeFromGuild(guildId);
    };
  }, [guildId, subscribeToGuild, unsubscribeFromGuild]);
}

export function useTopicSubscription(guildId: string | null, topicName: string | null) {
  const { subscribeToTopic, unsubscribeFromTopic } = useWebSocket();
  
  useEffect(() => {
    if (!guildId || !topicName) return;
    
    subscribeToTopic(guildId, topicName);
    
    return () => {
      unsubscribeFromTopic(guildId, topicName);
    };
  }, [guildId, topicName, subscribeToTopic, unsubscribeFromTopic]);
}