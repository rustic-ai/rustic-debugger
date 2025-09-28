import { useState } from 'react';
import { useFilterStore } from '@stores/filterStore';
import { useGuildStore } from '@stores/guildStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';
import type { MessageStatus } from '@rustic-debug/types';
import { 
  Filter, 
  Calendar, 
  User, 
  AlertCircle,
  X,
  Search
} from 'lucide-react';

export function FilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const filters = useFilterStore();
  const { selectedGuildId, selectedTopicName } = useGuildStore();
  
  // Fetch available agents for filtering
  const { data: agents } = useQuery({
    queryKey: ['agents', selectedGuildId, selectedTopicName],
    queryFn: async () => {
      if (!selectedGuildId || !selectedTopicName) return [];
      const topics = await apiClient.getTopics(selectedGuildId);
      const topic = topics.find(t => t.name === selectedTopicName);
      return topic ? [...new Set([...topic.publishers, ...topic.subscribers])] : [];
    },
    enabled: !!selectedGuildId && !!selectedTopicName,
  });
  
  const statusOptions: MessageStatus[] = [
    'pending',
    'processing',
    'success',
    'error',
    'timeout',
    'rejected',
  ];
  
  const activeFilterCount = [
    filters.statusFilter?.length || 0,
    filters.agentFilter ? 1 : 0,
    filters.searchText ? 1 : 0,
    filters.timeRange.start || filters.timeRange.end ? 1 : 0,
  ].reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border rounded-md hover:bg-muted"
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-full max-w-xs sm:max-w-sm bg-card border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Search Filter */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Search</span>
              </label>
              <input
                type="text"
                value={filters.searchText || ''}
                onChange={(e) => filters.setSearchText(e.target.value)}
                placeholder="Search in message content..."
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>Status</span>
              </label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label key={status} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.statusFilter?.includes(status) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          filters.setStatusFilter([...(filters.statusFilter || []), status]);
                        } else {
                          filters.setStatusFilter(
                            (filters.statusFilter || []).filter(s => s !== status)
                          );
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Agent Filter */}
            {agents && agents.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Agent</span>
                </label>
                <select
                  value={filters.agentFilter || ''}
                  onChange={(e) => filters.setAgentFilter(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">All agents</option>
                  {agents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Time Range Filter */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Time Range</span>
              </label>
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={filters.timeRange.start?.toISOString().slice(0, 16) || ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    filters.setTimeRange(date, filters.timeRange.end);
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="Start date"
                />
                <input
                  type="datetime-local"
                  value={filters.timeRange.end?.toISOString().slice(0, 16) || ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    filters.setTimeRange(filters.timeRange.start, date);
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="End date"
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => filters.clearFilters()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}