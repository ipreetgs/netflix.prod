import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis Cache Layer successfully.');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
};

export const setCache = async (key: string, value: string, ttlSeconds?: number) => {
  try {
    if (!redisClient.isOpen) return;
    if (ttlSeconds) {
      await redisClient.set(key, value, { EX: ttlSeconds });
    } else {
      await redisClient.set(key, value);
    }
  } catch (err) {
    console.warn(`Redis Set Cache failed for key ${key}:`, err);
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  try {
    if (!redisClient.isOpen) return null;
    return await redisClient.get(key);
  } catch (err) {
    console.warn(`Redis Get Cache failed for key ${key}:`, err);
    return null;
  }
};
