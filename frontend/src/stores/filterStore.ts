import { create } from 'zustand';
import type { MessageStatus } from '@rustic-debug/types';

interface FilterState {
  statusFilter: MessageStatus[] | null;
  agentFilter: string | null;
  searchText: string;
  timeRange: {
    start: Date | null;
    end: Date | null;
  };
  
  setStatusFilter: (statuses: MessageStatus[] | null) => void;
  setAgentFilter: (agent: string | null) => void;
  setSearchText: (text: string) => void;
  setTimeRange: (start: Date | null, end: Date | null) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  statusFilter: null,
  agentFilter: null,
  searchText: '',
  timeRange: {
    start: null,
    end: null,
  },
  
  setStatusFilter: (statuses) =>
    set({ statusFilter: statuses }),
  
  setAgentFilter: (agent) =>
    set({ agentFilter: agent }),
  
  setSearchText: (text) =>
    set({ searchText: text }),
  
  setTimeRange: (start, end) =>
    set({ timeRange: { start, end } }),
  
  clearFilters: () =>
    set({
      statusFilter: null,
      agentFilter: null,
      searchText: '',
      timeRange: { start: null, end: null },
    }),
}));