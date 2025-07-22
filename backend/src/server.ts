import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';

import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { tenantMiddleware } from '@/middleware/tenant';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';

// Routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import companyRoutes from '@/routes/companies';
import roleRoutes from '@/routes/roles';
import permissionRoutes from '@/routes/permissions';
import settingsRoutes from '@/routes/settings';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = parseInt(process.env['PORT'] || '3001');
const HOST = process.env['HOST'] || '0.0.0.0';

// ========================================
// CONFIGURATION MIDDLEWARE
// ========================================

// Sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Rate limiting global
app.use(rateLimiter);

// ========================================
// ROUTES DE SANTÉ
// ========================================

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'],
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

app.get('/health/detailed', async (_req, res) => {
  try {
    // Vérifier la base de données
    const dbStatus = await checkDatabaseHealth();
    
    // Vérifier Redis
    const redisStatus = await checkRedisHealth();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'],
      version: process.env['npm_package_version'] || '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
    
    const allHealthy = Object.values(health.services).every(service => service.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// ========================================
// ROUTES API
// ========================================

// Routes publiques (sans authentification)
app.use('/auth', authRoutes);

// Middleware d'authentification pour toutes les autres routes
app.use(authMiddleware);

// Middleware de tenant pour les routes protégées
app.use(tenantMiddleware);

// Routes protégées
app.use('/users', userRoutes);
app.use('/companies', companyRoutes);
app.use('/roles', roleRoutes);
app.use('/permissions', permissionRoutes);
app.use('/settings', settingsRoutes);

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// GESTION DES ERREURS
// ========================================

app.use(errorHandler);

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

async function checkDatabaseHealth() {
  try {
    const { pool } = await connectDatabase();
    await pool.query('SELECT 1 as health');
    return {
      status: 'healthy',
      responseTime: Date.now(),
      details: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkRedisHealth() {
  try {
    const redis = await connectRedis();
    await redis.ping();
    return {
      status: 'healthy',
      responseTime: Date.now(),
      details: 'Redis connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    };
  }
}

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================

async function startServer() {
  try {
    // Connexion à la base de données
    await connectDatabase();
    logger.info('✅ Database connected successfully');
    
    // Connexion à Redis
    await connectRedis();
    logger.info('✅ Redis connected successfully');
    
    // Démarrage du serveur
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📊 Health check available at http://${HOST}:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Gestion des signaux de fermeture
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

export default app;
