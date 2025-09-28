import { z } from 'zod';

const configSchema = z.object({
  // Server config
  port: z.number().default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  
  // Redis config
  redisHost: z.string().default('localhost'),
  redisPort: z.number().default(6379),
  redisPassword: z.string().optional(),
  redisDb: z.number().default(0),
  redisKeyPrefix: z.string().default(''),
  
  // Feature flags
  enableReplay: z.boolean().default(false),
  
  // Performance config
  maxMessagesPerSecond: z.number().default(100),
  maxExportSize: z.number().default(10000),
  cacheSize: z.number().default(1000),
  cacheTtl: z.number().default(300), // 5 minutes
  
  // Retention config
  messageRetentionDays: z.number().default(7),
  exportRetentionHours: z.number().default(24),
  
  // WebSocket config
  wsMaxConnections: z.number().default(1000),
  wsMessageRateLimit: z.number().default(100),
  wsHeartbeatInterval: z.number().default(30000), // 30 seconds
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const env = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST,
    logLevel: process.env.LOG_LEVEL,
    
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    redisPassword: process.env.REDIS_PASSWORD,
    redisDb: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
    redisKeyPrefix: process.env.REDIS_KEY_PREFIX,
    
    enableReplay: process.env.ENABLE_REPLAY === 'true',
    
    maxMessagesPerSecond: process.env.MAX_MESSAGES_PER_SECOND 
      ? parseInt(process.env.MAX_MESSAGES_PER_SECOND, 10) : undefined,
    maxExportSize: process.env.MAX_EXPORT_SIZE 
      ? parseInt(process.env.MAX_EXPORT_SIZE, 10) : undefined,
    cacheSize: process.env.CACHE_SIZE 
      ? parseInt(process.env.CACHE_SIZE, 10) : undefined,
    cacheTtl: process.env.CACHE_TTL 
      ? parseInt(process.env.CACHE_TTL, 10) : undefined,
    
    messageRetentionDays: process.env.MESSAGE_RETENTION_DAYS 
      ? parseInt(process.env.MESSAGE_RETENTION_DAYS, 10) : undefined,
    exportRetentionHours: process.env.EXPORT_RETENTION_HOURS 
      ? parseInt(process.env.EXPORT_RETENTION_HOURS, 10) : undefined,
    
    wsMaxConnections: process.env.WS_MAX_CONNECTIONS 
      ? parseInt(process.env.WS_MAX_CONNECTIONS, 10) : undefined,
    wsMessageRateLimit: process.env.WS_MESSAGE_RATE_LIMIT 
      ? parseInt(process.env.WS_MESSAGE_RATE_LIMIT, 10) : undefined,
    wsHeartbeatInterval: process.env.WS_HEARTBEAT_INTERVAL 
      ? parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) : undefined,
  };
  
  // Remove undefined values
  const cleanedEnv = Object.fromEntries(
    Object.entries(env).filter(([_, v]) => v !== undefined)
  );
  
  return configSchema.parse(cleanedEnv);
}

export const config = loadConfig();