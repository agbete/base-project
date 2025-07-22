# 🚀 Application Web Multi-Entreprise (SaaS)

Une application web moderne multi-entreprise avec architecture microservices, isolation complète des données et système de permissions granulaires.

## 🏗️ Architecture

### Stack Technologique
- **Frontend** : Next.js 14+ (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend** : Node.js + Express.js + TypeScript
- **Base de données** : PostgreSQL avec Row Level Security (RLS)
- **Cache** : Redis pour sessions et données fréquentes
- **Authentification** : JWT + 2FA avec QR codes
- **File d'attente** : Bull Queue pour les tâches asynchrones

### Services Disponibles
```typescript
const availableServices = {
  'auth': { required: true, description: 'Service d\'authentification' },
  'users': { required: true, description: 'Gestion des utilisateurs' },
  'settings': { required: true, description: 'Paramètres système' },
  'crm': { required: false, description: 'Gestion clients/prospects' },
  'inventory': { required: false, description: 'Gestion des stocks' },
  'invoicing': { required: false, description: 'Facturation' },
  'reporting': { required: false, description: 'Rapports et analytics' }
};
```

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+
- Docker et Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation Rapide
```bash
# Cloner le repository
git clone <repository-url>
cd base-project

# Démarrer avec Docker
docker-compose up -d

# L'application sera disponible sur :
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Base de données: localhost:5432
# Redis: localhost:6379
```

### Installation Manuelle

#### 1. Base de données
```bash
# Créer la base de données
createdb saas_app

# Exécuter les migrations
cd database
psql -d saas_app -f migrations/001_create_companies.sql
psql -d saas_app -f migrations/002_create_users.sql
# ... autres migrations

# Charger les données de test
psql -d saas_app -f seeds/companies.sql
psql -d saas_app -f seeds/users.sql
```

#### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurer les variables d'environnement
npm run dev
```

#### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Configurer les variables d'environnement
npm run dev
```

## 🔐 Fonctionnalités Principales

### Authentification & Sécurité
- ✅ Connexion/déconnexion sécurisée
- ✅ 2FA/MFA obligatoire avec QR codes
- ✅ Récupération mot de passe par email
- ✅ Sessions JWT avec refresh tokens
- ✅ Protection CSRF et rate limiting

### Multi-Entreprise
- ✅ Isolation complète des données (RLS)
- ✅ Sélecteur d'entreprise pour super admin
- ✅ Paramètres par entreprise (branding, services)
- ✅ Quotas et limites configurables

### Permissions Granulaires
- ✅ Format `service.table.action`
- ✅ Rôles prédéfinis et personnalisés
- ✅ Interface de gestion intuitive
- ✅ Validation automatique des accès

### Interface Utilisateur
- ✅ Design responsive mobile-first
- ✅ Thème adaptatif (clair/sombre)
- ✅ DataTables avec filtres avancés
- ✅ Composants réutilisables Shadcn/ui

### Fonctionnalités Avancées
- ✅ Générateur de codes automatique
- ✅ Multi-langues par entreprise
- ✅ PWA avec support offline
- ✅ Système de paramètres à 3 niveaux

## 📊 Structure du Projet

```
project/
├── frontend/                 # Application Next.js 14+
│   ├── app/                 # App Router pages
│   ├── components/          # Composants réutilisables
│   ├── lib/                 # Utilitaires et configurations
│   └── public/              # Assets statiques
├── backend/                 # API Node.js + Express
│   ├── services/            # Services métier
│   ├── middleware/          # Middlewares Express
│   ├── routes/              # Routes API
│   └── utils/               # Utilitaires
├── database/                # Base de données
│   ├── migrations/          # Migrations SQL
│   └── seeds/               # Données de test
├── docker/                  # Configuration Docker
└── docs/                    # Documentation
```

## 🔧 Configuration

### Variables d'Environnement

#### Backend (.env)
```env
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/saas_app
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email (pour 2FA et récupération)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 2FA
TOTP_SERVICE_NAME=SaaS App
TOTP_ISSUER=Your Company

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=SaaS App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Tests

```bash
# Backend
cd backend
npm test
npm run test:coverage

# Frontend
cd frontend
npm test
npm run test:e2e
```

## 📈 Performance

- **Temps de réponse** : < 200ms pour les requêtes standard
- **Couverture de tests** : > 80% du backend
- **Sécurité** : Audit automatisé sans failles critiques
- **Mobile** : Interface parfaitement responsive
- **PWA** : Fonctionnement offline vérifié

## 🔒 Sécurité

### Mesures Implémentées
- Row Level Security (RLS) PostgreSQL
- Validation stricte des accès cross-tenant
- Protection contre les attaques CSRF
- Rate limiting par entreprise
- Chiffrement des données sensibles
- Audit trail complet

### Quotas et Limites
- CPU : Max 20% par entreprise
- RAM : Limites par plan tarifaire
- Stockage : Quotas configurables
- Requêtes : Rate limiting intelligent

## 📚 Documentation

- [Guide d'Installation](docs/installation.md)
- [Documentation API](docs/api.md)
- [Guide Administrateur](docs/admin.md)
- [Architecture Technique](docs/architecture.md)
- [Guide de Développement](docs/development.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- 📧 Email : support@yourcompany.com
- 📖 Documentation : [docs.yourcompany.com](https://docs.yourcompany.com)
- 🐛 Issues : [GitHub Issues](https://github.com/yourcompany/base-project/issues)

---

**Développé avec ❤️ pour une expérience SaaS exceptionnelle**

