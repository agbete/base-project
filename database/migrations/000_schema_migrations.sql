-- ========================================
-- TABLE DE SUIVI DES MIGRATIONS
-- ========================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE schema_migrations IS 'Suivi des migrations de base de données appliquées';

