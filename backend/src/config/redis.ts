import IORedis from 'ioredis';

export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
  connectTimeout: 10000,
});

redisConnection.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});