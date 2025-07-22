import { Pool, PoolClient } from 'pg';
import { logger } from '@/utils/logger';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: process.env.NODE_ENV === 'production',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
  
  // Configuration par variables d'environnement individuelles
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'saas_app',
    user: process.env.DB_USER || 'saas_user',
    password: process.env.DB_PASSWORD || 'saas_password',
    ssl: process.env.NODE_ENV === 'production',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  };
}

export async function connectDatabase(): Promise<{ pool: Pool }> {
  if (pool) {
    return { pool };
  }
  
  try {
    const config = getDatabaseConfig();
    
    pool = new Pool({
      ...config,
      // Configuration avancée pour la production
      statement_timeout: 30000, // 30 secondes
      query_timeout: 30000,
      application_name: 'saas-backend',
    });
    
    // Test de connexion
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established successfully');
    
    // Gestion des événements de la pool
    pool.on('connect', (client) => {
      logger.debug('New database client connected');
    });
    
    pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });
    
    pool.on('remove', (client) => {
      logger.debug('Database client removed from pool');
    });
    
    return { pool };
    
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
}

// Fonction utilitaire pour exécuter des requêtes avec gestion d'erreur
export async function query<T = any>(
  text: string, 
  params?: any[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result.rows;
  } catch (error) {
    logger.error('Database query error:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  } finally {
    client.release();
  }
}

// Fonction pour les transactions
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Fonction pour définir le tenant courant (RLS)
export async function setCurrentTenant(
  client: PoolClient, 
  tenantId: string
): Promise<void> {
  await client.query('SELECT set_current_tenant($1)', [tenantId]);
}

// Fonction pour définir l'utilisateur courant (RLS)
export async function setCurrentUser(
  client: PoolClient, 
  userId: string
): Promise<void> {
  await client.query('SELECT set_current_user($1)', [userId]);
}

// Fonction pour configurer la session RLS
export async function configureRLSSession(
  client: PoolClient,
  tenantId: string,
  userId?: string
): Promise<void> {
  await setCurrentTenant(client, tenantId);
  if (userId) {
    await setCurrentUser(client, userId);
  }
}

// Fonction utilitaire pour les requêtes avec RLS
export async function queryWithRLS<T = any>(
  text: string,
  params: any[],
  tenantId: string,
  userId?: string
): Promise<T[]> {
  return transaction(async (client) => {
    await configureRLSSession(client, tenantId, userId);
    const result = await client.query(text, params);
    return result.rows;
  });
}

// Fonction pour vérifier la santé de la base de données
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details?: string;
  error?: string;
}> {
  try {
    const result = await query('SELECT 1 as health, NOW() as timestamp');
    return {
      status: 'healthy',
      details: `Connected at ${result[0]?.timestamp}`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  connectDatabase,
  disconnectDatabase,
  getPool,
  query,
  transaction,
  setCurrentTenant,
  setCurrentUser,
  configureRLSSession,
  queryWithRLS,
  checkDatabaseHealth
};

