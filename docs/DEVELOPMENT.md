# 🛠️ Guide de Développement

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Docker et Docker Compose
- Git

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd saas-app

# Démarrer l'application
./scripts/start.sh
```

## 🏗️ Architecture du Projet

### Structure des Dossiers
```
saas-app/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── config/         # Configuration (DB, Redis)
│   │   ├── middleware/     # Middlewares (auth, tenant, etc.)
│   │   ├── routes/         # Routes API
│   │   ├── utils/          # Utilitaires
│   │   ├── __tests__/      # Tests
│   │   ├── server.ts       # Point d'entrée serveur
│   │   └── worker.ts       # Worker pour tâches async
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Application Next.js (à créer)
├── database/
│   ├── migrations/        # Migrations SQL
│   └── seeds/            # Données de test
├── scripts/              # Scripts utilitaires
├── docs/                 # Documentation
└── docker-compose.yml    # Configuration Docker
```

### Technologies Utilisées

#### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Langage**: TypeScript
- **Base de données**: PostgreSQL 15 avec RLS
- **Cache**: Redis 7
- **Authentification**: JWT + 2FA (TOTP)
- **Validation**: Joi
- **Tests**: Jest + Supertest
- **Logs**: Winston
- **Queue**: Bull (Redis)

#### Frontend (à implémenter)
- **Framework**: Next.js 14 (App Router)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **Composants**: Shadcn/ui
- **État**: Zustand
- **Formulaires**: React Hook Form + Zod

## 🔧 Configuration de Développement

### Variables d'Environnement

Copier le fichier d'exemple :
```bash
cp backend/.env.example backend/.env
```

Principales variables à configurer :
```env
# Base de données
DATABASE_URL=postgresql://saas_user:saas_password@localhost:5432/saas_app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT (CHANGEZ EN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key
```

### Base de Données

#### Migrations
Les migrations sont automatiquement exécutées au démarrage de Docker.

Pour exécuter manuellement :
```bash
# Se connecter à la base
docker-compose exec postgres psql -U saas_user -d saas_app

# Exécuter une migration
\i /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql
```

#### Seeds
Les données de test sont automatiquement insérées.

Comptes de test disponibles :
- Super Admin: `superadmin@saas-app.com` / `admin123`
- ACME Admin: `admin@acme-corp.com` / `admin123`
- ACME Manager: `manager@acme-corp.com` / `admin123`

### Redis

Interface de gestion : http://localhost:8081

Commandes utiles :
```bash
# Se connecter à Redis
docker-compose exec redis redis-cli

# Voir toutes les clés
KEYS *

# Vider le cache
FLUSHDB
```

## 🧪 Tests

### Exécution des Tests
```bash
# Tests unitaires
cd backend
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

### Structure des Tests
```
backend/src/__tests__/
├── setup.ts              # Configuration globale
├── health.test.ts         # Tests de santé
├── auth.test.ts          # Tests d'authentification
├── users.test.ts         # Tests utilisateurs
└── ...
```

### Écriture de Tests

Exemple de test d'endpoint :
```typescript
import request from 'supertest';
import { app } from '../server';

describe('Users API', () => {
  it('should list users', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-ID', companyId)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.users).toBeInstanceOf(Array);
  });
});
```

## 🔍 Debugging

### Logs
```bash
# Voir tous les logs
docker-compose logs -f

# Logs spécifiques
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Debug avec VSCode

Configuration `.vscode/launch.json` :
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app"
    }
  ]
}
```

Démarrer en mode debug :
```bash
# Modifier docker-compose.yml pour ajouter --inspect
command: ["node", "--inspect=0.0.0.0:9229", "dist/server.js"]
```

### Outils de Développement

#### Adminer (Interface DB)
- URL: http://localhost:8080
- Serveur: postgres
- Utilisateur: saas_user
- Mot de passe: saas_password
- Base: saas_app

#### Redis Commander
- URL: http://localhost:8081

## 🔐 Sécurité

### Row Level Security (RLS)

Chaque requête doit définir le tenant courant :
```sql
-- Configurer le tenant pour la session
SELECT configure_rls_session('company-uuid'::uuid);

-- Maintenant toutes les requêtes sont filtrées
SELECT * FROM users; -- Ne retourne que les users de cette company
```

### Middleware de Tenant

Le middleware `tenant.ts` injecte automatiquement le `company_id` :
```typescript
// Middleware appliqué automatiquement
app.use('/api', tenantMiddleware);

// Dans les routes, req.companyId est disponible
router.get('/users', (req, res) => {
  const companyId = req.companyId; // Injecté par le middleware
});
```

### Permissions

Vérification des permissions :
```typescript
import { requirePermission } from '../middleware/auth';

// Protéger une route
router.post('/users', 
  requirePermission('users.users.create'),
  createUser
);
```

## 📊 Performance

### Optimisations Implémentées

1. **Cache Redis** : Sessions et données fréquentes
2. **Index DB** : Optimisés pour multi-tenant
3. **Connection Pooling** : PostgreSQL
4. **Compression** : Gzip sur les réponses
5. **Rate Limiting** : Protection contre les abus

### Monitoring

#### Health Checks
- Basic: `GET /health`
- Détaillé: `GET /health/detailed`

#### Métriques
```bash
# Statistiques Redis
docker-compose exec redis redis-cli info stats

# Statistiques PostgreSQL
docker-compose exec postgres psql -U saas_user -d saas_app -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables;
"
```

## 🚀 Déploiement

### Environnements

#### Développement
```bash
docker-compose up -d
```

#### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Variables de Production

Créer un fichier `.env.production` :
```env
NODE_ENV=production
JWT_SECRET=<strong-random-secret-256-bits>
DATABASE_URL=<production-database-url>
REDIS_URL=<production-redis-url>
```

### Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Secrets JWT générés aléatoirement
- [ ] Base de données de production configurée
- [ ] Redis de production configuré
- [ ] Certificats SSL installés
- [ ] Monitoring configuré
- [ ] Sauvegardes automatiques activées

## 🔄 Workflow de Développement

### Branches
- `main` : Production
- `develop` : Développement
- `feature/*` : Nouvelles fonctionnalités
- `hotfix/*` : Corrections urgentes

### Processus
1. Créer une branche feature depuis develop
2. Développer et tester localement
3. Créer une Pull Request vers develop
4. Review et tests automatiques
5. Merge vers develop
6. Déploiement en staging
7. Merge vers main pour production

### Commits
Format des messages :
```
type(scope): description

feat(auth): add 2FA support
fix(users): resolve pagination bug
docs(api): update authentication endpoints
```

## 🛠️ Commandes Utiles

### Docker
```bash
# Reconstruire les images
docker-compose build --no-cache

# Voir les logs en temps réel
docker-compose logs -f backend

# Exécuter une commande dans un conteneur
docker-compose exec backend npm test

# Nettoyer les volumes
docker-compose down -v
```

### Base de Données
```bash
# Backup
docker-compose exec postgres pg_dump -U saas_user saas_app > backup.sql

# Restore
docker-compose exec -T postgres psql -U saas_user saas_app < backup.sql

# Connexion interactive
docker-compose exec postgres psql -U saas_user -d saas_app
```

### Redis
```bash
# Connexion
docker-compose exec redis redis-cli

# Vider le cache
docker-compose exec redis redis-cli FLUSHDB

# Statistiques
docker-compose exec redis redis-cli INFO
```

## 🐛 Résolution de Problèmes

### Problèmes Courants

#### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
lsof -i :3001

# Tuer le processus
kill -9 <PID>
```

#### Base de données non accessible
```bash
# Vérifier le statut
docker-compose ps postgres

# Redémarrer le service
docker-compose restart postgres

# Voir les logs
docker-compose logs postgres
```

#### Redis non accessible
```bash
# Vérifier la connexion
docker-compose exec redis redis-cli ping

# Redémarrer
docker-compose restart redis
```

### Logs de Debug

Activer les logs détaillés :
```env
LOG_LEVEL=debug
```

### Reset Complet
```bash
# Arrêter et supprimer tout
docker-compose down -v --remove-orphans

# Supprimer les images
docker system prune -a

# Redémarrer
./scripts/start.sh --clean
```

## 📚 Ressources

### Documentation
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/documentation)
- [Jest](https://jestjs.io/docs/getting-started)

### Outils Recommandés
- **IDE**: VSCode avec extensions TypeScript
- **Client DB**: DBeaver ou pgAdmin
- **Client Redis**: RedisInsight
- **API Testing**: Postman ou Insomnia
- **Git GUI**: GitKraken ou SourceTree

## 🤝 Contribution

### Standards de Code
- ESLint + Prettier configurés
- Tests obligatoires pour nouvelles fonctionnalités
- Documentation des API endpoints
- Messages de commit descriptifs

### Review Process
1. Code review obligatoire
2. Tests automatiques passants
3. Couverture de tests > 80%
4. Documentation mise à jour

---

**Happy Coding! 🚀**

