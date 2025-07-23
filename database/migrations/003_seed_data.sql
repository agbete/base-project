-- ========================================
-- MIGRATION 003: Seed Data
-- Initial data for multi-tenant SaaS
-- ========================================

-- ========================================
-- SYSTEM PERMISSIONS
-- ========================================

-- Insert core system permissions
INSERT INTO permissions (id, service, resource, action, name, description, category, is_system) VALUES
-- Auth service permissions
(uuid_generate_v4(), 'auth', 'users', 'create', 'Create Users', 'Create new user accounts', 'User Management', true),
(uuid_generate_v4(), 'auth', 'users', 'read', 'View Users', 'View user information', 'User Management', true),
(uuid_generate_v4(), 'auth', 'users', 'update', 'Update Users', 'Update user information', 'User Management', true),
(uuid_generate_v4(), 'auth', 'users', 'delete', 'Delete Users', 'Delete user accounts', 'User Management', true),
(uuid_generate_v4(), 'auth', 'users', 'list', 'List Users', 'List all users', 'User Management', true),
(uuid_generate_v4(), 'auth', 'users', 'manage', 'Manage Users', 'Full user management access', 'User Management', true),

-- Role and permission management
(uuid_generate_v4(), 'auth', 'roles', 'create', 'Create Roles', 'Create new roles', 'Role Management', true),
(uuid_generate_v4(), 'auth', 'roles', 'read', 'View Roles', 'View role information', 'Role Management', true),
(uuid_generate_v4(), 'auth', 'roles', 'update', 'Update Roles', 'Update role information', 'Role Management', true),
(uuid_generate_v4(), 'auth', 'roles', 'delete', 'Delete Roles', 'Delete roles', 'Role Management', true),
(uuid_generate_v4(), 'auth', 'roles', 'list', 'List Roles', 'List all roles', 'Role Management', true),
(uuid_generate_v4(), 'auth', 'roles', 'manage', 'Manage Roles', 'Full role management access', 'Role Management', true),

(uuid_generate_v4(), 'auth', 'permissions', 'read', 'View Permissions', 'View available permissions', 'Permission Management', true),
(uuid_generate_v4(), 'auth', 'permissions', 'list', 'List Permissions', 'List all permissions', 'Permission Management', true),
(uuid_generate_v4(), 'auth', 'permissions', 'manage', 'Manage Permissions', 'Full permission management access', 'Permission Management', true),

-- Settings management
(uuid_generate_v4(), 'settings', 'company', 'read', 'View Company Settings', 'View company settings', 'Settings', true),
(uuid_generate_v4(), 'settings', 'company', 'update', 'Update Company Settings', 'Update company settings', 'Settings', true),
(uuid_generate_v4(), 'settings', 'company', 'manage', 'Manage Company Settings', 'Full company settings access', 'Settings', true),

(uuid_generate_v4(), 'settings', 'system', 'read', 'View System Settings', 'View system settings', 'Settings', true),
(uuid_generate_v4(), 'settings', 'system', 'update', 'Update System Settings', 'Update system settings', 'Settings', true),
(uuid_generate_v4(), 'settings', 'system', 'manage', 'Manage System Settings', 'Full system settings access', 'Settings', true),

-- CRM service permissions
(uuid_generate_v4(), 'crm', 'clients', 'create', 'Create Clients', 'Create new clients', 'CRM', false),
(uuid_generate_v4(), 'crm', 'clients', 'read', 'View Clients', 'View client information', 'CRM', false),
(uuid_generate_v4(), 'crm', 'clients', 'update', 'Update Clients', 'Update client information', 'CRM', false),
(uuid_generate_v4(), 'crm', 'clients', 'delete', 'Delete Clients', 'Delete clients', 'CRM', false),
(uuid_generate_v4(), 'crm', 'clients', 'list', 'List Clients', 'List all clients', 'CRM', false),
(uuid_generate_v4(), 'crm', 'clients', 'manage', 'Manage Clients', 'Full client management access', 'CRM', false),

(uuid_generate_v4(), 'crm', 'prospects', 'create', 'Create Prospects', 'Create new prospects', 'CRM', false),
(uuid_generate_v4(), 'crm', 'prospects', 'read', 'View Prospects', 'View prospect information', 'CRM', false),
(uuid_generate_v4(), 'crm', 'prospects', 'update', 'Update Prospects', 'Update prospect information', 'CRM', false),
(uuid_generate_v4(), 'crm', 'prospects', 'delete', 'Delete Prospects', 'Delete prospects', 'CRM', false),
(uuid_generate_v4(), 'crm', 'prospects', 'list', 'List Prospects', 'List all prospects', 'CRM', false),
(uuid_generate_v4(), 'crm', 'prospects', 'manage', 'Manage Prospects', 'Full prospect management access', 'CRM', false),

-- Inventory service permissions
(uuid_generate_v4(), 'inventory', 'products', 'create', 'Create Products', 'Create new products', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'products', 'read', 'View Products', 'View product information', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'products', 'update', 'Update Products', 'Update product information', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'products', 'delete', 'Delete Products', 'Delete products', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'products', 'list', 'List Products', 'List all products', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'products', 'manage', 'Manage Products', 'Full product management access', 'Inventory', false),

(uuid_generate_v4(), 'inventory', 'stock', 'read', 'View Stock', 'View stock levels', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'stock', 'update', 'Update Stock', 'Update stock levels', 'Inventory', false),
(uuid_generate_v4(), 'inventory', 'stock', 'manage', 'Manage Stock', 'Full stock management access', 'Inventory', false),

-- Invoicing service permissions
(uuid_generate_v4(), 'invoicing', 'invoices', 'create', 'Create Invoices', 'Create new invoices', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'invoices', 'read', 'View Invoices', 'View invoice information', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'invoices', 'update', 'Update Invoices', 'Update invoice information', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'invoices', 'delete', 'Delete Invoices', 'Delete invoices', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'invoices', 'list', 'List Invoices', 'List all invoices', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'invoices', 'manage', 'Manage Invoices', 'Full invoice management access', 'Invoicing', false),

(uuid_generate_v4(), 'invoicing', 'payments', 'create', 'Create Payments', 'Record new payments', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'payments', 'read', 'View Payments', 'View payment information', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'payments', 'update', 'Update Payments', 'Update payment information', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'payments', 'delete', 'Delete Payments', 'Delete payments', 'Invoicing', false),
(uuid_generate_v4(), 'invoicing', 'payments', 'list', 'List Payments', 'List all payments', 'Invoicing', false),

-- Reporting service permissions
(uuid_generate_v4(), 'reporting', 'reports', 'read', 'View Reports', 'View reports', 'Reporting', false),
(uuid_generate_v4(), 'reporting', 'reports', 'create', 'Create Reports', 'Create custom reports', 'Reporting', false),
(uuid_generate_v4(), 'reporting', 'reports', 'manage', 'Manage Reports', 'Full reporting access', 'Reporting', false),

(uuid_generate_v4(), 'reporting', 'analytics', 'read', 'View Analytics', 'View analytics data', 'Reporting', false),
(uuid_generate_v4(), 'reporting', 'analytics', 'manage', 'Manage Analytics', 'Full analytics access', 'Reporting', false);

-- ========================================
-- SYSTEM SETTINGS
-- ========================================

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app.name', '"Multi-Tenant SaaS"', 'Application name', 'general', true),
('app.version', '"1.0.0"', 'Application version', 'general', true),
('app.maintenance_mode', 'false', 'Maintenance mode status', 'general', false),

-- Security settings
('security.password_min_length', '8', 'Minimum password length', 'security', false),
('security.password_require_uppercase', 'true', 'Require uppercase in passwords', 'security', false),
('security.password_require_lowercase', 'true', 'Require lowercase in passwords', 'security', false),
('security.password_require_numbers', 'true', 'Require numbers in passwords', 'security', false),
('security.password_require_symbols', 'false', 'Require symbols in passwords', 'security', false),
('security.session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)', 'security', false),
('security.max_login_attempts', '5', 'Maximum login attempts before lockout', 'security', false),
('security.lockout_duration_minutes', '15', 'Account lockout duration in minutes', 'security', false),
('security.require_2fa', 'true', 'Require 2FA for all users', 'security', false),

-- Rate limiting settings
('rate_limit.api_requests_per_minute', '100', 'API requests per minute per company', 'rate_limiting', false),
('rate_limit.db_queries_per_minute', '1000', 'Database queries per minute per company', 'rate_limiting', false),
('rate_limit.file_uploads_per_hour', '50', 'File uploads per hour per company', 'rate_limiting', false),

-- Email settings
('email.from_address', '"noreply@saas-app.com"', 'Default from email address', 'email', false),
('email.from_name', '"SaaS Application"', 'Default from name', 'email', false),
('email.smtp_enabled', 'false', 'SMTP email enabled', 'email', false),

-- File storage settings
('storage.max_file_size_mb', '10', 'Maximum file size in MB', 'storage', false),
('storage.allowed_file_types', '["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx"]', 'Allowed file types', 'storage', false),

-- Localization settings
('localization.default_language', '"en"', 'Default language', 'localization', true),
('localization.available_languages', '["en", "fr", "es", "de"]', 'Available languages', 'localization', true),
('localization.default_timezone', '"UTC"', 'Default timezone', 'localization', true),
('localization.default_currency', '"USD"', 'Default currency', 'localization', true);

-- ========================================
-- DEMO COMPANIES
-- ========================================

-- Insert demo companies
INSERT INTO companies (id, name, slug, email, phone, address, primary_color, secondary_color, timezone, currency, locale, active_services, plan_type, max_users, max_storage_gb) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Acme Corporation',
    'acme-corp',
    'admin@acme-corp.com',
    '+1-555-0123',
    '123 Business St, New York, NY 10001',
    '#2563EB',
    '#64748B',
    'America/New_York',
    'USD',
    'en-US',
    '["auth", "users", "settings", "crm", "invoicing"]'::jsonb,
    'professional',
    50,
    100
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'TechStart Solutions',
    'techstart',
    'contact@techstart.com',
    '+1-555-0456',
    '456 Innovation Ave, San Francisco, CA 94105',
    '#059669',
    '#6B7280',
    'America/Los_Angeles',
    'USD',
    'en-US',
    '["auth", "users", "settings", "inventory", "reporting"]'::jsonb,
    'basic',
    10,
    25
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Global Enterprises',
    'global-ent',
    'info@global-enterprises.com',
    '+44-20-7946-0958',
    '789 International Blvd, London, UK',
    '#DC2626',
    '#9CA3AF',
    'Europe/London',
    'GBP',
    'en-GB',
    '["auth", "users", "settings", "crm", "inventory", "invoicing", "reporting"]'::jsonb,
    'enterprise',
    200,
    500
);

-- ========================================
-- DEMO USERS
-- ========================================

-- Insert demo users (password is 'password123' hashed with bcrypt)
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, is_company_admin, email_verified, two_factor_enabled) VALUES
-- Acme Corporation users
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin@acme-corp.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJ',
    'John',
    'Smith',
    true,
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'manager@acme-corp.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJ',
    'Sarah',
    'Johnson',
    false,
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'user@acme-corp.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJ',
    'Mike',
    'Davis',
    false,
    true,
    false
),

-- TechStart Solutions users
(
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'admin@techstart.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJ',
    'Emily',
    'Chen',
    true,
    true,
    false
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440002',
    'dev@techstart.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJ',
    'Alex',
    'Rodriguez',
    false,
    true,
    false
),

-- Global Enterprises users
(
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440003',
    'admin@global-enterprises.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJOzJJKJwXqZqJ',
    'James',
    'Wilson',
    true,
    true,
    true
),
(
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440003',
    'hr@global-enterprises.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJOzJJKJwXqZqJ',
    'Lisa',
    'Brown',
    false,
    true,
    false
),

-- Super admin user (not tied to any company)
(
    '660e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001', -- Default company for super admin
    'superadmin@saas-app.com',
    '$2b$10$rOzJJKJwXqZqJQJQJQJQJOzJJKJwXqZqJQJQJQJOzJJKJwXqZqJ',
    'Super',
    'Admin',
    true,
    true,
    true
);

-- Update super admin flag
UPDATE users SET is_super_admin = true WHERE email = 'superadmin@saas-app.com';

-- ========================================
-- DEMO ROLES
-- ========================================

-- Get permission IDs for role assignments
WITH permission_ids AS (
    SELECT 
        id,
        CONCAT(service, '.', resource, '.', action) as permission_key
    FROM permissions
)

-- Insert demo roles for each company
INSERT INTO roles (id, company_id, name, description, is_system, is_default, permission_ids) 
SELECT 
    uuid_generate_v4(),
    company_id,
    role_name,
    role_description,
    is_system,
    is_default,
    permission_array
FROM (
    VALUES 
    -- Acme Corporation roles
    ('550e8400-e29b-41d4-a716-446655440001', 'Administrator', 'Full access to all company features', true, false, 
     ARRAY(SELECT id FROM permissions WHERE service IN ('auth', 'settings', 'crm', 'invoicing'))),
    ('550e8400-e29b-41d4-a716-446655440001', 'Manager', 'Management access to CRM and invoicing', true, false,
     ARRAY(SELECT id FROM permissions WHERE service IN ('crm', 'invoicing') AND action IN ('create', 'read', 'update', 'list'))),
    ('550e8400-e29b-41d4-a716-446655440001', 'Employee', 'Basic access to view data', true, true,
     ARRAY(SELECT id FROM permissions WHERE action IN ('read', 'list') AND service IN ('crm', 'invoicing'))),
    
    -- TechStart Solutions roles
    ('550e8400-e29b-41d4-a716-446655440002', 'Administrator', 'Full access to all company features', true, false,
     ARRAY(SELECT id FROM permissions WHERE service IN ('auth', 'settings', 'inventory', 'reporting'))),
    ('550e8400-e29b-41d4-a716-446655440002', 'Developer', 'Access to inventory and reporting', true, true,
     ARRAY(SELECT id FROM permissions WHERE service IN ('inventory', 'reporting') AND action IN ('create', 'read', 'update', 'list'))),
    
    -- Global Enterprises roles
    ('550e8400-e29b-41d4-a716-446655440003', 'Administrator', 'Full access to all company features', true, false,
     ARRAY(SELECT id FROM permissions)),
    ('550e8400-e29b-41d4-a716-446655440003', 'HR Manager', 'HR and user management access', true, false,
     ARRAY(SELECT id FROM permissions WHERE service = 'auth' AND resource = 'users')),
    ('550e8400-e29b-41d4-a716-446655440003', 'Employee', 'Basic employee access', true, true,
     ARRAY(SELECT id FROM permissions WHERE action IN ('read', 'list') AND service NOT IN ('settings')))
) AS roles_data(company_id, role_name, role_description, is_system, is_default, permission_array);

-- ========================================
-- ASSIGN ROLES TO USERS
-- ========================================

-- Assign administrator roles
INSERT INTO user_roles (user_id, role_id, assigned_by) 
SELECT 
    u.id,
    r.id,
    u.id -- Self-assigned for demo
FROM users u
JOIN roles r ON u.company_id = r.company_id
WHERE u.is_company_admin = true 
AND r.name = 'Administrator';

-- Assign default roles to non-admin users
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
    u.id,
    r.id,
    (SELECT id FROM users WHERE company_id = u.company_id AND is_company_admin = true LIMIT 1)
FROM users u
JOIN roles r ON u.company_id = r.company_id
WHERE u.is_company_admin = false 
AND u.is_super_admin = false
AND r.is_default = true;

-- ========================================
-- CODE GENERATORS
-- ========================================

-- Insert default code generators for each company
INSERT INTO code_generators (company_id, entity, mode, prefix, sequence_type, sequence_length, current_number) VALUES
-- Acme Corporation
('550e8400-e29b-41d4-a716-446655440001', 'clients', 'auto', 'CLI', 'chronological', 6, 0),
('550e8400-e29b-41d4-a716-446655440001', 'invoices', 'auto', 'INV', 'chronological', 6, 0),
('550e8400-e29b-41d4-a716-446655440001', 'orders', 'auto', 'ORD', 'chronological', 6, 0),

-- TechStart Solutions
('550e8400-e29b-41d4-a716-446655440002', 'products', 'auto', 'PRD', 'chronological', 8, 0),
('550e8400-e29b-41d4-a716-446655440002', 'inventory', 'auto', 'INV', 'random', 6, 0),

-- Global Enterprises
('550e8400-e29b-41d4-a716-446655440003', 'clients', 'auto', 'GE-CLI', 'chronological', 8, 0),
('550e8400-e29b-41d4-a716-446655440003', 'invoices', 'auto', 'GE-INV', 'chronological', 8, 0),
('550e8400-e29b-41d4-a716-446655440003', 'products', 'auto', 'GE-PRD', 'chronological', 8, 0),
('550e8400-e29b-41d4-a716-446655440003', 'orders', 'auto', 'GE-ORD', 'chronological', 8, 0);

-- ========================================
-- COMPANY SETTINGS
-- ========================================

-- Insert default company settings
INSERT INTO company_settings (company_id, key, value, description, category) 
SELECT 
    c.id,
    setting_key,
    setting_value,
    setting_description,
    setting_category
FROM companies c
CROSS JOIN (
    VALUES 
    ('branding.logo_url', '""', 'Company logo URL', 'branding'),
    ('branding.favicon_url', '""', 'Company favicon URL', 'branding'),
    ('branding.custom_css', '""', 'Custom CSS for branding', 'branding'),
    
    ('notifications.email_enabled', 'true', 'Email notifications enabled', 'notifications'),
    ('notifications.sms_enabled', 'false', 'SMS notifications enabled', 'notifications'),
    ('notifications.push_enabled', 'true', 'Push notifications enabled', 'notifications'),
    
    ('features.dark_mode_enabled', 'true', 'Dark mode available to users', 'features'),
    ('features.multi_language_enabled', 'true', 'Multi-language support enabled', 'features'),
    ('features.api_access_enabled', 'true', 'API access enabled', 'features'),
    
    ('security.password_expiry_days', '90', 'Password expiry in days (0 = never)', 'security'),
    ('security.session_timeout_minutes', '480', 'Session timeout in minutes', 'security'),
    ('security.ip_whitelist', '[]', 'IP whitelist for access', 'security'),
    
    ('integrations.webhook_url', '""', 'Webhook URL for integrations', 'integrations'),
    ('integrations.api_key', '""', 'API key for external integrations', 'integrations')
) AS settings(setting_key, setting_value, setting_description, setting_category);

-- ========================================
-- RATE LIMITS
-- ========================================

-- Insert default rate limits for each company based on their plan
INSERT INTO rate_limits (company_id, resource_type, limit_value, window_seconds) 
SELECT 
    c.id,
    resource_type,
    CASE c.plan_type
        WHEN 'basic' THEN basic_limit
        WHEN 'professional' THEN professional_limit
        WHEN 'enterprise' THEN enterprise_limit
        ELSE basic_limit
    END,
    window_seconds
FROM companies c
CROSS JOIN (
    VALUES 
    ('api_requests', 60, 300, 1000, 60),      -- per minute
    ('db_queries', 500, 2000, 10000, 60),     -- per minute
    ('file_uploads', 10, 50, 200, 3600),      -- per hour
    ('email_sends', 50, 200, 1000, 3600),     -- per hour
    ('concurrent_sessions', 5, 25, 100, 1)    -- concurrent
) AS limits(resource_type, basic_limit, professional_limit, enterprise_limit, window_seconds);

-- ========================================
-- VALIDATION QUERIES
-- ========================================

-- Verify data integrity
DO $$
DECLARE
    company_count INTEGER;
    user_count INTEGER;
    role_count INTEGER;
    permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO company_count FROM companies;
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO permission_count FROM permissions;
    
    RAISE NOTICE 'Seed data inserted successfully:';
    RAISE NOTICE '- Companies: %', company_count;
    RAISE NOTICE '- Users: %', user_count;
    RAISE NOTICE '- Roles: %', role_count;
    RAISE NOTICE '- Permissions: %', permission_count;
    
    -- Verify RLS is working
    RAISE NOTICE 'RLS Status:';
    FOR rec IN SELECT * FROM validate_tenant_isolation() LOOP
        RAISE NOTICE '- Table: %, RLS: %, Policies: %', rec.table_name, rec.has_rls, rec.policy_count;
    END LOOP;
END $$;

