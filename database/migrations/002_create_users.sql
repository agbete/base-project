-- Migration 002: Création de la table des utilisateurs avec Row Level Security (RLS)

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Informations personnelles
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    
    -- Authentification 2FA
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    two_factor_backup_codes TEXT[], -- Array de codes de sauvegarde
    
    -- Sécurité
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,
    
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Tentatives de connexion
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Préférences utilisateur
    locale VARCHAR(10) DEFAULT 'fr-FR',
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    
    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    is_super_admin BOOLEAN DEFAULT FALSE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Contraintes
    UNIQUE(company_id, email)
);

-- Index pour les performances et la sécurité
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_email ON users(company_id, email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- Trigger pour updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour valider l'email
CREATE OR REPLACE FUNCTION validate_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Validation basique de l'email
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Format d''email invalide';
    END IF;
    
    -- Convertir l'email en minuscules
    NEW.email := LOWER(NEW.email);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour valider l'email
CREATE TRIGGER validate_user_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_email();

-- Fonction pour gérer les tentatives de connexion échouées
CREATE OR REPLACE FUNCTION handle_failed_login(user_email TEXT, user_company_id UUID)
RETURNS VOID AS $$
DECLARE
    max_attempts INTEGER := 5;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE 
            WHEN failed_login_attempts + 1 >= max_attempts 
            THEN NOW() + lockout_duration 
            ELSE locked_until 
        END
    WHERE email = user_email AND company_id = user_company_id;
END;
$$ language 'plpgsql';

-- Fonction pour réinitialiser les tentatives de connexion
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(user_email TEXT, user_company_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        last_login_ip = inet_client_addr()
    WHERE email = user_email AND company_id = user_company_id;
END;
$$ language 'plpgsql';

-- ========================================
-- CONFIGURATION ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Créer un rôle pour l'application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role;
    END IF;
END
$$;

-- Accorder les permissions nécessaires au rôle app_role
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_role;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO app_role;

-- Politique RLS : Les utilisateurs ne peuvent voir que les données de leur entreprise
CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO app_role
    USING (company_id = current_setting('app.current_tenant')::uuid);

-- Politique RLS pour les super admins : ils peuvent voir toutes les entreprises
CREATE POLICY super_admin_access_users ON users
    FOR ALL TO app_role
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = current_setting('app.current_user')::uuid 
            AND u.is_super_admin = TRUE
        )
    );

-- Fonction pour définir le tenant courant
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::text, true);
END;
$$ language 'plpgsql';

-- Fonction pour définir l'utilisateur courant
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user', user_id::text, true);
END;
$$ language 'plpgsql';

-- Fonction pour obtenir le tenant courant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ language 'plpgsql';

-- Fonction pour obtenir l'utilisateur courant
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ language 'plpgsql';

-- Vue pour les utilisateurs avec informations de l'entreprise
CREATE VIEW users_with_company AS
SELECT 
    u.*,
    c.name as company_name,
    c.slug as company_slug,
    c.plan as company_plan,
    c.status as company_status
FROM users u
JOIN companies c ON u.company_id = c.id;

-- Accorder les permissions sur la vue
GRANT SELECT ON users_with_company TO app_role;

-- Commentaires pour la documentation
COMMENT ON TABLE users IS 'Table des utilisateurs avec isolation multi-tenant via RLS';
COMMENT ON COLUMN users.company_id IS 'Référence vers l''entreprise (tenant) - obligatoire pour RLS';
COMMENT ON COLUMN users.two_factor_secret IS 'Secret TOTP pour l''authentification 2FA';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Codes de sauvegarde pour 2FA (chiffrés)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Nombre de tentatives de connexion échouées';
COMMENT ON COLUMN users.locked_until IS 'Date jusqu''à laquelle le compte est verrouillé';
COMMENT ON COLUMN users.is_super_admin IS 'Super administrateur pouvant accéder à toutes les entreprises';

-- Fonction utilitaire pour créer un utilisateur avec mot de passe haché
CREATE OR REPLACE FUNCTION create_user_with_password(
    p_company_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
    password_hash TEXT;
BEGIN
    -- Hacher le mot de passe (sera fait côté application avec bcrypt)
    password_hash := crypt(p_password, gen_salt('bf', 12));
    
    INSERT INTO users (
        company_id, email, password_hash, first_name, last_name, is_super_admin
    ) VALUES (
        p_company_id, p_email, password_hash, p_first_name, p_last_name, p_is_super_admin
    ) RETURNING id INTO user_id;
    
    RETURN user_id;
END;
$$ language 'plpgsql';

