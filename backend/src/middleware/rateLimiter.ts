import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRateLimitService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { RateLimitError } from '@/middleware/errorHandler';

// Interface pour les options de rate limiting
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// Rate limiter global par défaut
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // 100 requêtes par fenêtre
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true, // Retourner les headers `RateLimit-*`
  legacyHeaders: false, // Désactiver les headers `X-RateLimit-*`
  
  // Fonction pour générer la clé de rate limiting
  keyGenerator: (req: Request): string => {
    // Utiliser l'IP + User-Agent pour une identification plus précise
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  },
  
  // Fonction appelée quand la limite est dépassée
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    logger.warn('Rate limit exceeded', {
      ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    throw new RateLimitError('Too many requests, please try again later');
  },
  
  // Skip certaines requêtes
  skip: (req: Request) => {
    // Skip les requêtes de health check
    if (req.path === '/health' || req.path === '/health/detailed') {
      return true;
    }
    
    // Skip les requêtes des IPs en whitelist (si configuré)
    const whitelist = process.env['RATE_LIMIT_WHITELIST']?.split(',') || [];
    const ip = req.ip || '';
    return whitelist.includes(ip);
  }
});

// Rate limiter strict pour l'authentification
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives de connexion par IP
  message: {
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    const ip = req.ip || 'unknown';
    const email = req.body?.email || 'unknown';
    return `auth:${ip}:${email}`;
  },
  
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    const email = req.body?.email || 'unknown';
    
    logger.warn('Authentication rate limit exceeded', {
      ip,
      email,
      path: req.path,
      method: req.method,
    });
    
    throw new RateLimitError('Too many authentication attempts, please try again later');
  }
});

// Rate limiter pour les API sensibles
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requêtes par minute
  message: {
    error: {
      message: 'API rate limit exceeded, please slow down',
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    // Utiliser l'ID utilisateur si disponible, sinon l'IP
    const userId = (req as any).user?.id;
    const ip = req.ip || 'unknown';
    return userId ? `api:user:${userId}` : `api:ip:${ip}`;
  }
});

// Rate limiter par entreprise (tenant)
export const createTenantRateLimiter = (options: RateLimitOptions) => {
  return rateLimit({
    ...options,
    keyGenerator: (req: Request): string => {
      const tenantId = (req as any).tenant?.id || 'unknown';
      const userId = (req as any).user?.id || 'unknown';
      return `tenant:${tenantId}:user:${userId}`;
    },
    
    handler: (req: Request, res: Response) => {
      const tenantId = (req as any).tenant?.id || 'unknown';
      const userId = (req as any).user?.id || 'unknown';
      
      logger.warn('Tenant rate limit exceeded', {
        tenantId,
        userId,
        path: req.path,
        method: req.method,
      });
      
      throw new RateLimitError(options.message || 'Tenant rate limit exceeded');
    }
  });
};

// Rate limiter avancé avec Redis
export const createRedisRateLimiter = (
  identifier: string,
  windowSeconds: number,
  maxRequests: number
) => {
  return async (req: Request, res: Response, next: any) => {
    try {
      const rateLimitService = getRateLimitService();
      const key = `${identifier}:${req.ip}`;
      
      const result = await rateLimitService.checkRateLimit(
        key,
        windowSeconds,
        maxRequests
      );
      
      // Ajouter les headers de rate limiting
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });
      
      if (!result.allowed) {
        logger.warn('Redis rate limit exceeded', {
          identifier,
          ip: req.ip,
          count: result.count,
          limit: maxRequests,
        });
        
        throw new RateLimitError('Rate limit exceeded');
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // En cas d'erreur Redis, laisser passer (fail-open)
      logger.error('Redis rate limiter error:', error);
      next();
    }
  };
};

// Middleware pour rate limiting par plan tarifaire
export const createPlanBasedRateLimiter = () => {
  return async (req: Request, res: Response, next: any) => {
    try {
      const tenant = (req as any).tenant;
      if (!tenant) {
        return next();
      }
      
      // Définir les limites par plan
      const planLimits = {
        basic: { windowMs: 60000, max: 10 }, // 10 req/min
        professional: { windowMs: 60000, max: 50 }, // 50 req/min
        enterprise: { windowMs: 60000, max: 200 }, // 200 req/min
      };
      
      const plan = tenant.plan || 'basic';
      const limits = planLimits[plan as keyof typeof planLimits] || planLimits.basic;
      
      const rateLimitService = getRateLimitService();
      const key = `plan:${plan}:tenant:${tenant.id}`;
      
      const result = await rateLimitService.checkRateLimit(
        key,
        limits.windowMs / 1000,
        limits.max
      );
      
      res.set({
        'X-RateLimit-Plan': plan,
        'X-RateLimit-Limit': limits.max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
      });
      
      if (!result.allowed) {
        logger.warn('Plan-based rate limit exceeded', {
          plan,
          tenantId: tenant.id,
          count: result.count,
          limit: limits.max,
        });
        
        throw new RateLimitError(`${plan} plan rate limit exceeded`);
      }
      
      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      logger.error('Plan-based rate limiter error:', error);
      next();
    }
  };
};

// Export des middlewares
export default {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter,
  createTenantRateLimiter,
  createRedisRateLimiter,
  createPlanBasedRateLimiter,
};

