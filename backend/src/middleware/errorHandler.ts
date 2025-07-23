import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    // Maintenir la stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Erreurs prédéfinies communes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// ========================================
// GESTIONNAIRE D'ERREURS PRINCIPAL
// ========================================

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Si la réponse a déjà été envoyée, passer au gestionnaire par défaut
  if (res.headersSent) {
    return next(error);
  }

  // Déterminer le code de statut
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Préparer la réponse d'erreur
  const errorResponse: any = {
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  // Ajouter des détails en développement
  if (process.env['NODE_ENV'] === 'development') {
    errorResponse.error.stack = error.stack;
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Ajouter l'ID de requête si disponible
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }

  // Logger l'erreur
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  const logMessage = `${req.method} ${req.path} - ${error.message}`;
  
  logger.log(logLevel, logMessage, {
    statusCode,
    code: error.code,
    stack: error.stack,
    details: error.details,
    userId: (req as any).user?.id,
    tenantId: (req as any).tenant?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    isOperational,
  });

  // Envoyer la réponse d'erreur
  res.status(statusCode).json(errorResponse);
}

// ========================================
// GESTIONNAIRE D'ERREURS ASYNC
// ========================================

export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ========================================
// GESTIONNAIRE D'ERREURS SPÉCIFIQUES
// ========================================

// Gestionnaire pour les erreurs de validation Joi
export function handleJoiError(error: any): ValidationError {
  const details = error.details?.map((detail: any) => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));

  return new ValidationError('Validation failed', details);
}

// Gestionnaire pour les erreurs PostgreSQL
export function handleDatabaseError(error: any): AppError {
  const { code, detail, hint, constraint } = error;

  switch (code) {
    case '23505': // Violation de contrainte unique
      return new ConflictError('Resource already exists', {
        constraint,
        detail,
      });

    case '23503': // Violation de clé étrangère
      return new ValidationError('Referenced resource does not exist', {
        constraint,
        detail,
      });

    case '23502': // Violation de contrainte NOT NULL
      return new ValidationError('Required field is missing', {
        constraint,
        detail,
      });

    case '23514': // Violation de contrainte CHECK
      return new ValidationError('Invalid field value', {
        constraint,
        detail,
        hint,
      });

    case '42P01': // Table inexistante
      return new AppError('Database schema error', 500, 'SCHEMA_ERROR', {
        detail,
      });

    case '42703': // Colonne inexistante
      return new AppError('Database schema error', 500, 'SCHEMA_ERROR', {
        detail,
      });

    case '08006': // Connexion fermée
    case '08003': // Connexion inexistante
      return new AppError('Database connection error', 503, 'DATABASE_CONNECTION_ERROR');

    case '57014': // Timeout de requête
      return new AppError('Database query timeout', 504, 'DATABASE_TIMEOUT');

    default:
      return new DatabaseError('Database operation failed', {
        code,
        detail,
        hint,
      });
  }
}

// Gestionnaire pour les erreurs JWT
export function handleJWTError(error: any): AuthenticationError {
  switch (error.name) {
    case 'TokenExpiredError':
      return new AuthenticationError('Token expired');
    case 'JsonWebTokenError':
      return new AuthenticationError('Invalid token');
    case 'NotBeforeError':
      return new AuthenticationError('Token not active');
    default:
      return new AuthenticationError('Token validation failed');
  }
}

// ========================================
// MIDDLEWARE DE GESTION D'ERREURS GLOBALES
// ========================================

export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let processedError: AppError;

  // Traiter les différents types d'erreurs
  if (error.isJoi) {
    processedError = handleJoiError(error);
  } else if (error.name?.includes('JWT') || error.name?.includes('Token')) {
    processedError = handleJWTError(error);
  } else if (error.code && typeof error.code === 'string' && error.code.match(/^\d{5}$/)) {
    // Erreur PostgreSQL (code à 5 chiffres)
    processedError = handleDatabaseError(error);
  } else if (error instanceof AppError) {
    processedError = error;
  } else {
    // Erreur inconnue
    processedError = new AppError(
      process.env['NODE_ENV'] === 'production' 
        ? 'Internal server error' 
        : error.message || 'Unknown error',
      500,
      'INTERNAL_ERROR',
      process.env['NODE_ENV'] === 'development' ? { originalError: error } : undefined
    );
  }

  errorHandler(processedError, req, res, next);
}

// ========================================
// MIDDLEWARE POUR LES ROUTES NON TROUVÉES
// ========================================

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
}

// ========================================
// UTILITAIRES
// ========================================

// Créer une erreur avec contexte
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError {
  return new AppError(message, statusCode, code, details);
}

// Vérifier si une erreur est opérationnelle
export function isOperationalError(error: any): boolean {
  return error instanceof AppError && error.isOperational;
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  isOperationalError,
  handleJoiError,
  handleDatabaseError,
  handleJWTError,
};
