import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '@/config/database';
import { getCacheService } from '@/config/redis';
import { logger } from '@/utils/logger';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';

// Interface pour les informations utilisateur
export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  isSuperAdmin: boolean;
  lastLoginAt?: Date;
  twoFactorEnabled: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

// Interface pour le payload JWT
interface JWTPayload {
  userId: string;
  email: string;
  companyId: string;
  roleId: string;
  isSuperAdmin: boolean;
  sessionId: string;
  iat: number;
  exp: number;
}

// Étendre l'interface Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: UserInfo;
      sessionId?: string;
    }
  }
}

// Cache pour les informations utilisateur
const userCache = new Map<string, { user: UserInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fonction pour récupérer les informations utilisateur
async function getUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    // Vérifier le cache en mémoire
    const cached = userCache.get(userId);
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }
    
    // Vérifier le cache Redis
    const cacheService = getCacheService();
    const cacheKey = `user:${userId}`;
    let user = await cacheService.get<UserInfo>(cacheKey);
    
    if (!user) {
      // Récupérer depuis la base de données avec les permissions
      const results = await query<any>(
        `SELECT 
          u.id, u.email, u.first_name as "firstName", u.last_name as "lastName",
          u.company_id as "companyId", u.role_id as "roleId", u.status,
          u.is_super_admin as "isSuperAdmin", u.last_login_at as "lastLoginAt",
          u.two_factor_enabled as "twoFactorEnabled", u.preferences,
          r.name as "roleName",
          COALESCE(
            json_agg(
              DISTINCT p.name
            ) FILTER (WHERE p.name IS NOT NULL), 
            '[]'::json
          ) as permissions
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE u.id = $1 AND u.status IN ('active', 'suspended')
         GROUP BY u.id, r.name`,
        [userId]
      );
      
      if (results.length === 0) {
        return null;
      }
      
      const userData = results[0];
      user = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        companyId: userData.companyId,
        roleId: userData.roleId,
        roleName: userData.roleName || 'User',
        permissions: userData.permissions || [],
        status: userData.status,
        isSuperAdmin: userData.isSuperAdmin || false,
        lastLoginAt: userData.lastLoginAt,
        twoFactorEnabled: userData.twoFactorEnabled || false,
        preferences: userData.preferences || {
          theme: 'system',
          language: 'fr',
          timezone: 'Europe/Paris',
          notifications: {
            email: true,
            push: true,
            sms: false,
          }
        }
      };
      
      // Mettre en cache dans Redis (15 minutes)
      await cacheService.set(cacheKey, user, 15 * 60);
    }
    
    // Mettre en cache en mémoire
    userCache.set(userId, {
      user,
      expiry: Date.now() + CACHE_TTL
    });
    
    return user;
    
  } catch (error) {
    logger.error('Error fetching user info:', {
      userId,
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
}

// Fonction pour invalider le cache utilisateur
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    // Supprimer du cache en mémoire
    userCache.delete(userId);
    
    // Supprimer du cache Redis
    const cacheService = getCacheService();
    await cacheService.del(`user:${userId}`);
    
    logger.debug('User cache invalidated', { userId });
  } catch (error) {
    logger.error('Error invalidating user cache:', {
      userId,
      error: error instanceof Error ? error.message : error
    });
  }
}

// Fonction pour vérifier si une session est valide
async function isSessionValid(sessionId: string, userId: string): Promise<boolean> {
  try {
    const cacheService = getCacheService();
    const sessionKey = `session:${sessionId}`;
    const session = await cacheService.get(sessionKey);
    
    return session && session.userId === userId;
  } catch (error) {
    logger.error('Error checking session validity:', {
      sessionId,
      userId,
      error: error instanceof Error ? error.message : error
    });
    return false;
  }
}

// Middleware principal d'authentification
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraire le token depuis les headers
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      throw new AuthenticationError('Authentication token required');
    }
    
    // Vérifier et décoder le JWT
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Vérifier la validité de la session
    const sessionValid = await isSessionValid(decoded.sessionId, decoded.userId);
    if (!sessionValid) {
      throw new AuthenticationError('Session expired or invalid');
    }
    
    // Récupérer les informations utilisateur
    const user = await getUserInfo(decoded.userId);
    
    if (!user) {
      throw new AuthenticationError('User not found or inactive');
    }
    
    // Vérifier le statut de l'utilisateur
    if (user.status === 'suspended') {
      throw new AuthorizationError('Account suspended');
    }
    
    if (user.status === 'inactive') {
      throw new AuthorizationError('Account inactive');
    }
    
    // Ajouter les informations utilisateur à la requête
    req.user = user;
    req.sessionId = decoded.sessionId;
    
    // Ajouter les headers de réponse
    res.set({
      'X-User-ID': user.id,
      'X-User-Role': user.roleName,
      'X-Company-ID': user.companyId,
    });
    
    logger.debug('Authentication successful', {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      roleName: user.roleName,
      path: req.path,
    });
    
    next();
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed:', {
        error: error.message,
        path: req.path,
        ip: req.ip,
      });
      next(new AuthenticationError('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired:', {
        path: req.path,
        ip: req.ip,
      });
      next(new AuthenticationError('Authentication token expired'));
    } else {
      logger.error('Authentication middleware error:', {
        error: error instanceof Error ? error.message : error,
        path: req.path,
        ip: req.ip,
      });
      next(error);
    }
  }
};

// Fonction pour extraire le token depuis la requête
function extractTokenFromRequest(req: Request): string | null {
  // 1. Header Authorization (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. Cookie (pour les requêtes web)
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }
  
  // 3. Query parameter (non recommandé, mais supporté)
  const queryToken = req.query['token'] as string;
  if (queryToken) {
    return queryToken;
  }
  
  return null;
}

// Middleware pour vérifier les permissions
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Les super admins ont toutes les permissions
      if (user.isSuperAdmin) {
        logger.debug('Super admin access granted', {
          userId: user.id,
          permission,
        });
        return next();
      }
      
      // Vérifier si l'utilisateur a la permission
      if (!user.permissions.includes(permission)) {
        logger.warn('Permission denied', {
          userId: user.id,
          email: user.email,
          requiredPermission: permission,
          userPermissions: user.permissions,
          path: req.path,
        });
        
        throw new AuthorizationError(`Permission '${permission}' required`);
      }
      
      logger.debug('Permission granted', {
        userId: user.id,
        permission,
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour vérifier plusieurs permissions (OR)
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Les super admins ont toutes les permissions
      if (user.isSuperAdmin) {
        return next();
      }
      
      // Vérifier si l'utilisateur a au moins une des permissions
      const hasPermission = permissions.some(permission => 
        user.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        logger.warn('Permissions denied', {
          userId: user.id,
          email: user.email,
          requiredPermissions: permissions,
          userPermissions: user.permissions,
          path: req.path,
        });
        
        throw new AuthorizationError(`One of these permissions required: ${permissions.join(', ')}`);
      }
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour vérifier toutes les permissions (AND)
export const requireAllPermissions = (permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Les super admins ont toutes les permissions
      if (user.isSuperAdmin) {
        return next();
      }
      
      // Vérifier si l'utilisateur a toutes les permissions
      const hasAllPermissions = permissions.every(permission => 
        user.permissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !user.permissions.includes(permission)
        );
        
        logger.warn('Permissions denied', {
          userId: user.id,
          email: user.email,
          missingPermissions,
          path: req.path,
        });
        
        throw new AuthorizationError(`Missing permissions: ${missingPermissions.join(', ')}`);
      }
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour vérifier le rôle
export const requireRole = (roleName: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Les super admins ont accès à tout
      if (user.isSuperAdmin) {
        return next();
      }
      
      if (user.roleName !== roleName) {
        logger.warn('Role access denied', {
          userId: user.id,
          email: user.email,
          requiredRole: roleName,
          userRole: user.roleName,
          path: req.path,
        });
        
        throw new AuthorizationError(`Role '${roleName}' required`);
      }
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// Middleware pour les super admins uniquement
export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const user = req.user;
    
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (!user.isSuperAdmin) {
      logger.warn('Super admin access denied', {
        userId: user.id,
        email: user.email,
        path: req.path,
      });
      
      throw new AuthorizationError('Super admin access required');
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

// Middleware optionnel (n'échoue pas si pas d'auth)
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (token) {
      const jwtSecret = process.env['JWT_SECRET'];
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const sessionValid = await isSessionValid(decoded.sessionId, decoded.userId);
        
        if (sessionValid) {
          const user = await getUserInfo(decoded.userId);
          if (user && user.status === 'active') {
            req.user = user;
            req.sessionId = decoded.sessionId;
          }
        }
      }
    }
    
    next();
    
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    logger.debug('Optional auth failed, continuing without auth:', {
      error: error instanceof Error ? error.message : error,
      path: req.path,
    });
    next();
  }
};

export default {
  authMiddleware,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireSuperAdmin,
  optionalAuth,
  invalidateUserCache,
};
