import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import type { Guild } from '@rustic-dev/types';

// Contract schemas based on OpenAPI
const GuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  topicCount: z.number().int().min(0),
  messageRate: z.number().min(0),
  lastActivity: z.string().datetime().optional(),
  status: z.enum(['active', 'idle', 'inactive'])
});

const GuildsResponseSchema = z.object({
  data: z.array(GuildSchema),
  timestamp: z.string().datetime()
});

describe('GET /guilds - Contract Tests', () => {
  let apiClient: any; // Will be replaced with actual client

  beforeAll(() => {
    // This test should fail until implementation exists
    apiClient = null; // TODO: Initialize API client
  });

  it('should return valid guild list schema', async () => {
    // This test MUST fail initially (TDD principle)
    const response = await apiClient.get('/guilds');
    
    // Validate response matches contract
    const result = GuildsResponseSchema.safeParse(response.data);
    expect(result.success).toBe(true);
  });

  it('should return guilds with required fields', async () => {
    const response = await apiClient.get('/guilds');
    
    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);
    
    // Each guild must have required fields
    response.data.data.forEach((guild: Guild) => {
      expect(guild.id).toBeDefined();
      expect(guild.name).toBeDefined();
      expect(guild.topicCount).toBeGreaterThanOrEqual(0);
      expect(guild.messageRate).toBeGreaterThanOrEqual(0);
      expect(['active', 'idle', 'inactive']).toContain(guild.status);
    });
  });

  it('should return timestamp in ISO format', async () => {
    const response = await apiClient.get('/guilds');
    
    const timestamp = new Date(response.data.timestamp);
    expect(timestamp.toISOString()).toBe(response.data.timestamp);
  });

  it('should handle empty guild list', async () => {
    // When no guilds exist
    const response = await apiClient.get('/guilds');
    
    expect(response.status).toBe(200);
    expect(response.data.data).toEqual([]);
    expect(response.data.timestamp).toBeDefined();
  });

  it('should return guilds sorted by activity', async () => {
    const response = await apiClient.get('/guilds');
    const guilds = response.data.data;
    
    if (guilds.length > 1) {
      // Active guilds should appear before inactive
      const activeIndex = guilds.findIndex((g: Guild) => g.status === 'active');
      const inactiveIndex = guilds.findIndex((g: Guild) => g.status === 'inactive');
      
      if (activeIndex !== -1 && inactiveIndex !== -1) {
        expect(activeIndex).toBeLessThan(inactiveIndex);
      }
    }
  });
});