-- ========================================
-- SEED 002: RÔLES SYSTÈME
-- ========================================

-- Variables pour stocker les IDs des rôles
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
    readonly_role_id UUID;
BEGIN

-- ========================================
-- CRÉATION DES RÔLES SYSTÈME
-- ========================================

-- Supprimer les rôles existants
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE is_system = true);
DELETE FROM roles WHERE is_system = true;

-- 1. SUPER ADMIN (accès complet système)
INSERT INTO roles (id, name, description, company_id, is_system, created_at)
VALUES (uuid_generate_v4(), 'Super Admin', 'Accès complet au système et à toutes les entreprises', NULL, true, NOW())
RETURNING id INTO super_admin_role_id;

-- 2. ADMIN (accès complet entreprise)
INSERT INTO roles (id, name, description, company_id, is_system, created_at)
VALUES (uuid_generate_v4(), 'Admin', 'Administrateur avec accès complet à l''entreprise', NULL, true, NOW())
RETURNING id INTO admin_role_id;

-- 3. MANAGER (gestion équipe)
INSERT INTO roles (id, name, description, company_id, is_system, created_at)
VALUES (uuid_generate_v4(), 'Manager', 'Gestionnaire avec accès aux fonctionnalités métier', NULL, true, NOW())
RETURNING id INTO manager_role_id;

-- 4. USER (utilisateur standard)
INSERT INTO roles (id, name, description, company_id, is_system, created_at)
VALUES (uuid_generate_v4(), 'User', 'Utilisateur standard avec accès de base', NULL, true, NOW())
RETURNING id INTO user_role_id;

-- 5. READONLY (lecture seule)
INSERT INTO roles (id, name, description, company_id, is_system, created_at)
VALUES (uuid_generate_v4(), 'Readonly', 'Accès en lecture seule', NULL, true, NOW())
RETURNING id INTO readonly_role_id;

-- ========================================
-- PERMISSIONS POUR ADMIN
-- ========================================

-- L'admin a toutes les permissions sauf système
INSERT INTO role_permissions (role_id, permission_id)
SELECT admin_role_id, id
FROM permissions
WHERE service != 'settings' OR resource != 'system';

-- ========================================
-- PERMISSIONS POUR MANAGER
-- ========================================

-- Authentification et profil
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'auth';

-- Gestion utilisateurs (lecture/création/modification)
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'users' AND action IN ('list', 'read', 'create', 'update');

-- Paramètres utilisateur et lecture entreprise
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE (service = 'settings' AND resource = 'user')
   OR (service = 'settings' AND resource = 'company' AND action = 'read');

-- Toutes les permissions CRM
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'crm';

-- Toutes les permissions inventaire
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'inventory';

-- Toutes les permissions facturation
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'invoicing';

-- Rapports (lecture et création)
INSERT INTO role_permissions (role_id, permission_id)
SELECT manager_role_id, id
FROM permissions
WHERE service = 'reporting';

-- ========================================
-- PERMISSIONS POUR USER
-- ========================================

-- Authentification et profil
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'auth';

-- Voir les utilisateurs et modifier ses propres infos
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE (service = 'users' AND action IN ('list', 'read'))
   OR (service = 'users' AND resource = 'own');

-- Paramètres utilisateur
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'settings' AND resource = 'user';

-- CRM (lecture et création)
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'crm' AND action IN ('list', 'read', 'create', 'update');

-- Inventaire (lecture)
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'inventory' AND action IN ('list', 'read');

-- Facturation (lecture et création)
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'invoicing' AND action IN ('list', 'read', 'create');

-- Rapports (lecture)
INSERT INTO role_permissions (role_id, permission_id)
SELECT user_role_id, id
FROM permissions
WHERE service = 'reporting' AND action IN ('list', 'read');

-- ========================================
-- PERMISSIONS POUR READONLY
-- ========================================

-- Authentification et profil
INSERT INTO role_permissions (role_id, permission_id)
SELECT readonly_role_id, id
FROM permissions
WHERE service = 'auth';

-- Lecture seule des utilisateurs
INSERT INTO role_permissions (role_id, permission_id)
SELECT readonly_role_id, id
FROM permissions
WHERE service = 'users' AND action IN ('list', 'read');

-- Paramètres utilisateur
INSERT INTO role_permissions (role_id, permission_id)
SELECT readonly_role_id, id
FROM permissions
WHERE service = 'settings' AND resource = 'user';

-- Lecture seule de tous les modules métier
INSERT INTO role_permissions (role_id, permission_id)
SELECT readonly_role_id, id
FROM permissions
WHERE service IN ('crm', 'inventory', 'invoicing', 'reporting')
  AND action IN ('list', 'read');

-- ========================================
-- AFFICHAGE DES RÉSULTATS
-- ========================================

-- Afficher les rôles créés avec le nombre de permissions
SELECT 
    r.name,
    r.description,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.is_system = true
GROUP BY r.id, r.name, r.description
ORDER BY r.name;

END $$;

