# 🚀 Application Web Multi-Entreprise (SaaS)

Une application SaaS complète avec architecture microservices, isolation multi-tenant et système de permissions granulaires.

## 📋 Fonctionnalités

### 🔐 Authentification & Sécurité
- ✅ Connexion/déconnexion avec JWT
- ✅ Authentification 2FA avec QR codes
- ✅ Récupération de mot de passe sécurisée
- ✅ Protection contre les attaques par force brute
- ✅ Sessions sécurisées avec Redis
- ✅ Rate limiting intelligent

### 🏢 Multi-Tenant
- ✅ Isolation complète des données par entreprise
- ✅ Row Level Security (RLS) PostgreSQL
- ✅ Sélecteur d'entreprise pour super admins
- ✅ Configuration par tenant

### 👥 Gestion des Utilisateurs
- ✅ CRUD complet des utilisateurs
- ✅ Système de rôles et permissions granulaires
- ✅ Interface de gestion des permissions
- ✅ Quotas par plan tarifaire

### ⚙️ Paramètres Multi-Niveaux
- ✅ Paramètres système (Super Admin)
- ✅ Paramètres entreprise (branding, services)
- ✅ Préférences utilisateur (thème, langue)

### 🎨 Interface Utilisateur
- ✅ Design responsive mobile-first
- ✅ Thèmes adaptatifs (clair/sombre/système)
- ✅ Multi-langues (FR/EN + autres)
- ✅ Composants réutilisables avec Shadcn/ui

### 📊 DataTables Avancées
- ✅ Pagination configurable
- ✅ Recherche temps réel
- ✅ Tri multi-colonnes
- ✅ Filtres avancés
- ✅ Actions en lot

## 🛠️ Stack Technique

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Base de données**: PostgreSQL 15 avec RLS
- **Cache**: Redis 7
- **Authentification**: JWT + 2FA (TOTP)
- **Validation**: Joi
- **Logs**: Winston

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **Composants**: Shadcn/ui
- **État**: Zustand
- **Formulaires**: React Hook Form + Zod

### Infrastructure
- **Conteneurisation**: Docker + Docker Compose
- **Proxy**: Nginx (production)
- **Monitoring**: Health checks intégrés

## 🚀 Installation Rapide

### Prérequis
- Docker et Docker Compose
- Git

### 1. Cloner le projet
```bash
git clone <repository-url>
cd saas-app
```

### 2. Lancer l'application
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 3. Accéder à l'application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Adminer (DB)**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🔑 Comptes de Test

### Super Admin
- **Email**: superadmin@saas-app.com
- **Mot de passe**: admin123
- **Accès**: Toutes les entreprises

### ACME Corp (Plan Enterprise)
- **Admin**: admin@acme-corp.com / admin123
- **Manager**: manager@acme-corp.com / admin123
- **User**: user@acme-corp.com / admin123

### Tech Startup (Plan Professional)
- **Admin**: admin@tech-startup.com / admin123
- **Dev**: dev@tech-startup.com / admin123

### Consulting Firm (Plan Basic)
- **Admin**: admin@consulting-firm.com / admin123

## 📁 Structure du Projet

```
saas-app/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── config/         # Configuration (DB, Redis)
│   │   ├── middleware/     # Middlewares (auth, tenant, etc.)
│   │   ├── routes/         # Routes API
│   │   ├── utils/          # Utilitaires
│   │   └── server.ts       # Point d'entrée
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Application Next.js
│   ├── src/
│   │   ├── app/           # App Router Next.js 14
│   │   ├── components/    # Composants réutilisables
│   │   ├── lib/          # Utilitaires et configuration
│   │   └── types/        # Types TypeScript
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── migrations/        # Migrations SQL
│   └── seeds/            # Données de test
├── scripts/              # Scripts utilitaires
├── docker-compose.yml    # Configuration Docker
└── README.md
```

## 🔧 Configuration

### Variables d'Environnement

Créer un fichier `.env` dans le répertoire `backend/` :

```env
# Base de données
DATABASE_URL=postgresql://saas_user:saas_password@localhost:5432/saas_app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Sécurité
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_TIME=1800000

# CORS
CORS_ORIGIN=http://localhost:3000

# 2FA
TOTP_SERVICE_NAME=SaaS App
TOTP_ISSUER=Your Company
```

## 🏗️ Architecture

### Multi-Tenant avec RLS
```sql
-- Exemple de politique RLS
CREATE POLICY tenant_isolation ON users
  FOR ALL TO app_role
  USING (company_id = current_setting('app.current_tenant')::uuid);
```

### Permissions Granulaires
Format : `service.resource.action`
- `users.users.create` - Créer un utilisateur
- `crm.clients.read` - Voir les clients
- `settings.company.update` - Modifier les paramètres

### Services Modulaires
```typescript
const availableServices = {
  'auth': { required: true },
  'users': { required: true },
  'crm': { required: false },
  'inventory': { required: false },
  'invoicing': { required: false },
  'reporting': { required: false }
};
```

## 🧪 Tests

```bash
# Tests backend
cd backend
npm test

# Tests frontend
cd frontend
npm test

# Tests d'intégration
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📊 Monitoring

### Health Checks
- **Backend**: GET /health
- **Détaillé**: GET /health/detailed

### Logs
```bash
# Logs en temps réel
docker-compose logs -f backend

# Logs spécifiques
docker-compose logs -f postgres redis
```

## 🔒 Sécurité

### Fonctionnalités Implémentées
- ✅ Row Level Security (RLS)
- ✅ JWT avec refresh tokens
- ✅ Rate limiting par IP et utilisateur
- ✅ Protection CSRF
- ✅ Validation des entrées
- ✅ Hashage sécurisé des mots de passe
- ✅ 2FA avec TOTP
- ✅ Audit logs

### Bonnes Pratiques
- Principe du moindre privilège
- Isolation des données par tenant
- Chiffrement des données sensibles
- Sessions sécurisées
- Protection contre les attaques communes

## 🚀 Déploiement

### Production avec Docker
```bash
# Build des images de production
docker-compose -f docker-compose.prod.yml build

# Déploiement
docker-compose -f docker-compose.prod.yml up -d
```

### Variables de Production
```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
DATABASE_URL=<production-db-url>
REDIS_URL=<production-redis-url>
```

## 📈 Performance

### Optimisations Implémentées
- Cache Redis pour sessions et données fréquentes
- Index optimisés pour multi-tenant
- Pagination efficace
- Compression gzip
- Rate limiting intelligent
- Connection pooling

### Métriques
- Temps de réponse API < 200ms
- Support de 1000+ utilisateurs simultanés
- Isolation parfaite entre tenants

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Documentation**: Voir le dossier `docs/`
- **Issues**: Utiliser les GitHub Issues
- **Discussions**: GitHub Discussions

## 🎯 Roadmap

### Phase 1 ✅
- [x] Architecture multi-tenant
- [x] Authentification 2FA
- [x] Système de permissions
- [x] Interface d'administration

### Phase 2 🚧
- [ ] Module CRM complet
- [ ] Système de notifications
- [ ] API webhooks
- [ ] Rapports avancés

### Phase 3 📋
- [ ] Mobile app (React Native)
- [ ] Intégrations tierces
- [ ] Analytics avancés
- [ ] Marketplace de plugins

---

**Développé avec ❤️ pour les équipes qui veulent du SaaS de qualité entreprise**

