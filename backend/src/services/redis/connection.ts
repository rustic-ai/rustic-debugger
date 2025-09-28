import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { config } from '../../config/index.js';
import { exponentialBackoff } from './reconnection.js';

export interface RedisClients {
  command: Redis;
  pubsub: Redis;
}

let clients: RedisClients | null = null;

const baseOptions: RedisOptions = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  db: config.redisDb,
  keyPrefix: config.redisKeyPrefix,
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: exponentialBackoff,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when we get READONLY error
      return true;
    }
    return false;
  },
};

export async function createRedisClients(): Promise<RedisClients> {
  if (clients) {
    return clients;
  }

  // Create separate clients for commands and pub/sub
  const commandClient = new Redis({
    ...baseOptions,
    enableOfflineQueue: true,
  });

  const pubsubClient = new Redis({
    ...baseOptions,
    enableOfflineQueue: false, // Pub/sub doesn't need offline queue
  });

  // Set up error handlers
  commandClient.on('error', (err) => {
    console.error('Redis command client error:', err);
  });

  pubsubClient.on('error', (err) => {
    console.error('Redis pubsub client error:', err);
  });

  // Set up connection event handlers
  commandClient.on('connect', () => {
    console.info('Redis command client connected');
  });

  pubsubClient.on('connect', () => {
    console.info('Redis pubsub client connected');
  });

  commandClient.on('ready', () => {
    console.info('Redis command client ready');
  });

  pubsubClient.on('ready', () => {
    console.info('Redis pubsub client ready');
  });

  // Connect both clients
  await Promise.all([
    commandClient.connect(),
    pubsubClient.connect(),
  ]);

  clients = { command: commandClient, pubsub: pubsubClient };
  return clients;
}

export async function closeRedisClients(): Promise<void> {
  if (!clients) {
    return;
  }

  await Promise.all([
    clients.command.quit(),
    clients.pubsub.quit(),
  ]);

  clients = null;
}

export async function getRedisClients(): Promise<RedisClients> {
  if (!clients) {
    return createRedisClients();
  }
  
  // Check if clients are still connected
  const commandStatus = clients.command.status;
  const pubsubStatus = clients.pubsub.status;
  
  if (commandStatus === 'ready' && pubsubStatus === 'ready') {
    return clients;
  }
  
  // Recreate clients if not ready
  await closeRedisClients();
  return createRedisClients();
}

// Utility function to check Redis connection
export async function checkRedisConnection(): Promise<{
  connected: boolean;
  latency: number;
}> {
  try {
    const startTime = Date.now();
    const redis = await getRedisClients();
    await redis.command.ping();
    const latency = Date.now() - startTime;
    
    return { connected: true, latency };
  } catch (error) {
    return { connected: false, latency: -1 };
  }
}