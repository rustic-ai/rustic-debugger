import { create } from 'zustand';

interface WebSocketState {
  isConnected: boolean;
  connectionId: string | null;
  subscriptions: Map<string, string>; // subscriptionId -> guildId
  stats: {
    messagesReceived: number;
    bytesReceived: number;
    connectionDuration: number;
    averageLatency: number;
  };
  
  setConnected: (connected: boolean, connectionId?: string) => void;
  addSubscription: (subscriptionId: string, guildId: string) => void;
  removeSubscription: (subscriptionId: string) => void;
  updateStats: (stats: Partial<WebSocketState['stats']>) => void;
  reset: () => void;
}

const initialStats = {
  messagesReceived: 0,
  bytesReceived: 0,
  connectionDuration: 0,
  averageLatency: 0,
};

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  connectionId: null,
  subscriptions: new Map(),
  stats: initialStats,
  
  setConnected: (connected, connectionId = undefined) =>
    set({ isConnected: connected, connectionId: connectionId || null }),
  
  addSubscription: (subscriptionId, guildId) =>
    set((state) => {
      const subscriptions = new Map(state.subscriptions);
      subscriptions.set(subscriptionId, guildId);
      return { subscriptions };
    }),
  
  removeSubscription: (subscriptionId) =>
    set((state) => {
      const subscriptions = new Map(state.subscriptions);
      subscriptions.delete(subscriptionId);
      return { subscriptions };
    }),
  
  updateStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),
  
  reset: () =>
    set({
      isConnected: false,
      connectionId: null,
      subscriptions: new Map(),
      stats: initialStats,
    }),
}));