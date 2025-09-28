import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';

export interface StartedRedisContainer extends StartedTestContainer {
  getClient: () => Promise<Redis>;
}

let sharedContainer: StartedRedisContainer | null = null;

export async function getRedisContainer(): Promise<StartedRedisContainer> {
  if (sharedContainer) {
    return sharedContainer;
  }

  const container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withStartupTimeout(30000)
    .withHealthCheck({
      test: ['CMD', 'redis-cli', 'ping'],
      interval: 1000,
      timeout: 3000,
      retries: 5,
      startPeriod: 1000,
    })
    .start();

  const redisContainer = container as StartedRedisContainer;
  
  redisContainer.getClient = async () => {
    return new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  };

  sharedContainer = redisContainer;
  return redisContainer;
}

export async function seedTestData(redis: Redis, data: {
  guilds?: Array<{ id: string; name: string; namespace: string }>;
  messages?: Array<{ id: string; guildId: string; topicName: string; payload: unknown }>;
}) {
  const pipeline = redis.pipeline();

  // Seed guilds
  if (data.guilds) {
    for (const guild of data.guilds) {
      pipeline.hset(`guild:${guild.id}`, {
        name: guild.name,
        namespace: guild.namespace,
        status: 'active',
        lastActivity: new Date().toISOString(),
      });
      pipeline.sadd('guilds', guild.id);
    }
  }

  // Seed messages
  if (data.messages) {
    for (const message of data.messages) {
      const key = `msg:${message.guildId}:${message.id}`;
      pipeline.hset(key, {
        topicName: message.topicName,
        payload: JSON.stringify(message.payload),
        timestamp: new Date().toISOString(),
      });
      pipeline.zadd(
        `topic:${message.guildId}:${message.topicName}`,
        Date.now(),
        message.id
      );
    }
  }

  await pipeline.exec();
}