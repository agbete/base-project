# 📚 Documentation API

## 🔗 URL de Base
```
http://localhost:3001
```

## 🔐 Authentification

L'API utilise l'authentification JWT avec des tokens d'accès et de rafraîchissement.

### Headers Requis
```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-Tenant-ID: <company_id>
```

## 📋 Endpoints

### 🏥 Health Check

#### GET /health
Vérification de santé basique de l'API.

**Réponse:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### GET /health/detailed
Vérification de santé détaillée avec statut des services.

**Réponse:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 5
    },
    "redis": {
      "status": "connected",
      "responseTime": 2
    },
    "memory": {
      "used": "150 MB",
      "free": "850 MB",
      "usage": "15%"
    }
  }
}
```

### 🔐 Authentification

#### POST /api/auth/login
Connexion utilisateur.

**Corps de la requête:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "totpCode": "123456"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "companyId": "uuid",
      "role": {
        "id": "uuid",
        "name": "Admin",
        "permissions": ["users.create", "users.read"]
      }
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 900
    }
  }
}
```

#### POST /api/auth/refresh
Rafraîchir le token d'accès.

**Corps de la requête:**
```json
{
  "refreshToken": "refresh_token"
}
```

#### POST /api/auth/logout
Déconnexion utilisateur.

#### POST /api/auth/forgot-password
Demande de réinitialisation de mot de passe.

**Corps de la requête:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
Réinitialisation du mot de passe.

**Corps de la requête:**
```json
{
  "token": "reset_token",
  "password": "new_password"
}
```

#### POST /api/auth/setup-2fa
Configuration de l'authentification 2FA.

**Réponse:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "secret_key",
    "backupCodes": ["code1", "code2", "..."]
  }
}
```

#### POST /api/auth/verify-2fa
Vérification et activation de la 2FA.

**Corps de la requête:**
```json
{
  "totpCode": "123456"
}
```

### 👥 Utilisateurs

#### GET /api/users
Lister les utilisateurs.

**Paramètres de requête:**
- `page` (number): Numéro de page (défaut: 1)
- `limit` (number): Nombre d'éléments par page (défaut: 10)
- `search` (string): Recherche par nom ou email
- `role` (string): Filtrer par rôle
- `status` (string): Filtrer par statut

**Réponse:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "active",
        "role": {
          "id": "uuid",
          "name": "Admin"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### GET /api/users/:id
Obtenir un utilisateur par ID.

#### POST /api/users
Créer un nouvel utilisateur.

**Corps de la requête:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "password123",
  "roleId": "uuid"
}
```

#### PUT /api/users/:id
Mettre à jour un utilisateur.

#### DELETE /api/users/:id
Supprimer un utilisateur.

### 🏢 Entreprises

#### GET /api/companies
Lister les entreprises (Super Admin uniquement).

#### GET /api/companies/:id
Obtenir une entreprise par ID.

#### POST /api/companies
Créer une nouvelle entreprise.

**Corps de la requête:**
```json
{
  "name": "ACME Corp",
  "slug": "acme-corp",
  "plan": "enterprise",
  "settings": {
    "branding": {
      "primaryColor": "#1E40AF",
      "companyName": "ACME Corp"
    },
    "activeServices": ["auth", "users", "crm"]
  }
}
```

#### PUT /api/companies/:id
Mettre à jour une entreprise.

### 🎭 Rôles

#### GET /api/roles
Lister les rôles.

**Paramètres de requête:**
- `includeSystem` (boolean): Inclure les rôles système

#### GET /api/roles/:id
Obtenir un rôle par ID.

#### POST /api/roles
Créer un nouveau rôle.

**Corps de la requête:**
```json
{
  "name": "Manager",
  "description": "Gestionnaire avec accès limité",
  "permissions": ["users.read", "crm.clients.create"]
}
```

#### PUT /api/roles/:id
Mettre à jour un rôle.

#### DELETE /api/roles/:id
Supprimer un rôle.

### 🔑 Permissions

#### GET /api/permissions
Lister toutes les permissions disponibles.

**Paramètres de requête:**
- `service` (string): Filtrer par service
- `resource` (string): Filtrer par ressource
- `action` (string): Filtrer par action

**Réponse:**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "uuid",
        "name": "users.users.create",
        "description": "Créer un utilisateur",
        "service": "users",
        "resource": "users",
        "action": "create"
      }
    ],
    "groupedByService": {
      "users": [
        {
          "id": "uuid",
          "name": "users.users.create",
          "description": "Créer un utilisateur"
        }
      ]
    }
  }
}
```

### ⚙️ Paramètres

#### GET /api/settings/company
Obtenir les paramètres de l'entreprise.

#### PUT /api/settings/company
Mettre à jour les paramètres de l'entreprise.

**Corps de la requête:**
```json
{
  "branding": {
    "primaryColor": "#1E40AF",
    "secondaryColor": "#3B82F6",
    "companyName": "ACME Corp",
    "logo": "/logos/acme.png"
  },
  "regional": {
    "timezone": "Europe/Paris",
    "currency": "EUR",
    "locale": "fr-FR"
  }
}
```

#### GET /api/settings/user
Obtenir les préférences utilisateur.

#### PUT /api/settings/user
Mettre à jour les préférences utilisateur.

**Corps de la requête:**
```json
{
  "theme": "dark",
  "language": "fr",
  "timezone": "Europe/Paris",
  "notifications": {
    "email": true,
    "push": false
  }
}
```

#### GET /api/settings/system
Obtenir les paramètres système (Super Admin uniquement).

#### PUT /api/settings/system
Mettre à jour les paramètres système (Super Admin uniquement).

## 📊 Codes de Réponse

| Code | Description |
|------|-------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Requête invalide |
| 401  | Non authentifié |
| 403  | Accès interdit |
| 404  | Ressource non trouvée |
| 409  | Conflit (ressource existe déjà) |
| 422  | Données invalides |
| 429  | Trop de requêtes |
| 500  | Erreur serveur |

## 🔒 Gestion des Erreurs

Format standard des erreurs :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": [
      {
        "field": "email",
        "message": "L'email est requis"
      }
    ]
  }
}
```

## 🚦 Rate Limiting

- **Limite générale**: 100 requêtes par 15 minutes par IP
- **Authentification**: 5 tentatives par 15 minutes par IP
- **API sensibles**: Limites spécifiques selon l'endpoint

Headers de réponse :
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## 🔍 Pagination

Format standard pour les listes paginées :

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "pages": 15,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🏷️ Filtrage et Recherche

Paramètres de requête standards :
- `search`: Recherche textuelle
- `sort`: Champ de tri (ex: `name`, `-createdAt`)
- `filter[field]`: Filtrage par champ
- `page`: Numéro de page
- `limit`: Éléments par page

Exemple :
```
GET /api/users?search=john&sort=-createdAt&filter[status]=active&page=2&limit=20
```

## 🔐 Permissions Requises

Chaque endpoint nécessite des permissions spécifiques :

| Endpoint | Permission Requise |
|----------|-------------------|
| GET /api/users | `users.users.list` |
| POST /api/users | `users.users.create` |
| PUT /api/users/:id | `users.users.update` |
| DELETE /api/users/:id | `users.users.delete` |

## 📝 Exemples d'Utilisation

### Connexion et utilisation de l'API

```javascript
// 1. Connexion
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@acme-corp.com',
    password: 'admin123'
  })
});

const { data } = await loginResponse.json();
const { accessToken } = data.tokens;
const { companyId } = data.user;

// 2. Utilisation de l'API
const usersResponse = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Tenant-ID': companyId,
    'Content-Type': 'application/json'
  }
});

const users = await usersResponse.json();
```

### Création d'un utilisateur

```javascript
const newUser = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-Tenant-ID': companyId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@acme-corp.com',
    firstName: 'Jane',
    lastName: 'Doe',
    password: 'securePassword123',
    roleId: 'role-uuid'
  })
});
```

