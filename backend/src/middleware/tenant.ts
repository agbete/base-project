import { Request, Response, NextFunction } from 'express';
import { query, configureRLSSession, getPool } from '@/config/database';
import { getCacheService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/middleware/errorHandler';

// Interface pour les informations de tenant
export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  settings: {
    branding: {
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
      companyName: string;
    };
    activeServices: string[];
    quotas: {
      maxUsers: number;
      maxStorage: string;
      maxApiCalls: number;
    };
    regional: {
      timezone: string;
      currency: string;
      locale: string;
      dateFormat: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Étendre l'interface Request pour inclure tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo;
      tenantId?: string;
    }
  }
}

// Cache pour les informations de tenant
const tenantCache = new Map<string, { tenant: TenantInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fonction pour récupérer les informations de tenant
async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  try {
    // Vérifier le cache en mémoire d'abord
    const cached = tenantCache.get(tenantId);
    if (cached && cached.expiry > Date.now()) {
      return cached.tenant;
    }
    
    // Vérifier le cache Redis
    const cacheService = getCacheService();
    const cacheKey = `tenant:${tenantId}`;
    let tenant = await cacheService.get<TenantInfo>(cacheKey);
    
    if (!tenant) {
      // Récupérer depuis la base de données
      const results = await query<TenantInfo>(
        `SELECT 
          id, name, slug, plan, status, settings, 
          created_at as "createdAt", updated_at as "updatedAt"
         FROM companies 
         WHERE id = $1 AND status = 'active'`,
        [tenantId]
      );
      
      if (results.length === 0) {
        return null;
      }
      
      tenant = results[0];
      
      // Mettre en cache dans Redis (30 minutes)
      await cacheService.set(cacheKey, tenant, 30 * 60);
    }
    
    // Mettre en cache en mémoire
    tenantCache.set(tenantId, {
      tenant,
      expiry: Date.now() + CACHE_TTL
    });
    
    return tenant;
    
  } catch (error) {
    logger.error('Error fetching tenant info:', {
      tenantId,
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
}

// Fonction pour invalider le cache de tenant
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  try {
    // Supprimer du cache en mémoire
    tenantCache.delete(tenantId);
    
    // Supprimer du cache Redis
    const cacheService = getCacheService();
    await cacheService.del(`tenant:${tenantId}`);
    
    logger.debug('Tenant cache invalidated', { tenantId });
  } catch (error) {
    logger.error('Error invalidating tenant cache:', {
      tenantId,
      error: error instanceof Error ? error.message : error
    });
  }
}

// Middleware principal de tenant
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Récupérer l'ID du tenant depuis différentes sources
    let tenantId = getTenantIdFromRequest(req);
    
    if (!tenantId) {
      // Si pas de tenant spécifié, utiliser le tenant de l'utilisateur connecté
      const user = (req as any).user;
      if (user && user.companyId) {
        tenantId = user.companyId;
      }
    }
    
    if (!tenantId) {
      throw new AuthenticationError('Tenant ID required');
    }
    
    // Récupérer les informations du tenant
    const tenant = await getTenantInfo(tenantId);
    
    if (!tenant) {
      throw new NotFoundError('Tenant not found or inactive');
    }
    
    // Vérifier le statut du tenant
    if (tenant.status !== 'active') {
      throw new AuthorizationError(`Tenant is ${tenant.status}`);
    }
    
    // Ajouter les informations du tenant à la requête
    req.tenant = tenant;
    req.tenantId = tenantId;
    
    // Configurer Row Level Security (RLS) pour PostgreSQL
    await configureTenantRLS(req, tenantId);
    
    // Ajouter les headers de réponse
    res.set({
      'X-Tenant-ID': tenantId,
      'X-Tenant-Name': tenant.name,
      'X-Tenant-Plan': tenant.plan,
    });
    
    logger.debug('Tenant middleware configured', {
      tenantId,
      tenantName: tenant.name,
      plan: tenant.plan,
      userId: (req as any).user?.id,
    });
    
    next();
    
  } catch (error) {
    logger.error('Tenant middleware error:', {
      error: error instanceof Error ? error.message : error,
      path: req.path,
      method: req.method,
      headers: {
        'x-tenant-id': req.headers['x-tenant-id'],
        'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
      }
    });
    
    next(error);
  }
};

// Fonction pour extraire l'ID du tenant depuis la requête
function getTenantIdFromRequest(req: Request): string | null {
  // 1. Header X-Tenant-ID
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }
  
  // 2. Query parameter
  const queryTenantId = req.query.tenantId as string;
  if (queryTenantId) {
    return queryTenantId;
  }
  
  // 3. Sous-domaine (ex: tenant1.app.com)
  const host = req.headers.host;
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  // 4. Path parameter (ex: /api/tenants/:tenantId/...)
  const pathTenantId = req.params.tenantId;
  if (pathTenantId) {
    return pathTenantId;
  }
  
  return null;
}

// Fonction pour configurer RLS
async function configureTenantRLS(req: Request, tenantId: string): Promise<void> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Configurer le tenant courant pour RLS
      await configureRLSSession(client, tenantId, (req as any).user?.id);
      
      // Stocker le client dans la requête pour réutilisation
      (req as any).dbClient = client;
      
    } catch (error) {
      client.release();
      throw error;
    }
    
  } catch (error) {
    logger.error('Error configuring tenant RLS:', {
      tenantId,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

// Middleware pour vérifier les permissions de service
export const requireService = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tenant = req.tenant;
      
      if (!tenant) {
        throw new AuthenticationError('Tenant required');
      }
      
      const activeServices = tenant.settings.activeServices || [];
      
      if (!activeServices.includes(serviceName)) {
        throw new AuthorizationError(`Service '${serviceName}' not activated for this tenant`);
      }
      
      logger.debug('Service access granted', {
        tenantId: tenant.id,
        serviceName,
        userId: (req as any).user?.id,
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour vérifier les quotas
export const checkQuota = (quotaType: 'users' | 'storage' | 'apiCalls') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = req.tenant;
      
      if (!tenant) {
        throw new AuthenticationError('Tenant required');
      }
      
      const quotas = tenant.settings.quotas;
      let currentUsage = 0;
      let maxAllowed = 0;
      
      switch (quotaType) {
        case 'users':
          // Compter les utilisateurs actifs
          const userCount = await query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND status = $2',
            [tenant.id, 'active']
          );
          currentUsage = parseInt(userCount[0]?.count || '0');
          maxAllowed = quotas.maxUsers;
          break;
          
        case 'storage':
          // Vérifier l'utilisation du stockage (à implémenter selon vos besoins)
          maxAllowed = parseInt(quotas.maxStorage.replace(/\D/g, ''));
          break;
          
        case 'apiCalls':
          // Vérifier les appels API du mois (via Redis)
          const cacheService = getCacheService();
          const apiCallsKey = `quota:api:${tenant.id}:${new Date().getMonth()}`;
          currentUsage = await cacheService.get(apiCallsKey) || 0;
          maxAllowed = quotas.maxApiCalls;
          break;
      }
      
      if (currentUsage >= maxAllowed) {
        logger.warn('Quota exceeded', {
          tenantId: tenant.id,
          quotaType,
          currentUsage,
          maxAllowed,
        });
        
        throw new AuthorizationError(`${quotaType} quota exceeded (${currentUsage}/${maxAllowed})`);
      }
      
      // Ajouter les informations de quota aux headers
      res.set({
        [`X-Quota-${quotaType}-Used`]: currentUsage.toString(),
        [`X-Quota-${quotaType}-Limit`]: maxAllowed.toString(),
        [`X-Quota-${quotaType}-Remaining`]: (maxAllowed - currentUsage).toString(),
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour les super admins (accès multi-tenant)
export const superAdminTenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.isSuperAdmin) {
      throw new AuthorizationError('Super admin access required');
    }
    
    // Pour les super admins, permettre l'accès à n'importe quel tenant
    const tenantId = getTenantIdFromRequest(req);
    
    if (tenantId) {
      const tenant = await getTenantInfo(tenantId);
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenantId;
        
        // Configurer RLS pour le tenant spécifié
        await configureTenantRLS(req, tenantId);
        
        res.set({
          'X-Tenant-ID': tenantId,
          'X-Tenant-Name': tenant.name,
          'X-Super-Admin': 'true',
        });
      }
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

// Fonction utilitaire pour nettoyer les connexions DB
export const cleanupTenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Nettoyer la connexion DB si elle existe
  const client = (req as any).dbClient;
  if (client) {
    client.release();
    delete (req as any).dbClient;
  }
  
  next();
};

export default {
  tenantMiddleware,
  requireService,
  checkQuota,
  superAdminTenantMiddleware,
  cleanupTenantMiddleware,
  invalidateTenantCache,
};

