import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Guild, Topic } from '@rustic-debug/types';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockGuild: Guild = {
  id: { id: 'test-guild', timestamp: Date.now(), priority: 0, counter: 0 },
  name: 'Test Guild',
  status: 'active',
  description: 'Test guild description',
  namespace: 'test',
  metadata: {
    topicCount: 5,
    agentCount: 3,
    messageRate: 10.5,
    lastActivity: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  config: {
    retentionDays: 7,
    maxTopics: 100,
    maxAgents: 50,
    maxMessageRate: 1000,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTopic: Topic = {
  guildId: 'test-guild',
  name: 'general',
  type: 'broadcast',
  retention: 86400,
  publishers: ['agent1'],
  subscribers: ['agent2', 'agent3'],
  metadata: {
    messageCount: 50,
    lastMessage: new Date().toISOString(),
    errorCount: 1,
  },
  createdAt: new Date().toISOString(),
};

// Mock stores
vi.mock('@stores/guildStore', () => ({
  useGuildStore: vi.fn(() => ({
    selectedGuildId: null,
    selectedTopicName: null,
    setSelectedGuild: vi.fn(),
    setSelectedTopic: vi.fn(),
  })),
}));

// Mock API client
vi.mock('@/services/api/client', () => ({
  apiClient: {
    getGuilds: vi.fn(() => Promise.resolve({
      success: true,
      data: [mockGuild],
    })),
    getTopics: vi.fn(() => Promise.resolve({
      success: true,
      data: [mockTopic],
    })),
    deleteGuild: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

// Simple test component
function SimpleGuildList({ 
  guilds,
  selectedGuild,
  onSelectGuild 
}: {
  guilds: Guild[];
  selectedGuild: string | null;
  onSelectGuild: (id: string) => void;
}) {
  return (
    <div>
      {guilds.map(guild => (
        <div
          key={guild.id.id}
          className={selectedGuild === guild.id.id ? 'bg-blue-50' : ''}
        >
          <button
            onClick={() => onSelectGuild(guild.id.id)}
            aria-label={guild.name}
          >
            {guild.name}
          </button>
          <span>{guild.namespace}</span>
        </div>
      ))}
    </div>
  );
}

describe('SimpleGuildExplorer', () => {
  it('renders guilds list', async () => {
    const onSelectGuild = vi.fn();
    render(
      <SimpleGuildList 
        guilds={[mockGuild]}
        selectedGuild={null}
        onSelectGuild={onSelectGuild}
      />
    );
    
    expect(screen.getByText('Test Guild')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument(); // namespace
  });
  
  it('calls onSelectGuild when guild clicked', async () => {
    const user = userEvent.setup();
    const onSelectGuild = vi.fn();
    render(
      <SimpleGuildList 
        guilds={[mockGuild]}
        selectedGuild={null}
        onSelectGuild={onSelectGuild}
      />
    );
    
    const guildButton = screen.getByRole('button', { name: /Test Guild/i });
    await user.click(guildButton);
    
    expect(onSelectGuild).toHaveBeenCalledWith('test-guild');
  });
  
  it('highlights selected guild', async () => {
    const { container } = render(
      <SimpleGuildList 
        guilds={[mockGuild]}
        selectedGuild="test-guild"
        onSelectGuild={vi.fn()}
      />
    );
    
    const guildItem = container.querySelector('.bg-blue-50');
    expect(guildItem).toBeInTheDocument();
  });
});