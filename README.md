# 🚀 Multi-Tenant SaaS Application

Une application SaaS multi-entreprise moderne avec architecture microservices, isolation complète des données et système de permissions granulaires.

## 📋 Fonctionnalités

### ✅ Architecture Multi-Tenant
- Isolation parfaite des données avec Row Level Security (RLS)
- Gestion des entreprises avec paramètres personnalisés
- Sélecteur d'entreprise pour les super administrateurs

### 🔐 Authentification & Sécurité
- Authentification JWT avec refresh tokens
- 2FA/MFA obligatoire avec QR codes
- Codes de sauvegarde et SMS backup
- Protection CSRF et rate limiting
- Audit trail complet

### 👥 Gestion des Utilisateurs & Permissions
- Système de permissions granulaires (`service.table.action`)
- Rôles personnalisables par entreprise
- Interface de gestion des permissions intuitive
- Hiérarchie des rôles avec héritage

### ⚙️ Système de Paramètres à 3 Niveaux
1. **Paramètres Système** (Super Admin uniquement)
2. **Paramètres Entreprise** (Branding, services actifs, règles métier)
3. **Paramètres Utilisateur** (Thème, langue, notifications)

### 📊 DataTables Enrichies
- Pagination configurable
- Recherche globale temps réel
- Tri multi-colonnes
- Filtres avancés avec constructeur visuel
- Actions en lot avec confirmation
- Export (CSV, Excel, PDF)

### 🏷️ Générateur de Codes Automatique
- Configuration par entité (`clients`, `invoices`, etc.)
- Modes manuel/automatique
- Patterns personnalisables (préfixe, séquence, suffixe)
- Aperçu en temps réel

### 🌍 Multi-Langues & Localisation
- Support i18n par entreprise
- Labels personnalisés
- Formats régionaux automatiques
- Gestion des devises et fuseaux horaires

### 📱 PWA Offline-First
- Service Worker pour cache intelligent
- Synchronisation différée
- Gestion des conflits
- Mode hors-ligne avec indicateur visuel

### ⚡ Protection "Noisy Neighbors"
- Rate limiting par entreprise
- Quotas de ressources configurables
- File d'attente priorisée par plan
- Monitoring des performances

## 🛠️ Stack Technologique

### Frontend
- **Next.js 14+** avec App Router
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le styling
- **Shadcn/ui** pour les composants

### Backend
- **Node.js + Express.js** avec TypeScript
- **PostgreSQL 15** avec Row Level Security
- **Redis** pour le cache et les sessions
- **Bull Queue** pour les tâches asynchrones

### Infrastructure
- **Docker & Docker Compose** pour le déploiement
- **Nginx** comme reverse proxy
- **pgAdmin** pour la gestion de base de données
- **Redis Commander** pour la gestion Redis

## 🚀 Déploiement Rapide avec Docker

### Prérequis
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB espace disque

### 1. Cloner le Projet
```bash
git clone <repository-url>
cd multi-tenant-saas
```

### 2. Déploiement Automatique
```bash
# Déploiement simple
./deploy.sh

# Avec monitoring (pgAdmin + Redis Commander)
./deploy.sh --with-monitoring

# Avec Nginx reverse proxy
./deploy.sh --with-nginx

# Déploiement complet
./deploy.sh --with-monitoring --with-nginx
```

### 3. Accès aux Services

#### 🌐 Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

#### 🔧 Outils de Gestion
- **pgAdmin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

#### 👤 Comptes de Démonstration
| Entreprise | Email | Mot de passe | Rôle |
|------------|-------|--------------|------|
| Super Admin | superadmin@saas-app.com | password123 | Super Admin |
| Acme Corp | admin@acme-corp.com | password123 | Admin |
| TechStart | admin@techstart.com | password123 | Admin |
| Global Ent | admin@global-enterprises.com | password123 | Admin |

## 🔧 Commandes Docker Utiles

### Gestion des Services
```bash
# Voir les logs
docker-compose logs -f [service]

# Redémarrer un service
docker-compose restart [service]

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Reconstruire les images
docker-compose build --no-cache
```

### Gestion de la Base de Données
```bash
# Exécuter les migrations
docker-compose --profile migration run --rm migrator

# Accès direct à PostgreSQL
docker-compose exec postgres psql -U saas_user -d saas_app

# Backup de la base de données
docker-compose exec postgres pg_dump -U saas_user saas_app > backup.sql

# Restaurer la base de données
docker-compose exec -T postgres psql -U saas_user saas_app < backup.sql
```

### Monitoring et Debug
```bash
# Voir l'état des services
docker-compose ps

# Voir l'utilisation des ressources
docker stats

# Accéder au shell d'un container
docker-compose exec [service] sh

# Voir les logs en temps réel
docker-compose logs -f --tail=100
```

## 📁 Structure du Projet

```
multi-tenant-saas/
├── frontend/                 # Application Next.js
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Composants réutilisables
│   │   ├── lib/            # Utilitaires et configurations
│   │   └── types/          # Types TypeScript
│   └── Dockerfile
├── backend/                  # API Node.js/Express
│   ├── src/
│   │   ├── controllers/    # Contrôleurs API
│   │   ├── middleware/     # Middlewares
│   │   ├── models/         # Modèles de données
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services métier
│   │   └── utils/          # Utilitaires
│   └── Dockerfile
├── database/                 # Migrations et scripts DB
│   ├── migrations/         # Migrations SQL
│   ├── migrate.js          # Script de migration
│   └── Dockerfile
├── docker/                   # Configuration Docker
│   ├── nginx/              # Configuration Nginx
│   └── redis/              # Configuration Redis
├── docker-compose.yml        # Orchestration Docker
├── deploy.sh                 # Script de déploiement
└── README.md
```

## 🔒 Sécurité

### Authentification
- JWT avec rotation des tokens
- 2FA obligatoire avec TOTP
- Codes de sauvegarde chiffrés
- Protection contre le brute force

### Isolation des Données
- Row Level Security (RLS) sur PostgreSQL
- Validation stricte des accès cross-tenant
- Audit trail complet des actions
- Chiffrement des données sensibles

### Protection Réseau
- Rate limiting par IP et par entreprise
- Protection CSRF
- Headers de sécurité HTTP
- Validation stricte des entrées

## 📊 Monitoring et Observabilité

### Métriques Disponibles
- Performance des requêtes
- Utilisation des ressources par tenant
- Taux d'erreur et latence
- Activité utilisateur

### Logs Structurés
- Logs applicatifs avec Winston
- Logs d'audit pour compliance
- Logs de sécurité pour détection d'intrusion
- Corrélation des logs par tenant

## 🔧 Configuration Avancée

### Variables d'Environnement
Copiez `.env.docker` vers `.env` et modifiez selon vos besoins :

```bash
# Application
APP_NAME=Mon SaaS
APP_URL=https://mon-saas.com

# Base de données
DB_PASSWORD=mot_de_passe_securise

# JWT
JWT_SECRET=cle_secrete_32_caracteres_minimum

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@mon-saas.com
SMTP_PASS=mot_de_passe_app
```

### SSL/HTTPS
Pour activer HTTPS en production :

1. Placez vos certificats dans `docker/nginx/ssl/`
2. Décommentez la configuration HTTPS dans `docker/nginx/conf.d/default.conf`
3. Redémarrez Nginx : `docker-compose restart nginx`

### Scaling Horizontal
Pour gérer plus de charge :

```bash
# Augmenter le nombre d'instances backend
docker-compose up -d --scale backend=3

# Utiliser un load balancer externe
# Configurer Redis Cluster pour la haute disponibilité
# Utiliser PostgreSQL avec réplication
```

## 🐛 Dépannage

### Problèmes Courants

#### Services qui ne démarrent pas
```bash
# Vérifier les logs
docker-compose logs [service]

# Vérifier l'état des services
docker-compose ps

# Redémarrer les services
docker-compose restart
```

#### Problèmes de base de données
```bash
# Vérifier la connexion
docker-compose exec postgres pg_isready

# Réinitialiser la base de données
docker-compose down -v
docker-compose up -d postgres
docker-compose --profile migration run --rm migrator
```

#### Problèmes de permissions
```bash
# Vérifier les politiques RLS
docker-compose exec postgres psql -U saas_user -d saas_app -c "SELECT * FROM validate_tenant_isolation();"

# Réinitialiser les permissions
docker-compose --profile migration run --rm migrator rollback 1
docker-compose --profile migration run --rm migrator
```

## 📞 Support

Pour obtenir de l'aide :

1. Consultez les logs : `docker-compose logs -f`
2. Vérifiez la documentation des services
3. Ouvrez une issue sur le repository

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**🎉 Félicitations ! Votre application SaaS multi-tenant est maintenant déployée et prête à l'emploi !**

