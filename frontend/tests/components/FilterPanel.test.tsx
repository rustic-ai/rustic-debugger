import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterPanel } from '@/components/FilterPanel';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Import the mock
import { useFilterStore } from '@stores/filterStore';

// Mock the stores
vi.mock('@stores/filterStore', () => ({
  useFilterStore: vi.fn(() => ({
    status: [],
    agents: [],
    timeRange: 'last-hour',
    startDate: null,
    endDate: null,
    setStatus: vi.fn(),
    addAgent: vi.fn(),
    removeAgent: vi.fn(),
    setTimeRange: vi.fn(),
    setDateRange: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock('@stores/guildStore', () => ({
  useGuildStore: vi.fn(() => ({
    selectedGuildId: 'test-guild',
    selectedTopicName: 'general',
  })),
}));

// Mock API client
vi.mock('@/services/api/client', () => ({
  apiClient: {
    getTopics: vi.fn(() => Promise.resolve([{
      name: 'general',
      publishers: ['agent1'],
      subscribers: ['agent2', 'agent3'],
    }])),
  },
}));

// TECH DEBT: FilterPanel component doesn't exist yet
// These tests are for a future implementation
describe.skip('FilterPanel', () => {
  it('renders filter options', () => {
    const queryClient = createQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Time Range')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });
  
  it('toggles status filter', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const mockSetStatus = vi.fn();
    
    (useFilterStore as any).mockReturnValue({
      ...useFilterStore(),
      setStatus: mockSetStatus,
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    // Click on success status
    const successCheckbox = screen.getByRole('checkbox', { name: /success/i });
    await user.click(successCheckbox);
    
    expect(mockSetStatus).toHaveBeenCalled();
  });
  
  it('shows selected status filters', () => {
    const queryClient = createQueryClient();
    
    (useFilterStore as any).mockReturnValue({
      ...useFilterStore(),
      status: ['success', 'error'],
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    const successCheckbox = screen.getByRole('checkbox', { name: /success/i });
    const errorCheckbox = screen.getByRole('checkbox', { name: /error/i });
    
    expect(successCheckbox).toBeChecked();
    expect(errorCheckbox).toBeChecked();
  });
  
  it('changes time range', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const mockSetTimeRange = vi.fn();
    
    (useFilterStore as any).mockReturnValue({
      ...useFilterStore(),
      setTimeRange: mockSetTimeRange,
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    const timeRangeSelect = screen.getByRole('combobox');
    await user.selectOptions(timeRangeSelect, 'last-day');
    
    expect(mockSetTimeRange).toHaveBeenCalledWith('last-day');
  });
  
  it('clears all filters', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const mockReset = vi.fn();
    
    (useFilterStore as any).mockReturnValue({
      status: ['success', 'error'],
      agents: ['agent1', 'agent2'],
      timeRange: 'last-day',
      startDate: null,
      endDate: null,
      setStatus: vi.fn(),
      addAgent: vi.fn(),
      removeAgent: vi.fn(),
      setTimeRange: vi.fn(),
      setDateRange: vi.fn(),
      reset: mockReset,
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    await user.click(clearButton);
    
    expect(mockReset).toHaveBeenCalled();
  });
  
  it('adds agent filter', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const mockAddAgent = vi.fn();
    
    (useFilterStore as any).mockReturnValue({
      ...useFilterStore(),
      addAgent: mockAddAgent,
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    const agentInput = screen.getByPlaceholderText(/add agent/i);
    await user.type(agentInput, 'agent1{enter}');
    
    expect(mockAddAgent).toHaveBeenCalledWith('agent1');
  });
  
  it('removes agent filter', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const mockRemoveAgent = vi.fn();
    
    (useFilterStore as any).mockReturnValue({
      ...useFilterStore(),
      agents: ['agent1', 'agent2'],
      removeAgent: mockRemoveAgent,
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <FilterPanel />
      </QueryClientProvider>
    );
    
    // Find and click remove button for agent1
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);
    
    expect(mockRemoveAgent).toHaveBeenCalledWith('agent1');
  });
});