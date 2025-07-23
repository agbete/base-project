# 🚀 Guide de Déploiement - Multi-Tenant SaaS

Ce guide vous explique comment déployer l'application SaaS multi-tenant en utilisant Docker ou en développement local.

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Déploiement Docker (Recommandé)](#déploiement-docker-recommandé)
3. [Développement Local](#développement-local)
4. [Configuration](#configuration)
5. [Dépannage](#dépannage)

## 🔧 Prérequis

### Pour Docker
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB espace disque

### Pour Développement Local
- Node.js 18+
- PostgreSQL 15+
- Redis 6+ (optionnel)
- npm ou yarn

## 🐳 Déploiement Docker (Recommandé)

### 1. Déploiement Rapide

```bash
# Cloner le projet
git clone <repository-url>
cd multi-tenant-saas

# Déploiement simple
./deploy.sh

# Avec monitoring (pgAdmin + Redis Commander)
./deploy.sh --with-monitoring

# Avec Nginx reverse proxy
./deploy.sh --with-nginx

# Déploiement complet
./deploy.sh --with-monitoring --with-nginx
```

### 2. Configuration Docker

Le script `deploy.sh` accepte plusieurs options :

```bash
./deploy.sh [OPTIONS]

Options:
  --with-monitoring    Démarre pgAdmin et Redis Commander
  --with-nginx        Démarre Nginx comme reverse proxy
  --skip-secrets      Ignore la génération de secrets (dev uniquement)
  --cleanup           Arrête et supprime tous les containers
  --help              Affiche l'aide
```

### 3. Services Disponibles

Après déploiement, les services suivants sont disponibles :

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Interface utilisateur |
| Backend API | http://localhost:3001 | API REST |
| Health Check | http://localhost:3001/health | Vérification santé |
| pgAdmin | http://localhost:8080 | Gestion PostgreSQL |
| Redis Commander | http://localhost:8081 | Gestion Redis |

### 4. Comptes de Démonstration

| Entreprise | Email | Mot de passe | Rôle |
|------------|-------|--------------|------|
| Super Admin | superadmin@saas-app.com | password123 | Super Admin |
| Acme Corp | admin@acme-corp.com | password123 | Admin |
| TechStart | admin@techstart.com | password123 | Admin |
| Global Ent | admin@global-enterprises.com | password123 | Admin |

## 💻 Développement Local

### 1. Prérequis Système

#### Installation PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS avec Homebrew
brew install postgresql

# Démarrer PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

#### Installation Redis (Optionnel)
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS avec Homebrew
brew install redis

# Démarrer Redis
sudo systemctl start redis-server  # Linux
brew services start redis          # macOS
```

### 2. Configuration Base de Données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer utilisateur et base de données
CREATE USER saas_user WITH PASSWORD 'saas_password';
CREATE DATABASE saas_app OWNER saas_user;
GRANT ALL PRIVILEGES ON DATABASE saas_app TO saas_user;
\q
```

### 3. Démarrage Local

```bash
# Copier la configuration
cp .env.local .env

# Démarrer tous les services
./start-local.sh

# Ou démarrer individuellement
./start-local.sh start
```

### 4. Commandes Utiles

```bash
# Voir le statut des services
./start-local.sh status

# Arrêter tous les services
./start-local.sh stop

# Voir les logs
./start-local.sh logs backend
./start-local.sh logs frontend

# Aide
./start-local.sh help
```

## ⚙️ Configuration

### Variables d'Environnement

#### Docker (.env.docker)
```bash
# Application
APP_NAME=Multi-Tenant SaaS
APP_URL=http://localhost:3000
NODE_ENV=production

# Base de données
DB_HOST=postgres
DB_PORT=5432
DB_NAME=saas_app
DB_USER=saas_user
DB_PASSWORD=saas_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-key-32-chars-min

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-app-password
```

#### Local (.env.local)
```bash
# Application
APP_NAME=Multi-Tenant SaaS
APP_URL=http://localhost:3000
NODE_ENV=development

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_app
DB_USER=saas_user
DB_PASSWORD=saas_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=dev-jwt-secret-key-for-development-only
JWT_REFRESH_SECRET=dev-refresh-secret-key-for-development

# API URLs
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Personnalisation

#### Modifier les Ports
```bash
# Dans docker-compose.yml
services:
  frontend:
    ports:
      - "8080:3000"  # Frontend sur port 8080
  backend:
    ports:
      - "8081:3001"  # Backend sur port 8081
```

#### Ajouter des Services
```bash
# Dans docker-compose.yml
services:
  elasticsearch:
    image: elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
```

## 🔍 Dépannage

### Problèmes Courants

#### 1. Services qui ne démarrent pas

**Docker :**
```bash
# Vérifier les logs
docker compose logs [service]

# Vérifier l'état
docker compose ps

# Redémarrer
docker compose restart [service]
```

**Local :**
```bash
# Vérifier le statut
./start-local.sh status

# Voir les logs
./start-local.sh logs backend
./start-local.sh logs frontend
```

#### 2. Erreurs de Base de Données

**Connexion refusée :**
```bash
# Vérifier que PostgreSQL fonctionne
pg_isready -h localhost -p 5432

# Vérifier les permissions
sudo -u postgres psql -c "SELECT version();"
```

**Migrations échouent :**
```bash
# Docker
docker compose --profile migration run --rm migrator

# Local
cd database && node migrate.js run
```

#### 3. Problèmes de Permissions

**Docker :**
```bash
# Réinitialiser les volumes
docker compose down -v
docker compose up -d postgres
docker compose --profile migration run --rm migrator
```

**Local :**
```bash
# Vérifier les permissions PostgreSQL
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE saas_app TO saas_user;"
```

#### 4. Ports Occupés

```bash
# Trouver le processus utilisant le port
sudo lsof -i :3000
sudo lsof -i :3001

# Tuer le processus
kill -9 [PID]

# Ou changer les ports dans la configuration
```

### Logs et Monitoring

#### Docker
```bash
# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend

# Utilisation des ressources
docker stats
```

#### Local
```bash
# Logs backend
tail -f logs/backend.log

# Logs frontend
tail -f logs/frontend.log

# Monitoring système
htop
```

### Nettoyage

#### Docker
```bash
# Arrêter tous les services
docker compose down

# Supprimer les volumes
docker compose down -v

# Nettoyer les images
docker system prune -a
```

#### Local
```bash
# Arrêter les services
./start-local.sh stop

# Nettoyer les logs
rm -rf logs/

# Nettoyer les node_modules
rm -rf frontend/node_modules backend/node_modules
```

## 🚀 Déploiement en Production

### 1. Sécurité

```bash
# Générer des secrets forts
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
openssl rand -base64 16  # DB_PASSWORD
```

### 2. SSL/HTTPS

```bash
# Obtenir des certificats Let's Encrypt
certbot certonly --standalone -d your-domain.com

# Copier dans docker/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/* docker/nginx/ssl/
```

### 3. Monitoring

```bash
# Déployer avec monitoring complet
./deploy.sh --with-monitoring --with-nginx

# Configurer des alertes
# Utiliser Prometheus + Grafana pour monitoring avancé
```

### 4. Backup

```bash
# Backup automatique de la base de données
docker compose exec postgres pg_dump -U saas_user saas_app > backup-$(date +%Y%m%d).sql

# Backup des volumes
docker run --rm -v saas_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## 📞 Support

Pour obtenir de l'aide :

1. Consultez les logs détaillés
2. Vérifiez la configuration des variables d'environnement
3. Testez les connexions réseau et base de données
4. Consultez la documentation des services individuels

---

**🎉 Votre application SaaS multi-tenant est maintenant prête !**

