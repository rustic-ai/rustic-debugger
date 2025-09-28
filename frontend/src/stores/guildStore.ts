import { create } from 'zustand';
import type { Guild } from '@rustic-debug/types';

interface GuildState {
  selectedGuildId: string | null;
  selectedTopicName: string | null;
  guilds: Guild[];
  setSelectedGuild: (guildId: string | null) => void;
  setSelectedTopic: (topicName: string | null) => void;
  setGuilds: (guilds: Guild[]) => void;
  getSelectedGuild: () => Guild | undefined;
}

export const useGuildStore = create<GuildState>((set, get) => ({
  selectedGuildId: null,
  selectedTopicName: null,
  guilds: [],
  
  setSelectedGuild: (guildId) => 
    set({ selectedGuildId: guildId, selectedTopicName: null }),
  
  setSelectedTopic: (topicName) => 
    set({ selectedTopicName: topicName }),
  
  setGuilds: (guilds) => 
    set({ guilds }),
  
  getSelectedGuild: () => {
    const state = get();
    return state.guilds.find(g => g.id.id === state.selectedGuildId);
  },
}));