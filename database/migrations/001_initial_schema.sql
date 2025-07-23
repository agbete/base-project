-- ========================================
-- MIGRATION 001: Initial Schema Setup
-- Multi-tenant SaaS Application
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- COMPANIES TABLE (Tenant isolation)
-- ========================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    
    -- Branding settings
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#64748B',
    
    -- Regional settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    locale VARCHAR(10) DEFAULT 'en-US',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    
    -- Active services (JSON array)
    active_services JSONB DEFAULT '["auth", "users", "settings"]'::jsonb,
    
    -- Business rules and settings
    business_rules JSONB DEFAULT '{}'::jsonb,
    
    -- Subscription and limits
    plan_type VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 5,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT companies_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT companies_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Index for performance
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);

-- ========================================
-- USERS TABLE (Multi-tenant with RLS)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Basic info
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    
    -- Contact info
    phone VARCHAR(50),
    
    -- User preferences
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    timezone VARCHAR(50),
    
    -- 2FA settings
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    backup_codes TEXT[], -- Array of backup codes
    
    -- Status and permissions
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_company_admin BOOLEAN DEFAULT FALSE,
    
    -- Session management
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Password management
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Email verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_company_unique UNIQUE (email, company_id),
    CONSTRAINT users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Indexes for performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_activity ON users(last_activity_at);

-- ========================================
-- PERMISSIONS TABLE (System-wide)
-- ========================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Permission structure: service.resource.action
    service VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'list', 'manage')),
    
    -- Description and metadata
    name VARCHAR(255) NOT NULL, -- Human readable name
    description TEXT,
    
    -- Grouping and categorization
    category VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE, -- System permissions cannot be deleted
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT permissions_unique_permission UNIQUE (service, resource, action)
);

-- Index for performance
CREATE INDEX idx_permissions_service ON permissions(service);
CREATE INDEX idx_permissions_category ON permissions(category);

-- ========================================
-- ROLES TABLE (Company-specific)
-- ========================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Role info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#64748B',
    
    -- Role type
    is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    is_default BOOLEAN DEFAULT FALSE, -- Default role for new users
    
    -- Permissions (array of permission IDs)
    permission_ids UUID[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT roles_name_company_unique UNIQUE (name, company_id)
);

-- Index for performance
CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_is_default ON roles(is_default);

-- ========================================
-- USER_ROLES TABLE (Many-to-many)
-- ========================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
);

-- Index for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ========================================
-- SESSIONS TABLE (JWT and session management)
-- ========================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Session data
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    access_token_jti VARCHAR(100) NOT NULL, -- JWT ID for access token
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- ========================================
-- AUDIT_LOGS TABLE (Security and compliance)
-- ========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Request details
    method VARCHAR(10),
    endpoint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Data changes
    old_values JSONB,
    new_values JSONB,
    
    -- Status and result
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'error')),
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance and queries
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ========================================
-- SYSTEM_SETTINGS TABLE (Global settings)
-- ========================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Setting identification
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    
    -- Metadata
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by non-super-admins
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ========================================
-- COMPANY_SETTINGS TABLE (Company-specific settings)
-- ========================================
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Setting identification
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    description TEXT,
    category VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT company_settings_unique UNIQUE (company_id, key)
);

-- Index for performance
CREATE INDEX idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX idx_company_settings_key ON company_settings(key);

-- ========================================
-- CODE_GENERATORS TABLE (Auto-generated codes)
-- ========================================
CREATE TABLE code_generators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Generator configuration
    entity VARCHAR(50) NOT NULL, -- 'clients', 'invoices', etc.
    mode VARCHAR(20) DEFAULT 'auto' CHECK (mode IN ('manual', 'auto')),
    
    -- Pattern configuration
    prefix VARCHAR(10),
    sequence_type VARCHAR(20) DEFAULT 'chronological' CHECK (sequence_type IN ('chronological', 'random')),
    sequence_length INTEGER DEFAULT 6,
    suffix VARCHAR(20),
    
    -- Current state
    current_number INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT code_generators_unique UNIQUE (company_id, entity)
);

-- Index for performance
CREATE INDEX idx_code_generators_company_id ON code_generators(company_id);

-- ========================================
-- GENERATED_CODES TABLE (Track generated codes)
-- ========================================
CREATE TABLE generated_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    generator_id UUID NOT NULL REFERENCES code_generators(id) ON DELETE CASCADE,
    
    -- Code details
    entity VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    entity_id UUID, -- Reference to the actual entity
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT generated_codes_unique UNIQUE (company_id, entity, code)
);

-- Index for performance
CREATE INDEX idx_generated_codes_company_id ON generated_codes(company_id);
CREATE INDEX idx_generated_codes_entity ON generated_codes(entity);
CREATE INDEX idx_generated_codes_code ON generated_codes(code);

-- ========================================
-- RATE_LIMITS TABLE (Protection against noisy neighbors)
-- ========================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Limit configuration
    resource_type VARCHAR(50) NOT NULL, -- 'api_requests', 'db_queries', 'storage', etc.
    limit_value INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    
    -- Current usage
    current_usage INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT rate_limits_unique UNIQUE (company_id, resource_type)
);

-- Index for performance
CREATE INDEX idx_rate_limits_company_id ON rate_limits(company_id);
CREATE INDEX idx_rate_limits_resource_type ON rate_limits(resource_type);

-- ========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_code_generators_updated_at BEFORE UPDATE ON code_generators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

