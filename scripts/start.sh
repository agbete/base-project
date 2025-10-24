#!/bin/bash

# ========================================
# SCRIPT DE DÉMARRAGE RAPIDE
# ========================================

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_message() {
    echo -e "${2}${1}${NC}"
}

print_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

# ========================================
# VÉRIFICATIONS PRÉALABLES
# ========================================

print_header "🔍 VÉRIFICATIONS PRÉALABLES"

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    print_message "❌ Docker n'est pas installé. Veuillez l'installer d'abord." $RED
    exit 1
fi

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_message "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord." $RED
    exit 1
fi

print_message "✅ Docker et Docker Compose sont installés" $GREEN

# Vérifier que Docker est en cours d'exécution
if ! docker info &> /dev/null; then
    print_message "❌ Docker n'est pas en cours d'exécution. Veuillez le démarrer." $RED
    exit 1
fi

print_message "✅ Docker est en cours d'exécution" $GREEN

# ========================================
# CONFIGURATION
# ========================================

print_header "⚙️ CONFIGURATION"

# Créer le fichier .env s'il n'existe pas
if [ ! -f backend/.env ]; then
    print_message "📝 Création du fichier .env..." $YELLOW
    cp backend/.env.example backend/.env
    print_message "✅ Fichier .env créé à partir de .env.example" $GREEN
    print_message "💡 Vous pouvez modifier backend/.env selon vos besoins" $BLUE
else
    print_message "✅ Fichier .env existe déjà" $GREEN
fi

# ========================================
# NETTOYAGE (OPTIONNEL)
# ========================================

if [ "$1" = "--clean" ]; then
    print_header "🧹 NETTOYAGE"
    print_message "🗑️ Suppression des conteneurs et volumes existants..." $YELLOW
    
    docker-compose down -v --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
    
    print_message "✅ Nettoyage terminé" $GREEN
fi

# ========================================
# CONSTRUCTION ET DÉMARRAGE
# ========================================

print_header "🚀 CONSTRUCTION ET DÉMARRAGE"

print_message "🔨 Construction des images Docker..." $YELLOW
docker-compose build --no-cache

print_message "🚀 Démarrage des services..." $YELLOW
docker-compose up -d

# ========================================
# ATTENTE DES SERVICES
# ========================================

print_header "⏳ ATTENTE DES SERVICES"

print_message "⏳ Attente de PostgreSQL..." $YELLOW
timeout=60
counter=0
while ! docker-compose exec -T postgres pg_isready -U saas_user -d saas_app &> /dev/null; do
    if [ $counter -ge $timeout ]; then
        print_message "❌ Timeout: PostgreSQL n'est pas prêt après ${timeout}s" $RED
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done
print_message "✅ PostgreSQL est prêt" $GREEN

print_message "⏳ Attente de Redis..." $YELLOW
counter=0
while ! docker-compose exec -T redis redis-cli ping &> /dev/null; do
    if [ $counter -ge $timeout ]; then
        print_message "❌ Timeout: Redis n'est pas prêt après ${timeout}s" $RED
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done
print_message "✅ Redis est prêt" $GREEN

print_message "⏳ Attente du backend..." $YELLOW
counter=0
while ! curl -f http://localhost:3001/health &> /dev/null; do
    if [ $counter -ge $timeout ]; then
        print_message "❌ Timeout: Backend n'est pas prêt après ${timeout}s" $RED
        print_message "📋 Vérifiez les logs: docker-compose logs backend" $BLUE
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
done
print_message "✅ Backend est prêt" $GREEN

# ========================================
# VÉRIFICATION FINALE
# ========================================

print_header "🔍 VÉRIFICATION FINALE"

# Vérifier les services
services_status=$(docker-compose ps --services --filter "status=running")
total_services=$(docker-compose config --services | wc -l)
running_services=$(echo "$services_status" | wc -l)

if [ "$running_services" -eq "$total_services" ]; then
    print_message "✅ Tous les services sont en cours d'exécution" $GREEN
else
    print_message "⚠️ Certains services ne sont pas en cours d'exécution" $YELLOW
    docker-compose ps
fi

# ========================================
# INFORMATIONS FINALES
# ========================================

print_header "🎉 APPLICATION PRÊTE"

print_message "🌐 URLs d'accès:" $BLUE
echo "  • Frontend:        http://localhost:3000"
echo "  • Backend API:     http://localhost:3001"
echo "  • Health Check:    http://localhost:3001/health"
echo "  • Adminer (DB):    http://localhost:8080"
echo "  • Redis Commander: http://localhost:8081"

echo ""
print_message "🔑 Comptes de test:" $BLUE
echo "  • Super Admin:     superadmin@saas-app.com / admin123"
echo "  • ACME Admin:      admin@acme-corp.com / admin123"
echo "  • ACME Manager:    manager@acme-corp.com / admin123"
echo "  • ACME User:       user@acme-corp.com / admin123"

echo ""
print_message "📋 Commandes utiles:" $BLUE
echo "  • Voir les logs:   docker-compose logs -f"
echo "  • Arrêter:         docker-compose down"
echo "  • Redémarrer:      docker-compose restart"
echo "  • Shell backend:   docker-compose exec backend sh"
echo "  • Shell DB:        docker-compose exec postgres psql -U saas_user -d saas_app"

echo ""
print_message "🚀 L'application SaaS est maintenant accessible!" $GREEN
print_message "📖 Consultez le README.md pour plus d'informations" $BLUE

# Ouvrir le navigateur (optionnel)
if command -v xdg-open &> /dev/null; then
    read -p "Voulez-vous ouvrir l'application dans votre navigateur? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open http://localhost:3000
    fi
elif command -v open &> /dev/null; then
    read -p "Voulez-vous ouvrir l'application dans votre navigateur? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:3000
    fi
fi

