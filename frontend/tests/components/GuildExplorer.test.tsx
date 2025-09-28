import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { GuildExplorer } from '@/components/GuildExplorer';
import { useGuildStore } from '@stores/guildStore';
import type { Guild, Topic } from '@rustic-debug/types';

// Mock useGuildStore
vi.mock('@stores/guildStore');

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

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

// Mock the API client
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

describe('GuildExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useGuildStore
    vi.mocked(useGuildStore).mockReturnValue({
      selectedGuildId: null,
      selectedTopicName: null,
      setSelectedGuild: vi.fn(),
      setSelectedTopic: vi.fn(),
      reset: vi.fn(),
    });
  });

  it('renders guilds list', async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GuildExplorer />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Guild')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument(); // namespace
    });
  });
  
  it('navigates when guild clicked', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const navigate = vi.fn();
    
    // Override the navigate mock for this test
    const { useNavigate } = await import('react-router-dom');
    vi.mocked(useNavigate).mockReturnValue(navigate);
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GuildExplorer />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Guild')).toBeInTheDocument();
    });
    
    // Click on guild
    const guildButton = screen.getByRole('button', { name: /Test Guild/i });
    await user.click(guildButton);
    
    expect(navigate).toHaveBeenCalledWith('/debug/test-guild');
  });
  
  it('updates store when guild clicked', async () => {
    const user = userEvent.setup();
    const setSelectedGuild = vi.fn();
    
    // Mock the store
    vi.mocked(useGuildStore).mockReturnValue({
      selectedGuildId: null,
      selectedTopicName: null,
      setSelectedGuild,
      setSelectedTopic: vi.fn(),
      reset: vi.fn(),
    });
    
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GuildExplorer />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Guild')).toBeInTheDocument();
    });
    
    const guildButton = screen.getByRole('button', { name: /Test Guild/i });
    await user.click(guildButton);
    
    expect(setSelectedGuild).toHaveBeenCalledWith('test-guild');
  });
  
  it('highlights selected guild', async () => {
    // Mock the store with selected guild
    vi.mocked(useGuildStore).mockReturnValue({
      selectedGuildId: 'test-guild',
      selectedTopicName: null,
      setSelectedGuild: vi.fn(),
      setSelectedTopic: vi.fn(),
      reset: vi.fn(),
    });
    
    const queryClient = createQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GuildExplorer />
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      // Guild should be highlighted
      const guildItem = container.querySelector('.border-primary');
      expect(guildItem).toBeInTheDocument();
    });
  });
});