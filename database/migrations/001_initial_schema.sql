-- ========================================
-- MIGRATION 001: SCHÉMA INITIAL
-- ========================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLE: companies (entreprises)
-- ========================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_plan ON companies(plan);
CREATE INDEX idx_companies_created_at ON companies(created_at);

-- ========================================
-- TABLE: permissions (permissions système)
-- ========================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    service VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches par service/ressource/action
CREATE INDEX idx_permissions_service ON permissions(service);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_service_resource ON permissions(service, resource);

-- ========================================
-- TABLE: roles (rôles)
-- ========================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    
    -- Contrainte unique : nom unique par entreprise (ou système)
    CONSTRAINT unique_role_name_per_company UNIQUE (name, company_id)
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_is_system ON roles(is_system);
CREATE INDEX idx_roles_name ON roles(name);

-- ========================================
-- TABLE: role_permissions (association rôles-permissions)
-- ========================================

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (role_id, permission_id)
);

-- Index pour les recherches inverses
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ========================================
-- TABLE: users (utilisateurs)
-- ========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_super_admin BOOLEAN DEFAULT FALSE,
    
    -- Authentification à deux facteurs
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    
    -- Gestion des tentatives de connexion
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Réinitialisation de mot de passe
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Préférences utilisateur
    preferences JSONB DEFAULT '{}',
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

-- Index pour les recherches fréquentes et RLS
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS sur les tables multi-tenant
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Créer un rôle pour l'application
CREATE ROLE app_role;

-- Politique RLS pour users : isolation par company_id
CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO app_role
    USING (company_id = current_setting('app.current_tenant', true)::uuid);

-- Politique RLS pour roles : isolation par company_id ou rôles système
CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL TO app_role
    USING (
        company_id = current_setting('app.current_tenant', true)::uuid 
        OR is_system = true
    );

-- ========================================
-- FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FONCTION POUR CONFIGURER RLS
-- ========================================

CREATE OR REPLACE FUNCTION configure_rls_session(tenant_id UUID, user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Définir le tenant courant
    PERFORM set_config('app.current_tenant', tenant_id::text, true);
    
    -- Définir l'utilisateur courant si fourni
    IF user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user', user_id::text, true);
    END IF;
    
    -- Définir le rôle de l'application
    SET ROLE app_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMMENTAIRES
-- ========================================

COMMENT ON TABLE companies IS 'Table des entreprises/tenants';
COMMENT ON TABLE permissions IS 'Permissions système disponibles';
COMMENT ON TABLE roles IS 'Rôles utilisateur par entreprise';
COMMENT ON TABLE role_permissions IS 'Association entre rôles et permissions';
COMMENT ON TABLE users IS 'Utilisateurs du système';

COMMENT ON COLUMN companies.slug IS 'Identifiant unique URL-friendly';
COMMENT ON COLUMN companies.plan IS 'Plan tarifaire de l''entreprise';
COMMENT ON COLUMN companies.settings IS 'Configuration JSON de l''entreprise';

COMMENT ON COLUMN permissions.name IS 'Nom unique de la permission (ex: users.create)';
COMMENT ON COLUMN permissions.service IS 'Service concerné (ex: users, crm)';
COMMENT ON COLUMN permissions.resource IS 'Ressource concernée (ex: users, clients)';
COMMENT ON COLUMN permissions.action IS 'Action autorisée (create, read, update, delete)';

COMMENT ON COLUMN roles.is_system IS 'Rôle système (partagé entre toutes les entreprises)';

COMMENT ON COLUMN users.company_id IS 'Entreprise de rattachement (tenant)';
COMMENT ON COLUMN users.two_factor_secret IS 'Secret TOTP pour l''authentification 2FA';
COMMENT ON COLUMN users.preferences IS 'Préférences utilisateur en JSON';

-- Migration terminée
INSERT INTO schema_migrations (version, applied_at) VALUES ('001', NOW())
ON CONFLICT (version) DO NOTHING;

