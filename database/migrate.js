#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'saas_app',
  user: process.env.DB_USER || 'saas_user',
  password: process.env.DB_PASSWORD || 'saas_password',
};

// Migration tracking table
const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

class MigrationRunner {
  constructor() {
    this.client = new Client(dbConfig);
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to database');
      
      // Create migrations table if it doesn't exist
      await this.client.query(MIGRATIONS_TABLE);
      console.log('✅ Migrations table ready');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.client.end();
    console.log('✅ Disconnected from database');
  }

  async getExecutedMigrations() {
    const result = await this.client.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    return result.rows.map(row => row.filename);
  }

  async getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files;
  }

  async executeMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🔄 Executing migration: ${filename}`);
    
    try {
      // Start transaction
      await this.client.query('BEGIN');
      
      // Execute migration SQL
      await this.client.query(sql);
      
      // Record migration as executed
      await this.client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      // Commit transaction
      await this.client.query('COMMIT');
      
      console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
      // Rollback transaction
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('🚀 Starting database migrations...\n');
    
    await this.connect();
    
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      console.log(`✅ ${executedMigrations.length} migrations already executed\n`);
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('🎉 No pending migrations. Database is up to date!');
        return;
      }
      
      console.log(`📋 Pending migrations: ${pendingMigrations.length}\n`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('\n🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('\n💥 Migration process failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async rollback(steps = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)...\n`);
    
    await this.connect();
    
    try {
      const result = await this.client.query(
        'SELECT filename FROM migrations ORDER BY id DESC LIMIT $1',
        [steps]
      );
      
      if (result.rows.length === 0) {
        console.log('ℹ️  No migrations to rollback');
        return;
      }
      
      console.log('⚠️  WARNING: This will remove migration records from the database.');
      console.log('⚠️  Manual rollback of schema changes may be required.\n');
      
      for (const row of result.rows) {
        console.log(`🔄 Removing migration record: ${row.filename}`);
        await this.client.query(
          'DELETE FROM migrations WHERE filename = $1',
          [row.filename]
        );
        console.log(`✅ Removed: ${row.filename}`);
      }
      
      console.log('\n✅ Rollback completed');
      
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  async status() {
    console.log('📊 Migration Status\n');
    
    await this.connect();
    
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();
      
      console.log('Migration Files:');
      console.log('================');
      
      for (const file of migrationFiles) {
        const status = executedMigrations.includes(file) ? '✅ Executed' : '⏳ Pending';
        console.log(`${status} - ${file}`);
      }
      
      console.log(`\nSummary:`);
      console.log(`- Total migrations: ${migrationFiles.length}`);
      console.log(`- Executed: ${executedMigrations.length}`);
      console.log(`- Pending: ${migrationFiles.length - executedMigrations.length}`);
      
    } catch (error) {
      console.error('❌ Failed to get migration status:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const runner = new MigrationRunner();
  
  switch (command) {
    case 'run':
    case 'migrate':
      await runner.run();
      break;
      
    case 'rollback':
      const steps = parseInt(args[1]) || 1;
      await runner.rollback(steps);
      break;
      
    case 'status':
      await runner.status();
      break;
      
    case 'help':
      console.log(`
Database Migration Tool

Usage:
  node migrate.js [command] [options]

Commands:
  run, migrate    Execute pending migrations (default)
  rollback [n]    Rollback last n migrations (default: 1)
  status          Show migration status
  help            Show this help message

Examples:
  node migrate.js                # Run all pending migrations
  node migrate.js status          # Show migration status
  node migrate.js rollback        # Rollback last migration
  node migrate.js rollback 3      # Rollback last 3 migrations
      `);
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "node migrate.js help" for usage information');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationRunner;

