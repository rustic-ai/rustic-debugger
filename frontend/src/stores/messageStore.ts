import { create } from 'zustand';
import type { Message } from '@rustic-debug/types';

interface MessageState {
  messages: Map<string, Message>;
  selectedMessageId: string | null;
  liveMessages: Message[];
  
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  selectMessage: (messageId: string | null) => void;
  clearMessages: () => void;
  addLiveMessage: (message: Message) => void;
  clearLiveMessages: () => void;
}

const MAX_LIVE_MESSAGES = 100;

export const useMessageStore = create<MessageState>((set) => ({
  messages: new Map(),
  selectedMessageId: null,
  liveMessages: [],
  
  addMessage: (message) =>
    set((state) => {
      const messages = new Map(state.messages);
      messages.set(message.id.id, message);
      return { messages };
    }),
  
  addMessages: (newMessages) =>
    set((state) => {
      const messages = new Map(state.messages);
      newMessages.forEach(msg => messages.set(msg.id.id, msg));
      return { messages };
    }),
  
  selectMessage: (messageId) =>
    set({ selectedMessageId: messageId }),
  
  clearMessages: () =>
    set({ messages: new Map(), selectedMessageId: null }),
  
  addLiveMessage: (message) =>
    set((state) => {
      const liveMessages = [message, ...state.liveMessages].slice(0, MAX_LIVE_MESSAGES);
      return { liveMessages };
    }),
  
  clearLiveMessages: () =>
    set({ liveMessages: [] }),
}));