-- Migration 003: Système de permissions granulaires avec format service.table.action

-- Table des permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Format: service.resource.action (ex: crm.clients.create)
    service VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'list', 'export', 'import')),
    
    -- Description et métadonnées
    name VARCHAR(255) NOT NULL, -- Nom affiché (ex: "Créer un client")
    description TEXT,
    category VARCHAR(100), -- Catégorie pour le groupement dans l'UI
    
    -- Système ou personnalisé
    is_system BOOLEAN DEFAULT TRUE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte d'unicité sur la combinaison service.resource.action
    UNIQUE(service, resource, action)
);

-- Table des rôles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Informations du rôle
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#64748B', -- Couleur pour l'affichage
    
    -- Système ou personnalisé
    is_system BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE, -- Rôle par défaut pour les nouveaux utilisateurs
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Contrainte d'unicité par entreprise
    UNIQUE(company_id, name)
);

-- Table de liaison rôles-permissions
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Contrainte d'unicité
    UNIQUE(role_id, permission_id)
);

-- Table de liaison utilisateurs-rôles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Contrainte d'unicité
    UNIQUE(user_id, role_id)
);

-- Index pour les performances
CREATE INDEX idx_permissions_service ON permissions(service);
CREATE INDEX idx_permissions_service_resource ON permissions(service, resource);
CREATE INDEX idx_permissions_category ON permissions(category);

CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_is_system ON roles(is_system);
CREATE INDEX idx_roles_is_default ON roles(is_default);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Triggers pour updated_at
CREATE TRIGGER update_permissions_updated_at 
    BEFORE UPDATE ON permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Activer RLS sur les tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Permissions ne nécessitent pas RLS car elles sont globales

-- Accorder les permissions au rôle app_role
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_permissions TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO app_role;

-- Politiques RLS pour les rôles
CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL TO app_role
    USING (company_id = current_setting('app.current_tenant')::uuid);

-- Politiques RLS pour role_permissions (via les rôles)
CREATE POLICY tenant_isolation_role_permissions ON role_permissions
    FOR ALL TO app_role
    USING (
        EXISTS (
            SELECT 1 FROM roles r 
            WHERE r.id = role_permissions.role_id 
            AND r.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- Politiques RLS pour user_roles (via les utilisateurs)
CREATE POLICY tenant_isolation_user_roles ON user_roles
    FOR ALL TO app_role
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_roles.user_id 
            AND u.company_id = current_setting('app.current_tenant')::uuid
        )
    );

-- ========================================
-- PERMISSIONS SYSTÈME PAR DÉFAUT
-- ========================================

-- Permissions pour le service AUTH
INSERT INTO permissions (service, resource, action, name, description, category) VALUES
('auth', 'users', 'create', 'Créer des utilisateurs', 'Permet de créer de nouveaux utilisateurs', 'Gestion des utilisateurs'),
('auth', 'users', 'read', 'Voir les utilisateurs', 'Permet de consulter la liste des utilisateurs', 'Gestion des utilisateurs'),
('auth', 'users', 'update', 'Modifier les utilisateurs', 'Permet de modifier les informations des utilisateurs', 'Gestion des utilisateurs'),
('auth', 'users', 'delete', 'Supprimer les utilisateurs', 'Permet de supprimer des utilisateurs', 'Gestion des utilisateurs'),
('auth', 'users', 'list', 'Lister les utilisateurs', 'Permet de voir la liste complète des utilisateurs', 'Gestion des utilisateurs'),

('auth', 'roles', 'create', 'Créer des rôles', 'Permet de créer de nouveaux rôles', 'Gestion des rôles'),
('auth', 'roles', 'read', 'Voir les rôles', 'Permet de consulter les rôles', 'Gestion des rôles'),
('auth', 'roles', 'update', 'Modifier les rôles', 'Permet de modifier les rôles', 'Gestion des rôles'),
('auth', 'roles', 'delete', 'Supprimer les rôles', 'Permet de supprimer des rôles', 'Gestion des rôles'),
('auth', 'roles', 'list', 'Lister les rôles', 'Permet de voir la liste des rôles', 'Gestion des rôles'),

('auth', 'permissions', 'read', 'Voir les permissions', 'Permet de consulter les permissions', 'Gestion des permissions'),
('auth', 'permissions', 'list', 'Lister les permissions', 'Permet de voir toutes les permissions', 'Gestion des permissions');

-- Permissions pour le service SETTINGS
INSERT INTO permissions (service, resource, action, name, description, category) VALUES
('settings', 'company', 'read', 'Voir les paramètres entreprise', 'Permet de consulter les paramètres de l''entreprise', 'Paramètres'),
('settings', 'company', 'update', 'Modifier les paramètres entreprise', 'Permet de modifier les paramètres de l''entreprise', 'Paramètres'),

('settings', 'user', 'read', 'Voir ses paramètres', 'Permet de consulter ses propres paramètres', 'Paramètres'),
('settings', 'user', 'update', 'Modifier ses paramètres', 'Permet de modifier ses propres paramètres', 'Paramètres'),

('settings', 'system', 'read', 'Voir les paramètres système', 'Permet de consulter les paramètres système (super admin)', 'Paramètres système'),
('settings', 'system', 'update', 'Modifier les paramètres système', 'Permet de modifier les paramètres système (super admin)', 'Paramètres système');

-- Permissions pour le service CRM (optionnel)
INSERT INTO permissions (service, resource, action, name, description, category) VALUES
('crm', 'clients', 'create', 'Créer des clients', 'Permet de créer de nouveaux clients', 'CRM - Clients'),
('crm', 'clients', 'read', 'Voir les clients', 'Permet de consulter les informations des clients', 'CRM - Clients'),
('crm', 'clients', 'update', 'Modifier les clients', 'Permet de modifier les informations des clients', 'CRM - Clients'),
('crm', 'clients', 'delete', 'Supprimer les clients', 'Permet de supprimer des clients', 'CRM - Clients'),
('crm', 'clients', 'list', 'Lister les clients', 'Permet de voir la liste des clients', 'CRM - Clients'),
('crm', 'clients', 'export', 'Exporter les clients', 'Permet d''exporter la liste des clients', 'CRM - Clients'),

('crm', 'prospects', 'create', 'Créer des prospects', 'Permet de créer de nouveaux prospects', 'CRM - Prospects'),
('crm', 'prospects', 'read', 'Voir les prospects', 'Permet de consulter les informations des prospects', 'CRM - Prospects'),
('crm', 'prospects', 'update', 'Modifier les prospects', 'Permet de modifier les informations des prospects', 'CRM - Prospects'),
('crm', 'prospects', 'delete', 'Supprimer les prospects', 'Permet de supprimer des prospects', 'CRM - Prospects'),
('crm', 'prospects', 'list', 'Lister les prospects', 'Permet de voir la liste des prospects', 'CRM - Prospects');

-- Permissions pour le service INVENTORY (optionnel)
INSERT INTO permissions (service, resource, action, name, description, category) VALUES
('inventory', 'products', 'create', 'Créer des produits', 'Permet de créer de nouveaux produits', 'Inventaire - Produits'),
('inventory', 'products', 'read', 'Voir les produits', 'Permet de consulter les informations des produits', 'Inventaire - Produits'),
('inventory', 'products', 'update', 'Modifier les produits', 'Permet de modifier les informations des produits', 'Inventaire - Produits'),
('inventory', 'products', 'delete', 'Supprimer les produits', 'Permet de supprimer des produits', 'Inventaire - Produits'),
('inventory', 'products', 'list', 'Lister les produits', 'Permet de voir la liste des produits', 'Inventaire - Produits'),

('inventory', 'stock', 'read', 'Voir les stocks', 'Permet de consulter les niveaux de stock', 'Inventaire - Stock'),
('inventory', 'stock', 'update', 'Modifier les stocks', 'Permet de modifier les niveaux de stock', 'Inventaire - Stock');

-- ========================================
-- FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour vérifier si un utilisateur a une permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_service TEXT,
    p_resource TEXT,
    p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Vérifier si l'utilisateur est super admin
    SELECT is_super_admin INTO has_permission
    FROM users 
    WHERE id = p_user_id;
    
    IF has_permission THEN
        RETURN TRUE;
    END IF;
    
    -- Vérifier via les rôles
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
        AND p.service = p_service
        AND p.resource = p_resource
        AND p.action = p_action
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ language 'plpgsql';

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    service TEXT,
    resource TEXT,
    action TEXT,
    permission_name TEXT,
    permission_description TEXT
) AS $$
BEGIN
    -- Si super admin, retourner toutes les permissions
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_super_admin = TRUE) THEN
        RETURN QUERY
        SELECT p.service, p.resource, p.action, p.name, p.description
        FROM permissions p
        ORDER BY p.service, p.resource, p.action;
    ELSE
        -- Retourner les permissions via les rôles
        RETURN QUERY
        SELECT p.service, p.resource, p.action, p.name, p.description
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
        ORDER BY p.service, p.resource, p.action;
    END IF;
END;
$$ language 'plpgsql';

-- Vue pour les permissions groupées par service
CREATE VIEW permissions_by_service AS
SELECT 
    service,
    resource,
    array_agg(action ORDER BY action) as actions,
    array_agg(name ORDER BY action) as action_names,
    category
FROM permissions
GROUP BY service, resource, category
ORDER BY service, resource;

-- Accorder les permissions sur les vues et fonctions
GRANT SELECT ON permissions_by_service TO app_role;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, TEXT, TEXT, TEXT) TO app_role;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO app_role;

-- Commentaires pour la documentation
COMMENT ON TABLE permissions IS 'Permissions système avec format service.resource.action';
COMMENT ON TABLE roles IS 'Rôles par entreprise avec permissions associées';
COMMENT ON TABLE role_permissions IS 'Liaison entre rôles et permissions';
COMMENT ON TABLE user_roles IS 'Liaison entre utilisateurs et rôles';

COMMENT ON FUNCTION user_has_permission(UUID, TEXT, TEXT, TEXT) IS 'Vérifie si un utilisateur a une permission spécifique';
COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Retourne toutes les permissions d''un utilisateur';

