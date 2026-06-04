import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected successfully.'));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis. Continuing without caching.', err);
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  if (!redisClient.isOpen) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error('Redis get error', err);
    return null;
  }
};

export const setCache = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  if (!redisClient.isOpen) return;
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch (err) {
    console.error('Redis set error', err);
  }
};
