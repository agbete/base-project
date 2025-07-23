import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

let redisClient: RedisClientType | null = null;

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export function getRedisConfig(): RedisConfig {
  const redisUrl = process.env['REDIS_URL'];
  
  if (redisUrl) {
    return {
      url: redisUrl,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }
  
  const config: RedisConfig = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    db: parseInt(process.env['REDIS_DB'] || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };
  
  const password = process.env['REDIS_PASSWORD'];
  if (password) {
    config.password = password;
  }
  
  return config;
}

export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  try {
    const config = getRedisConfig();
    
    redisClient = createClient({
      ...config,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });
    
    // Gestion des événements
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });
    
    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
    
    await redisClient.connect();
    
    // Test de connexion
    await redisClient.ping();
    
    logger.info('Redis connection established successfully');
    
    return redisClient;
    
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
}

// ========================================
// FONCTIONS UTILITAIRES POUR LE CACHE
// ========================================

export class CacheService {
  private client: RedisClientType;
  
  constructor(client: RedisClientType) {
    this.client = client;
  }
  
  // Obtenir une valeur du cache
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }
  
  // Définir une valeur dans le cache
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  }
  
  // Supprimer une clé du cache
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  }
  
  // Supprimer plusieurs clés
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client.del(keys);
    } catch (error) {
      logger.error('Cache delete pattern error:', { pattern, error });
      return 0;
    }
  }
  
  // Vérifier si une clé existe
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }
  
  // Définir un TTL sur une clé existante
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return Boolean(result);
    } catch (error) {
      logger.error('Cache expire error:', { key, ttlSeconds, error });
      return false;
    }
  }
  
  // Incrémenter une valeur numérique
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Cache incr error:', { key, error });
      throw error;
    }
  }
  
  // Incrémenter avec TTL
  async incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, ttlSeconds);
      const results = await multi.exec();
      return results?.[0] as number || 0;
    } catch (error) {
      logger.error('Cache incrWithTTL error:', { key, ttlSeconds, error });
      throw error;
    }
  }
}

// ========================================
// FONCTIONS UTILITAIRES POUR LES SESSIONS
// ========================================

export class SessionService {
  private cache: CacheService;
  private prefix: string = 'session:';
  
  constructor(cache: CacheService) {
    this.cache = cache;
  }
  
  // Créer une session
  async createSession(
    sessionId: string, 
    data: any, 
    ttlSeconds: number = 86400 // 24 heures par défaut
  ): Promise<boolean> {
    const key = this.prefix + sessionId;
    return await this.cache.set(key, data, ttlSeconds);
  }
  
  // Obtenir une session
  async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = this.prefix + sessionId;
    return await this.cache.get<T>(key);
  }
  
  // Mettre à jour une session
  async updateSession(
    sessionId: string, 
    data: any, 
    ttlSeconds?: number
  ): Promise<boolean> {
    const key = this.prefix + sessionId;
    const success = await this.cache.set(key, data, ttlSeconds);
    if (success && ttlSeconds) {
      await this.cache.expire(key, ttlSeconds);
    }
    return success;
  }
  
  // Supprimer une session
  async deleteSession(sessionId: string): Promise<boolean> {
    const key = this.prefix + sessionId;
    return await this.cache.del(key);
  }
  
  // Supprimer toutes les sessions d'un utilisateur
  async deleteUserSessions(_userId: string): Promise<number> {
    const pattern = this.prefix + '*';
    return await this.cache.delPattern(pattern);
  }
}

// ========================================
// FONCTIONS UTILITAIRES POUR LE RATE LIMITING
// ========================================

export class RateLimitService {
  private cache: CacheService;
  private prefix: string = 'ratelimit:';
  
  constructor(cache: CacheService) {
    this.cache = cache;
  }
  
  // Vérifier et incrémenter le rate limit
  async checkRateLimit(
    identifier: string,
    windowSeconds: number,
    maxRequests: number
  ): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    const key = this.prefix + identifier;
    const now = Date.now();
    const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds;
    const resetTime = (windowStart + windowSeconds) * 1000;
    
    try {
      const count = await this.cache.incrWithTTL(key, windowSeconds);
      const remaining = Math.max(0, maxRequests - count);
      
      return {
        allowed: count <= maxRequests,
        count,
        remaining,
        resetTime
      };
    } catch (error) {
      logger.error('Rate limit check error:', { identifier, error });
      // En cas d'erreur, autoriser la requête
      return {
        allowed: true,
        count: 0,
        remaining: maxRequests,
        resetTime
      };
    }
  }
}

// ========================================
// INSTANCES GLOBALES
// ========================================

let cacheService: CacheService | null = null;
let sessionService: SessionService | null = null;
let rateLimitService: RateLimitService | null = null;

export function getCacheService(): CacheService {
  if (!cacheService) {
    const client = getRedisClient();
    cacheService = new CacheService(client);
  }
  return cacheService;
}

export function getSessionService(): SessionService {
  if (!sessionService) {
    const cache = getCacheService();
    sessionService = new SessionService(cache);
  }
  return sessionService;
}

export function getRateLimitService(): RateLimitService {
  if (!rateLimitService) {
    const cache = getCacheService();
    rateLimitService = new RateLimitService(cache);
  }
  return rateLimitService;
}

// Fonction pour vérifier la santé de Redis
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details?: string;
  error?: string;
}> {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return {
      status: 'healthy',
      details: `Redis responded with: ${pong}`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  getCacheService,
  getSessionService,
  getRateLimitService,
  checkRedisHealth,
  CacheService,
  SessionService,
  RateLimitService
};
