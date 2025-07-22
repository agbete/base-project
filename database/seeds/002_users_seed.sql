-- Seed 002: Données de test pour les utilisateurs avec rôles

-- Supprimer les données existantes (pour les tests uniquement)
TRUNCATE TABLE user_roles RESTART IDENTITY CASCADE;
TRUNCATE TABLE role_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE roles RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- ========================================
-- CRÉATION DES RÔLES SYSTÈME
-- ========================================

-- Rôle Super Administrateur (système)
INSERT INTO roles (
    id,
    company_id,
    name,
    description,
    color,
    is_system,
    is_default
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001', -- TechCorp
    'Super Administrateur',
    'Accès complet à toutes les fonctionnalités du système',
    '#DC2626',
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002', -- StartupInnovation
    'Super Administrateur',
    'Accès complet à toutes les fonctionnalités du système',
    '#DC2626',
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003', -- Global Enterprise
    'Super Administrateur',
    'Accès complet à toutes les fonctionnalités du système',
    '#DC2626',
    true,
    false
);

-- Rôle Administrateur
INSERT INTO roles (
    id,
    company_id,
    name,
    description,
    color,
    is_system,
    is_default
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440001', -- TechCorp
    'Administrateur',
    'Gestion des utilisateurs et paramètres de l''entreprise',
    '#F59E0B',
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440002', -- StartupInnovation
    'Administrateur',
    'Gestion des utilisateurs et paramètres de l''entreprise',
    '#F59E0B',
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440003', -- Global Enterprise
    'Administrateur',
    'Gestion des utilisateurs et paramètres de l''entreprise',
    '#F59E0B',
    true,
    false
);

-- Rôle Utilisateur Standard
INSERT INTO roles (
    id,
    company_id,
    name,
    description,
    color,
    is_system,
    is_default
) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440001', -- TechCorp
    'Utilisateur',
    'Accès standard aux fonctionnalités de base',
    '#10B981',
    true,
    true
),
(
    '660e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440002', -- StartupInnovation
    'Utilisateur',
    'Accès standard aux fonctionnalités de base',
    '#10B981',
    true,
    true
),
(
    '660e8400-e29b-41d4-a716-446655440023',
    '550e8400-e29b-41d4-a716-446655440003', -- Global Enterprise
    'Utilisateur',
    'Accès standard aux fonctionnalités de base',
    '#10B981',
    true,
    true
);

-- ========================================
-- ATTRIBUTION DES PERMISSIONS AUX RÔLES
-- ========================================

-- Super Administrateur : toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Administrateur';

-- Administrateur : permissions de gestion
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrateur'
AND p.service IN ('auth', 'settings')
AND NOT (p.service = 'settings' AND p.resource = 'system');

-- Utilisateur : permissions de base
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Utilisateur'
AND (
    (p.service = 'settings' AND p.resource = 'user') OR
    (p.service = 'crm' AND p.action IN ('read', 'list')) OR
    (p.service = 'inventory' AND p.action IN ('read', 'list'))
);

-- ========================================
-- CRÉATION DES UTILISATEURS
-- ========================================

-- Super Admin Global (peut accéder à toutes les entreprises)
INSERT INTO users (
    id,
    company_id,
    email,
    password_hash,
    first_name,
    last_name,
    is_super_admin,
    email_verified,
    status
) VALUES (
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001', -- TechCorp par défaut
    'superadmin@saas-app.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Super',
    'Admin',
    true,
    true,
    'active'
);

-- Utilisateurs TechCorp
INSERT INTO users (
    id,
    company_id,
    email,
    password_hash,
    first_name,
    last_name,
    email_verified,
    status
) VALUES 
(
    '770e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin@techcorp.fr',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Jean',
    'Dupont',
    true,
    'active'
),
(
    '770e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440001',
    'marie.martin@techcorp.fr',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Marie',
    'Martin',
    true,
    'active'
),
(
    '770e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440001',
    'pierre.bernard@techcorp.fr',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Pierre',
    'Bernard',
    true,
    'active'
);

-- Utilisateurs StartupInnovation
INSERT INTO users (
    id,
    company_id,
    email,
    password_hash,
    first_name,
    last_name,
    email_verified,
    status
) VALUES 
(
    '770e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440002',
    'admin@startup-innovation.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Sophie',
    'Leroy',
    true,
    'active'
),
(
    '770e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440002',
    'thomas.petit@startup-innovation.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Thomas',
    'Petit',
    true,
    'active'
);

-- Utilisateurs Global Enterprise
INSERT INTO users (
    id,
    company_id,
    email,
    password_hash,
    first_name,
    last_name,
    locale,
    email_verified,
    status
) VALUES 
(
    '770e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440003',
    'admin@global-enterprise.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'John',
    'Smith',
    'en-US',
    true,
    'active'
),
(
    '770e8400-e29b-41d4-a716-446655440032',
    '550e8400-e29b-41d4-a716-446655440003',
    'sarah.johnson@global-enterprise.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Sarah',
    'Johnson',
    'en-US',
    true,
    'active'
),
(
    '770e8400-e29b-41d4-a716-446655440033',
    '550e8400-e29b-41d4-a716-446655440003',
    'michael.brown@global-enterprise.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/.uo', -- password: admin123
    'Michael',
    'Brown',
    'en-US',
    true,
    'active'
);

-- ========================================
-- ATTRIBUTION DES RÔLES AUX UTILISATEURS
-- ========================================

-- Super Admin Global (pas besoin de rôle spécifique car is_super_admin = true)

-- TechCorp
INSERT INTO user_roles (user_id, role_id) VALUES
('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440001'), -- Jean = Super Admin
('770e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440011'), -- Marie = Admin
('770e8400-e29b-41d4-a716-446655440013', '660e8400-e29b-41d4-a716-446655440021'); -- Pierre = Utilisateur

-- StartupInnovation
INSERT INTO user_roles (user_id, role_id) VALUES
('770e8400-e29b-41d4-a716-446655440021', '660e8400-e29b-41d4-a716-446655440002'), -- Sophie = Super Admin
('770e8400-e29b-41d4-a716-446655440022', '660e8400-e29b-41d4-a716-446655440022'); -- Thomas = Utilisateur

-- Global Enterprise
INSERT INTO user_roles (user_id, role_id) VALUES
('770e8400-e29b-41d4-a716-446655440031', '660e8400-e29b-41d4-a716-446655440003'), -- John = Super Admin
('770e8400-e29b-41d4-a716-446655440032', '660e8400-e29b-41d4-a716-446655440013'), -- Sarah = Admin
('770e8400-e29b-41d4-a716-446655440033', '660e8400-e29b-41d4-a716-446655440023'); -- Michael = Utilisateur

-- ========================================
-- VÉRIFICATION DES DONNÉES
-- ========================================

-- Afficher un résumé des utilisateurs créés
SELECT 
    u.first_name || ' ' || u.last_name as nom_complet,
    u.email,
    c.name as entreprise,
    c.slug as entreprise_slug,
    CASE WHEN u.is_super_admin THEN 'Super Admin Global' ELSE r.name END as role,
    u.status
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY c.name, u.first_name;

-- Afficher les permissions par rôle
SELECT 
    c.name as entreprise,
    r.name as role,
    COUNT(rp.permission_id) as nb_permissions
FROM companies c
JOIN roles r ON c.id = r.company_id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY c.name, r.name
ORDER BY c.name, r.name;

