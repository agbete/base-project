-- Migration 001: Création de la table des entreprises (companies)
-- Cette table est la base du système multi-tenant

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les fonctions de chiffrement
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table des entreprises (tenants)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Informations d'adresse
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    
    -- Configuration de l'entreprise
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    locale VARCHAR(10) DEFAULT 'fr-FR',
    currency VARCHAR(3) DEFAULT 'EUR',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    
    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#64748B',
    
    -- Services activés (JSON array)
    active_services JSONB DEFAULT '["auth", "users", "settings"]'::jsonb,
    
    -- Paramètres métier (JSON)
    business_settings JSONB DEFAULT '{}'::jsonb,
    
    -- Quotas et limites
    max_users INTEGER DEFAULT 10,
    max_storage_mb INTEGER DEFAULT 1024,
    max_api_calls_per_hour INTEGER DEFAULT 1000,
    
    -- Plan tarifaire
    plan VARCHAR(50) DEFAULT 'basic',
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Index pour les performances
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_plan ON companies(plan);
CREATE INDEX idx_companies_created_at ON companies(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour valider le slug
CREATE OR REPLACE FUNCTION validate_company_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Le slug doit être en minuscules et ne contenir que des lettres, chiffres et tirets
    IF NEW.slug !~ '^[a-z0-9-]+$' THEN
        RAISE EXCEPTION 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets';
    END IF;
    
    -- Le slug ne peut pas commencer ou finir par un tiret
    IF NEW.slug ~ '^-' OR NEW.slug ~ '-$' THEN
        RAISE EXCEPTION 'Le slug ne peut pas commencer ou finir par un tiret';
    END IF;
    
    -- Le slug doit faire au moins 2 caractères
    IF LENGTH(NEW.slug) < 2 THEN
        RAISE EXCEPTION 'Le slug doit faire au moins 2 caractères';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour valider le slug
CREATE TRIGGER validate_company_slug_trigger
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION validate_company_slug();

-- Fonction pour générer un slug automatiquement
CREATE OR REPLACE FUNCTION generate_company_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Si le slug n'est pas fourni, le générer à partir du nom
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Convertir le nom en slug
        base_slug := LOWER(TRIM(NEW.name));
        base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9\s-]', '', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
        base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
        base_slug := TRIM(base_slug, '-');
        
        -- Vérifier l'unicité et ajouter un suffixe si nécessaire
        final_slug := base_slug;
        WHILE EXISTS (SELECT 1 FROM companies WHERE slug = final_slug AND id != COALESCE(NEW.id, uuid_generate_v4())) LOOP
            counter := counter + 1;
            final_slug := base_slug || '-' || counter;
        END LOOP;
        
        NEW.slug := final_slug;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour générer le slug automatiquement
CREATE TRIGGER generate_company_slug_trigger
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION generate_company_slug();

-- Commentaires pour la documentation
COMMENT ON TABLE companies IS 'Table des entreprises (tenants) pour le système multi-tenant';
COMMENT ON COLUMN companies.id IS 'Identifiant unique de l''entreprise';
COMMENT ON COLUMN companies.slug IS 'Slug unique pour l''URL (généré automatiquement si non fourni)';
COMMENT ON COLUMN companies.active_services IS 'Services activés pour cette entreprise (JSON array)';
COMMENT ON COLUMN companies.business_settings IS 'Paramètres métier spécifiques à l''entreprise (JSON)';
COMMENT ON COLUMN companies.max_users IS 'Nombre maximum d''utilisateurs autorisés';
COMMENT ON COLUMN companies.max_storage_mb IS 'Stockage maximum autorisé en MB';
COMMENT ON COLUMN companies.max_api_calls_per_hour IS 'Nombre maximum d''appels API par heure';

-- Données de test (à supprimer en production)
INSERT INTO companies (name, email, phone, website, city, country) VALUES
('Entreprise Demo 1', 'contact@demo1.com', '+33 1 23 45 67 89', 'https://demo1.com', 'Paris', 'France'),
('Entreprise Demo 2', 'contact@demo2.com', '+33 1 98 76 54 32', 'https://demo2.com', 'Lyon', 'France'),
('Demo Company 3', 'contact@demo3.com', '+33 1 11 22 33 44', 'https://demo3.com', 'Marseille', 'France');

