import type {
  PaginatedResponse,
  Guild,
  Topic,
  Message,
  HealthResponse,
  ExportRequest,
  ExportResponse,
  ReplayRequest,
  ReplayResponse,
} from '@rustic-debug/types';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }
    
    return data;
  }
  
  // Health endpoint
  async getHealth(): Promise<HealthResponse> {
    // Health endpoint returns data directly without ApiResponse wrapper
    return this.request<HealthResponse>('/health');
  }
  
  // Guild endpoints
  async getGuilds(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Guild>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }

    const response = await this.request<PaginatedResponse<Guild>>(`/guilds?${query}`);
    // The response is already in PaginatedResponse format
    return response;
  }
  
  async getGuild(guildId: string): Promise<Guild> {
    // Guild endpoint returns data directly without ApiResponse wrapper
    return this.request<Guild>(`/guilds/${guildId}`);
  }
  
  async deleteGuild(guildId: string): Promise<void> {
    await this.request(`/guilds/${guildId}`, { method: 'DELETE' });
  }
  
  // Topic endpoints
  async getTopics(guildId: string, params?: {
    type?: string;
    includeStats?: boolean;
  }): Promise<Topic[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }

    // Topics endpoint returns data wrapped in { success, data }
    const response = await this.request<{ success: boolean; data: Topic[] }>(
      `/guilds/${guildId}/topics?${query}`
    );
    return response.data;
  }
  
  async getTopic(guildId: string, topicName: string): Promise<Topic> {
    // Topic endpoint returns data directly without ApiResponse wrapper
    return this.request<Topic>(
      `/guilds/${guildId}/topics/${encodeURIComponent(topicName)}`
    );
  }
  
  // Message endpoints
  async getMessage(messageId: string): Promise<Message> {
    // Message endpoint returns data directly without ApiResponse wrapper
    return this.request<Message>(`/messages/${messageId}`);
  }
  
  async getGuildMessages(
    guildId: string,
    params?: {
      start?: string;
      end?: string;
      status?: string[];
      threadId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<Message>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (key === 'status' && Array.isArray(value)) {
          query.append(key, value.join(','));
        } else if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }

    const response = await this.request<PaginatedResponse<Message>>(
      `/guilds/${guildId}/messages?${query}`
    );
    // The response is already in PaginatedResponse format
    return response;
  }
  
  async getTopicMessages(
    guildId: string,
    topicName: string,
    params?: {
      start?: string;
      end?: string;
      status?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<Message>> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (key === 'status' && Array.isArray(value)) {
          query.append(key, value.join(','));
        } else if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }

    const response = await this.request<PaginatedResponse<Message>>(
      `/guilds/${guildId}/topics/${encodeURIComponent(topicName)}/messages?${query}`
    );
    // The response is already in PaginatedResponse format
    return response;
  }
  
  // Export endpoint
  async exportMessages(request: ExportRequest): Promise<ExportResponse> {
    // Export endpoint returns data directly without ApiResponse wrapper
    return this.request<ExportResponse>('/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  // Replay endpoint
  async replayMessages(request: ReplayRequest): Promise<ReplayResponse> {
    // Replay endpoint returns data directly without ApiResponse wrapper
    return this.request<ReplayResponse>('/replay', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  // Cache endpoints
  async clearCache(): Promise<{ clearedKeys: number }> {
    // Cache endpoint returns data directly without ApiResponse wrapper
    return this.request<{ clearedKeys: number }>(
      '/cache/clear',
      { method: 'DELETE' }
    );
  }
  
  async getCacheStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    retentionDays: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    // Cache stats endpoint returns data directly without ApiResponse wrapper
    return this.request<{
      totalKeys: number;
      totalSize: number;
      retentionDays: number;
      oldestEntry: string | null;
      newestEntry: string | null;
    }>('/cache/stats');
  }
}

export const apiClient = new ApiClient();