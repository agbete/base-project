#!/bin/bash

# ========================================
# SCRIPT D'INITIALISATION DE LA BASE DE DONNÉES
# ========================================

set -e

echo "🚀 Initialisation de la base de données SaaS..."

# Variables
DB_NAME="saas_app"
DB_USER="saas_user"

echo "📊 Base de données: $DB_NAME"
echo "👤 Utilisateur: $DB_USER"

# ========================================
# EXÉCUTION DES MIGRATIONS
# ========================================

echo "📝 Exécution des migrations..."

# Migration 000: Table de suivi des migrations
echo "  → Migration 000: Schema migrations"
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" -f /docker-entrypoint-initdb.d/migrations/000_schema_migrations.sql

# Migration 001: Schéma initial
echo "  → Migration 001: Schéma initial"
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" -f /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql

# ========================================
# EXÉCUTION DES SEEDS
# ========================================

echo "🌱 Exécution des seeds..."

# Seed 001: Permissions système
echo "  → Seed 001: Permissions système"
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" -f /docker-entrypoint-initdb.d/seeds/001_permissions.sql

# Seed 002: Rôles système
echo "  → Seed 002: Rôles système"
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" -f /docker-entrypoint-initdb.d/seeds/002_system_roles.sql

# Seed 003: Entreprises de démonstration
echo "  → Seed 003: Entreprises de démonstration"
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" -f /docker-entrypoint-initdb.d/seeds/003_demo_companies.sql

# ========================================
# VÉRIFICATIONS FINALES
# ========================================

echo "🔍 Vérifications finales..."

# Compter les enregistrements créés
echo "📊 Statistiques de la base de données:"

psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" << EOF
SELECT 
    'Companies' as table_name, 
    COUNT(*) as record_count 
FROM companies
UNION ALL
SELECT 
    'Users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'Roles' as table_name, 
    COUNT(*) as record_count 
FROM roles
UNION ALL
SELECT 
    'Permissions' as table_name, 
    COUNT(*) as record_count 
FROM permissions
ORDER BY table_name;
EOF

echo ""
echo "✅ Base de données initialisée avec succès!"
echo ""
echo "🔑 Comptes de test disponibles:"
echo "  • Super Admin: superadmin@saas-app.com / admin123"
echo "  • ACME Corp Admin: admin@acme-corp.com / admin123"
echo "  • ACME Corp Manager: manager@acme-corp.com / admin123"
echo "  • ACME Corp User: user@acme-corp.com / admin123"
echo "  • Tech Startup Admin: admin@tech-startup.com / admin123"
echo "  • Consulting Firm Admin: admin@consulting-firm.com / admin123"
echo ""
echo "🌐 Interfaces de développement:"
echo "  • Adminer (DB): http://localhost:8080"
echo "  • Redis Commander: http://localhost:8081"
echo ""

