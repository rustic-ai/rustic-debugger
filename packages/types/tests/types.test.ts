import { describe, it, expect } from 'vitest';
import { gemstoneId, type GemstoneID } from '../src/gemstoneId.js';
import { getGuildStatus } from '../src/guild.js';
import { 
  gemstoneIdSchema,
  guildSchema,
  messageSchema,
  messageFilterSchema,
  exportRequestSchema
} from '../src/schemas.js';

describe('GemstoneID', () => {
  it('should generate valid GemstoneIDs', () => {
    const id = gemstoneId.generate();
    
    expect(id.id).toMatch(/^[0-9a-f]{16}$/);
    expect(id.timestamp).toBeLessThanOrEqual(Date.now());
    expect(id.timestamp).toBeGreaterThan(Date.now() - 1000);
    expect(id.priority).toBe(0);
    expect(id.counter).toBeGreaterThanOrEqual(0);
    expect(id.counter).toBeLessThanOrEqual(4095);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(gemstoneId.generate().id);
    }
    expect(ids.size).toBe(1000);
  });

  it('should parse IDs correctly', () => {
    const generated = gemstoneId.generate(5);
    const parsed = gemstoneId.parse(generated.id);
    
    expect(parsed.timestamp).toBe(generated.timestamp);
    expect(parsed.priority).toBe(5);
    expect(parsed.counter).toBe(generated.counter);
  });

  it('should validate IDs', () => {
    const valid = gemstoneId.generate();
    expect(gemstoneId.isValid(valid.id)).toBe(true);
    
    expect(gemstoneId.isValid('invalid')).toBe(false);
    expect(gemstoneId.isValid('fffffffffffff')).toBe(false); // too short
    expect(gemstoneId.isValid('ffffffffffffffffff')).toBe(false); // too long
    expect(gemstoneId.isValid('zzzzzzzzzzzzzzzz')).toBe(false); // invalid chars
  });
});

describe('Guild', () => {
  it('should correctly determine guild status', () => {
    const now = new Date();
    
    // Active (< 1 minute)
    const activeDate = new Date(now.getTime() - 30 * 1000);
    expect(getGuildStatus(activeDate)).toBe('active');
    
    // Idle (< 1 hour)
    const idleDate = new Date(now.getTime() - 30 * 60 * 1000);
    expect(getGuildStatus(idleDate)).toBe('idle');
    
    // Inactive (> 1 hour)
    const inactiveDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(getGuildStatus(inactiveDate)).toBe('inactive');
  });
});

describe('Schemas', () => {
  it('should validate GemstoneID schema', () => {
    const valid = {
      id: 'abcdef1234567890',
      timestamp: Date.now(),
      priority: 5,
      counter: 100
    };
    
    expect(() => gemstoneIdSchema.parse(valid)).not.toThrow();
    
    const invalid = { ...valid, priority: 20 };
    expect(() => gemstoneIdSchema.parse(invalid)).toThrow();
  });

  it('should validate guild schema', () => {
    const guild = {
      id: gemstoneId.generate(),
      name: 'Test Guild',
      namespace: 'test-guild',
      status: 'active',
      metadata: {
        topicCount: 10,
        agentCount: 5,
        messageRate: 50.5,
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
    };
    
    expect(() => guildSchema.parse(guild)).not.toThrow();
  });

  it('should validate message filter schema', () => {
    const filter = {
      guildId: 'guild-123',
      status: ['pending', 'processing'],
      limit: 100,
      offset: 0,
    };
    
    expect(() => messageFilterSchema.parse(filter)).not.toThrow();
    
    const invalidFilter = { ...filter, status: ['invalid-status'] };
    expect(() => messageFilterSchema.parse(invalidFilter)).toThrow();
  });

  it('should validate export request schema', () => {
    const exportReq = {
      filter: {
        guildId: 'guild-123',
        limit: 1000
      },
      format: 'json',
      includeMetadata: true,
    };
    
    expect(() => exportRequestSchema.parse(exportReq)).not.toThrow();
    
    const invalidFormat = { ...exportReq, format: 'xml' };
    expect(() => exportRequestSchema.parse(invalidFormat)).toThrow();
  });
});