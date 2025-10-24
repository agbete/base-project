import winston from 'winston';
import path from 'path';

// Configuration des niveaux de log personnalisés
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Ajouter les couleurs personnalisées
winston.addColors(customLevels.colors);

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Format pour la console (plus lisible en développement)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Configuration des transports
const transports: winston.transport[] = [];

// Transport console (toujours actif en développement)
if (process.env['NODE_ENV'] !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env['LOG_LEVEL'] || 'debug',
    })
  );
}

// Transport fichier pour la production
if (process.env['NODE_ENV'] === 'production' || process.env['LOG_FILE']) {
  const logDir = process.env['LOG_DIR'] || './logs';
  const logFile = process.env['LOG_FILE'] || path.join(logDir, 'app.log');
  
  transports.push(
    new winston.transports.File({
      filename: logFile,
      format: customFormat,
      level: process.env['LOG_LEVEL'] || 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
  
  // Fichier séparé pour les erreurs
  transports.push(
    new winston.transports.File({
      filename: path.join(path.dirname(logFile), 'error.log'),
      format: customFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// Créer le logger
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env['LOG_LEVEL'] || (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug'),
  format: customFormat,
  transports,
  // Ne pas quitter le processus en cas d'erreur de log
  exitOnError: false,
  // Gérer les exceptions non capturées
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // Gérer les rejections non capturées
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

// Logger pour les requêtes HTTP
export function logRequest(req: any, res: any, responseTime?: number) {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  
  const logData = {
    method,
    url,
    ip,
    statusCode,
    userAgent: headers['user-agent'],
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    tenantId: headers['x-tenant-id'],
    userId: req.user?.id,
  };
  
  const level = statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, `${method} ${url} ${statusCode}`, logData);
}

// Logger pour les erreurs de base de données
export function logDatabaseError(error: any, query?: string, params?: any[]) {
  logger.error('Database error', {
    error: error.message,
    stack: error.stack,
    query: query?.substring(0, 200) + (query && query.length > 200 ? '...' : ''),
    params,
    code: error.code,
    detail: error.detail,
    hint: error.hint,
  });
}

// Logger pour les erreurs d'authentification
export function logAuthError(error: any, context?: any) {
  logger.warn('Authentication error', {
    error: error.message,
    context,
    timestamp: new Date().toISOString(),
  });
}

// Logger pour les tentatives de connexion
export function logLoginAttempt(email: string, success: boolean, ip?: string, reason?: string) {
  const level = success ? 'info' : 'warn';
  const message = success ? 'Login successful' : 'Login failed';
  
  logger.log(level, message, {
    email,
    success,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  });
}

// Logger pour les actions sensibles
export function logSecurityEvent(event: string, details: any) {
  logger.warn(`Security event: ${event}`, {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
}

// Logger pour les performances
export function logPerformance(operation: string, duration: number, details?: any) {
  const level = duration > 1000 ? 'warn' : 'debug';
  
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    details,
  });
}

// Logger pour les tâches en arrière-plan
export function logJobEvent(jobName: string, status: 'started' | 'completed' | 'failed', details?: any) {
  const level = status === 'failed' ? 'error' : 'info';
  
  logger.log(level, `Job ${status}: ${jobName}`, {
    jobName,
    status,
    details,
    timestamp: new Date().toISOString(),
  });
}

// ========================================
// MIDDLEWARE POUR EXPRESS
// ========================================

export function createLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Intercepter la fin de la réponse
    const originalSend = res.send;
    res.send = function(body: any) {
      const responseTime = Date.now() - start;
      logRequest(req, res, responseTime);
      return originalSend.call(this, body);
    };
    
    next();
  };
}

// ========================================
// CONFIGURATION POUR LES TESTS
// ========================================

// Désactiver les logs pendant les tests
if (process.env['NODE_ENV'] === 'test') {
  logger.transports.forEach((transport) => {
    transport.silent = true;
  });
}

// ========================================
// GESTION DES ERREURS DE WINSTON
// ========================================

logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// ========================================
// EXPORT PAR DÉFAUT
// ========================================

export default {
  logger,
  logRequest,
  logDatabaseError,
  logAuthError,
  logLoginAttempt,
  logSecurityEvent,
  logPerformance,
  logJobEvent,
  createLoggerMiddleware,
};
