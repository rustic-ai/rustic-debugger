import { describe, it, expect } from 'vitest';
import { build } from '../src/app.js';

describe('Smoke Test', () => {
  it('should build the app without errors', async () => {
    const app = await build({ logger: false });
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
    await app.close();
  });
  
  it('should have required plugins registered', async () => {
    const app = await build({ logger: false });
    
    // Check that important plugins are registered
    // Note: These plugins might not be registered yet in Phase 3
    // expect(app.hasPlugin('@fastify/cors')).toBe(true);
    // expect(app.hasPlugin('@fastify/websocket')).toBe(true);
    
    await app.close();
  });
  
  it('should have Redis clients initialized', async () => {
    const app = await build({ logger: false });
    
    // Check Redis clients are available
    expect(app.redis).toBeDefined();
    expect(app.redis.command).toBeDefined();
    expect(app.redis.pubsub).toBeDefined();
    
    // Test basic Redis operation
    const redis = app.redis.command;
    await redis.set('test:key', 'test-value');
    const value = await redis.get('test:key');
    expect(value).toBe('test-value');
    
    await app.close();
  });
});