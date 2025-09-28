import { vi } from 'vitest';
import Redis from 'ioredis-mock';

// Mock ioredis globally for all tests
vi.mock('ioredis', () => ({
  default: Redis,
}));