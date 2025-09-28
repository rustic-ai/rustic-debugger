import Redis from 'ioredis';
import { gemstoneId } from '@rustic-debug/types';
import type { Message, MessageStatus } from '@rustic-debug/types';

// Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'rustic:';
const DEMO_GUILDS = ['marketplace', 'analytics', 'payment-gateway', 'notifications'];
const TOPICS_PER_GUILD = ['orders', 'inventory', 'events', 'errors', 'metrics'];
const AGENTS_PER_GUILD = ['api-service', 'worker-1', 'worker-2', 'monitor', 'scheduler'];
const MESSAGES_PER_TOPIC = 50;

// Sample message types
const MESSAGE_TYPES = ['order.created', 'inventory.updated', 'payment.processed', 'user.registered', 'error.critical'];
const MESSAGE_STATUSES: MessageStatus[] = ['success', 'error', 'processing', 'pending'];

// Sample payloads
const SAMPLE_PAYLOADS = [
  {
    type: 'order.created',
    content: {
      orderId: 'ORD-2024-001',
      customerId: 'CUST-123',
      items: [
        { sku: 'PROD-A', quantity: 2, price: 29.99 },
        { sku: 'PROD-B', quantity: 1, price: 49.99 }
      ],
      total: 109.97,
      status: 'pending'
    }
  },
  {
    type: 'inventory.updated',
    content: {
      sku: 'PROD-A',
      previousQuantity: 100,
      newQuantity: 98,
      location: 'warehouse-east',
      trigger: 'order_fulfillment'
    }
  },
  {
    type: 'payment.processed',
    content: {
      transactionId: 'TXN-2024-001',
      amount: 109.97,
      currency: 'USD',
      method: 'credit_card',
      status: 'approved'
    }
  },
  {
    type: 'user.registered',
    content: {
      userId: 'USER-456',
      email: 'demo@example.com',
      registrationMethod: 'email',
      referralSource: 'organic'
    }
  },
  {
    type: 'error.critical',
    content: {
      service: 'payment-gateway',
      error: 'Connection timeout to payment processor',
      code: 'PAYMENT_TIMEOUT',
      attempts: 3,
      lastAttempt: new Date().toISOString()
    }
  }
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...');
  
  const redis = new Redis(REDIS_URL);
  
  // Helper to add prefix to keys
  const prefixKey = (key: string) => `${KEY_PREFIX}${key}`;
  
  try {
    // Clear existing demo data
    console.log('🧹 Clearing existing demo data...');
    for (const guild of DEMO_GUILDS) {
      await redis.del(prefixKey(`guild:${guild}`));
      await redis.srem(prefixKey('guilds'), guild);
      
      for (const topic of TOPICS_PER_GUILD) {
        const topicKey = prefixKey(`topic:${guild}:${topic}`);
        const messageIds = await redis.zrange(topicKey, 0, -1);
        
        // Delete all messages
        for (const messageId of messageIds) {
          await redis.del(prefixKey(`msg:${guild}:${messageId}`));
        }
        
        // Delete topic
        await redis.del(topicKey);
      }
    }
    
    // Create guilds
    console.log('🏢 Creating guilds...');
    for (const guildName of DEMO_GUILDS) {
      const guildData = {
        name: guildName.charAt(0).toUpperCase() + guildName.slice(1),
        status: 'active',
        description: `Demo ${guildName} guild for testing`,
        namespace: guildName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await redis.hset(prefixKey(`guild:${guildName}`), guildData);
      await redis.sadd(prefixKey('guilds'), guildName);
      
      console.log(`  ✅ Created guild: ${guildName}`);
    }
    
    // Create messages for each guild and topic
    console.log('💬 Creating messages...');
    let totalMessages = 0;
    
    for (const guild of DEMO_GUILDS) {
      for (const topic of TOPICS_PER_GUILD) {
        const topicKey = prefixKey(`topic:${guild}:${topic}`);
        
        for (let i = 0; i < MESSAGES_PER_TOPIC; i++) {
          // Generate message ID
          const messageId = gemstoneId.generate(Math.floor(Math.random() * 4)).id;
          
          // Select random agents
          const sourceAgent = AGENTS_PER_GUILD[Math.floor(Math.random() * AGENTS_PER_GUILD.length)];
          const targetAgent = Math.random() > 0.3 
            ? AGENTS_PER_GUILD[Math.floor(Math.random() * AGENTS_PER_GUILD.length)]
            : undefined;
          
          // Select random payload
          const payloadTemplate = SAMPLE_PAYLOADS[Math.floor(Math.random() * SAMPLE_PAYLOADS.length)];
          
          // Select status (80% success, 20% other)
          const status = Math.random() > 0.2 ? 'success' : MESSAGE_STATUSES[Math.floor(Math.random() * MESSAGE_STATUSES.length)];
          
          // Create message
          const message = {
            guildId: guild,
            topicName: topic,
            payload: JSON.stringify(payloadTemplate),
            metadata: JSON.stringify({
              sourceAgent,
              targetAgent,
              timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time in last hour
              priority: Math.floor(Math.random() * 3) + 1,
              retryCount: status === 'error' ? Math.floor(Math.random() * 3) : 0,
              maxRetries: 3
            }),
            status: JSON.stringify({
              current: status,
              history: [
                {
                  status: 'pending',
                  timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                  message: 'Message created'
                },
                {
                  status,
                  timestamp: new Date(Date.now() - Math.random() * 1800000).toISOString(),
                  message: status === 'success' ? 'Message processed successfully' : 'Message processing failed'
                }
              ]
            }),
            routing: JSON.stringify({
              source: sourceAgent,
              destination: targetAgent,
              hops: targetAgent ? [
                { agent: 'gateway', timestamp: new Date().toISOString() },
                { agent: targetAgent, timestamp: new Date().toISOString() }
              ] : []
            })
          };
          
          // Add error details if status is error
          if (status === 'error') {
            (message as any).error = JSON.stringify({
              code: ['TIMEOUT', 'CONNECTION_ERROR', 'VALIDATION_ERROR'][Math.floor(Math.random() * 3)],
              message: 'Simulated error for demo purposes',
              timestamp: new Date().toISOString()
            });
          }
          
          // Store message
          await redis.hset(prefixKey(`msg:${guild}:${messageId}`), message);
          
          // Add to topic sorted set (score is timestamp)
          await redis.zadd(topicKey, Date.now() - Math.random() * 3600000, messageId);
          
          totalMessages++;
        }
        
        console.log(`  ✅ Created ${MESSAGES_PER_TOPIC} messages for ${guild}/${topic}`);
      }
    }
    
    console.log(`\n✨ Demo data seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`  - Guilds created: ${DEMO_GUILDS.length}`);
    console.log(`  - Topics per guild: ${TOPICS_PER_GUILD.length}`);
    console.log(`  - Total messages: ${totalMessages}`);
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

// Run the seeder
seedDemoData().catch(console.error);