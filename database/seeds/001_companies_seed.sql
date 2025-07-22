-- Seed 001: Données de test pour les entreprises

-- Supprimer les données existantes (pour les tests uniquement)
TRUNCATE TABLE companies RESTART IDENTITY CASCADE;

-- Insérer les entreprises de test
INSERT INTO companies (
    id,
    name,
    slug,
    email,
    phone,
    website,
    address_line1,
    city,
    country,
    timezone,
    locale,
    currency,
    primary_color,
    secondary_color,
    active_services,
    business_settings,
    max_users,
    max_storage_mb,
    max_api_calls_per_hour,
    plan,
    status
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'TechCorp Solutions',
    'techcorp',
    'contact@techcorp.fr',
    '+33 1 23 45 67 89',
    'https://techcorp.fr',
    '123 Avenue des Champs-Élysées',
    'Paris',
    'France',
    'Europe/Paris',
    'fr-FR',
    'EUR',
    '#3B82F6',
    '#64748B',
    '["auth", "users", "settings", "crm", "inventory"]'::jsonb,
    '{
        "invoice_prefix": "TC",
        "auto_generate_codes": true,
        "default_payment_terms": 30,
        "tax_rate": 20.0,
        "currency_symbol": "€"
    }'::jsonb,
    50,
    5120,
    5000,
    'professional',
    'active'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'StartupInnovation',
    'startup-innovation',
    'hello@startup-innovation.com',
    '+33 1 98 76 54 32',
    'https://startup-innovation.com',
    '42 Rue de Rivoli',
    'Lyon',
    'France',
    'Europe/Paris',
    'fr-FR',
    'EUR',
    '#10B981',
    '#374151',
    '["auth", "users", "settings", "crm"]'::jsonb,
    '{
        "invoice_prefix": "SI",
        "auto_generate_codes": false,
        "default_payment_terms": 15,
        "tax_rate": 20.0,
        "currency_symbol": "€"
    }'::jsonb,
    25,
    2048,
    2500,
    'basic',
    'active'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Global Enterprise Ltd',
    'global-enterprise',
    'contact@global-enterprise.com',
    '+33 4 11 22 33 44',
    'https://global-enterprise.com',
    '789 Boulevard de la Liberté',
    'Marseille',
    'France',
    'Europe/Paris',
    'en-US',
    'EUR',
    '#8B5CF6',
    '#6B7280',
    '["auth", "users", "settings", "crm", "inventory", "invoicing", "reporting"]'::jsonb,
    '{
        "invoice_prefix": "GE",
        "auto_generate_codes": true,
        "default_payment_terms": 45,
        "tax_rate": 20.0,
        "currency_symbol": "€",
        "multi_currency": true,
        "supported_currencies": ["EUR", "USD", "GBP"]
    }'::jsonb,
    100,
    10240,
    10000,
    'enterprise',
    'active'
);

-- Afficher les entreprises créées
SELECT 
    name,
    slug,
    email,
    plan,
    active_services,
    created_at
FROM companies
ORDER BY created_at;

