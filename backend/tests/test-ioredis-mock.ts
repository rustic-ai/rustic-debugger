import Redis from 'ioredis-mock';

async function test() {
  const redis = new Redis();
  
  // Set some keys
  await redis.set('topic:guild1:general', 'data1');
  await redis.set('topic:guild1:notifications', 'data2');
  await redis.set('topic:guild2:general', 'data3');
  
  // Test keys command
  const keys = await redis.keys('topic:guild1:*');
  console.log('Keys found:', keys);
  
  // Test hset and hgetall
  await redis.hset('test:hash', 'field1', 'value1', 'field2', 'value2');
  const hash = await redis.hgetall('test:hash');
  console.log('Hash:', hash);
  
  // Test zadd
  await redis.zadd('test:sorted', 1, 'one', 2, 'two');
  const members = await redis.zrange('test:sorted', 0, -1);
  console.log('Sorted set members:', members);
}

test().catch(console.error);