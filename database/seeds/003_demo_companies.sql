-- ========================================
-- SEED 003: ENTREPRISES DE DÉMONSTRATION
-- ========================================

DO $$
DECLARE
    acme_corp_id UUID;
    tech_startup_id UUID;
    consulting_firm_id UUID;
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
BEGIN

-- Récupérer les IDs des rôles système
SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' AND is_system = true;
SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' AND is_system = true;
SELECT id INTO user_role_id FROM roles WHERE name = 'User' AND is_system = true;

-- ========================================
-- ENTREPRISE 1: ACME CORP
-- ========================================

INSERT INTO companies (id, name, slug, plan, status, settings, created_at)
VALUES (
    uuid_generate_v4(),
    'ACME Corp',
    'acme-corp',
    'enterprise',
    'active',
    '{
        "branding": {
            "primaryColor": "#1E40AF",
            "secondaryColor": "#3B82F6",
            "companyName": "ACME Corp",
            "logo": "/logos/acme-corp.png"
        },
        "activeServices": ["auth", "users", "settings", "crm", "inventory", "invoicing", "reporting"],
        "quotas": {
            "maxUsers": 1000,
            "maxStorage": "100GB",
            "maxApiCalls": 100000
        },
        "regional": {
            "timezone": "Europe/Paris",
            "currency": "EUR",
            "locale": "fr-FR",
            "dateFormat": "DD/MM/YYYY",
            "timeFormat": "24h"
        },
        "notifications": {
            "emailEnabled": true,
            "smsEnabled": true,
            "pushEnabled": true
        },
        "security": {
            "twoFactorRequired": false,
            "sessionTimeout": 60,
            "ipWhitelist": []
        }
    }'::jsonb,
    NOW()
) RETURNING id INTO acme_corp_id;

-- Utilisateurs ACME Corp
INSERT INTO users (id, email, password_hash, first_name, last_name, company_id, role_id, status, preferences, created_at) VALUES
(
    uuid_generate_v4(),
    'admin@acme-corp.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'John',
    'Doe',
    acme_corp_id,
    admin_role_id,
    'active',
    '{
        "theme": "light",
        "language": "fr",
        "timezone": "Europe/Paris",
        "notifications": {
            "email": true,
            "push": true,
            "sms": false
        }
    }'::jsonb,
    NOW()
),
(
    uuid_generate_v4(),
    'manager@acme-corp.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Jane',
    'Smith',
    acme_corp_id,
    manager_role_id,
    'active',
    '{
        "theme": "dark",
        "language": "fr",
        "timezone": "Europe/Paris"
    }'::jsonb,
    NOW()
),
(
    uuid_generate_v4(),
    'user@acme-corp.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Bob',
    'Johnson',
    acme_corp_id,
    user_role_id,
    'active',
    '{
        "theme": "system",
        "language": "fr",
        "timezone": "Europe/Paris"
    }'::jsonb,
    NOW()
);

-- ========================================
-- ENTREPRISE 2: TECH STARTUP
-- ========================================

INSERT INTO companies (id, name, slug, plan, status, settings, created_at)
VALUES (
    uuid_generate_v4(),
    'Tech Startup',
    'tech-startup',
    'professional',
    'active',
    '{
        "branding": {
            "primaryColor": "#059669",
            "secondaryColor": "#10B981",
            "companyName": "Tech Startup",
            "logo": "/logos/tech-startup.png"
        },
        "activeServices": ["auth", "users", "settings", "crm", "reporting"],
        "quotas": {
            "maxUsers": 100,
            "maxStorage": "10GB",
            "maxApiCalls": 10000
        },
        "regional": {
            "timezone": "America/New_York",
            "currency": "USD",
            "locale": "en-US",
            "dateFormat": "MM/DD/YYYY",
            "timeFormat": "12h"
        },
        "notifications": {
            "emailEnabled": true,
            "smsEnabled": false,
            "pushEnabled": true
        },
        "security": {
            "twoFactorRequired": true,
            "sessionTimeout": 30,
            "ipWhitelist": []
        }
    }'::jsonb,
    NOW()
) RETURNING id INTO tech_startup_id;

-- Utilisateurs Tech Startup
INSERT INTO users (id, email, password_hash, first_name, last_name, company_id, role_id, status, preferences, created_at) VALUES
(
    uuid_generate_v4(),
    'admin@tech-startup.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Alice',
    'Wilson',
    tech_startup_id,
    admin_role_id,
    'active',
    '{
        "theme": "dark",
        "language": "en",
        "timezone": "America/New_York",
        "notifications": {
            "email": true,
            "push": true,
            "sms": true
        }
    }'::jsonb,
    NOW()
),
(
    uuid_generate_v4(),
    'dev@tech-startup.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Charlie',
    'Brown',
    tech_startup_id,
    user_role_id,
    'active',
    '{
        "theme": "dark",
        "language": "en",
        "timezone": "America/New_York"
    }'::jsonb,
    NOW()
);

-- ========================================
-- ENTREPRISE 3: CONSULTING FIRM
-- ========================================

INSERT INTO companies (id, name, slug, plan, status, settings, created_at)
VALUES (
    uuid_generate_v4(),
    'Consulting Firm',
    'consulting-firm',
    'basic',
    'active',
    '{
        "branding": {
            "primaryColor": "#7C3AED",
            "secondaryColor": "#8B5CF6",
            "companyName": "Consulting Firm",
            "logo": "/logos/consulting-firm.png"
        },
        "activeServices": ["auth", "users", "settings", "crm"],
        "quotas": {
            "maxUsers": 10,
            "maxStorage": "1GB",
            "maxApiCalls": 1000
        },
        "regional": {
            "timezone": "Europe/London",
            "currency": "GBP",
            "locale": "en-GB",
            "dateFormat": "DD/MM/YYYY",
            "timeFormat": "24h"
        },
        "notifications": {
            "emailEnabled": true,
            "smsEnabled": false,
            "pushEnabled": false
        },
        "security": {
            "twoFactorRequired": false,
            "sessionTimeout": 120,
            "ipWhitelist": []
        }
    }'::jsonb,
    NOW()
) RETURNING id INTO consulting_firm_id;

-- Utilisateurs Consulting Firm
INSERT INTO users (id, email, password_hash, first_name, last_name, company_id, role_id, status, preferences, created_at) VALUES
(
    uuid_generate_v4(),
    'admin@consulting-firm.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'David',
    'Miller',
    consulting_firm_id,
    admin_role_id,
    'active',
    '{
        "theme": "light",
        "language": "en",
        "timezone": "Europe/London",
        "notifications": {
            "email": true,
            "push": false,
            "sms": false
        }
    }'::jsonb,
    NOW()
);

-- ========================================
-- SUPER ADMIN GLOBAL
-- ========================================

-- Créer un super admin qui peut accéder à toutes les entreprises
INSERT INTO users (id, email, password_hash, first_name, last_name, company_id, role_id, status, is_super_admin, preferences, created_at) VALUES
(
    uuid_generate_v4(),
    'superadmin@saas-app.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Super',
    'Admin',
    acme_corp_id, -- Entreprise par défaut
    (SELECT id FROM roles WHERE name = 'Super Admin' AND is_system = true),
    'active',
    true,
    '{
        "theme": "dark",
        "language": "fr",
        "timezone": "Europe/Paris",
        "notifications": {
            "email": true,
            "push": true,
            "sms": true
        }
    }'::jsonb,
    NOW()
);

-- ========================================
-- AFFICHAGE DES RÉSULTATS
-- ========================================

-- Afficher les entreprises créées
SELECT 
    name,
    slug,
    plan,
    status,
    (settings->>'branding'->>'companyName') as brand_name,
    created_at
FROM companies
ORDER BY created_at;

-- Afficher les utilisateurs créés
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    c.name as company_name,
    r.name as role_name,
    u.is_super_admin,
    u.status
FROM users u
JOIN companies c ON u.company_id = c.id
JOIN roles r ON u.role_id = r.id
ORDER BY c.name, r.name, u.email;

END $$;

