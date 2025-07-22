# ========================================
# DOCKERFILE MULTI-STAGE POUR BACKEND NODE.JS
# ========================================

# ========================================
# STAGE BASE: Configuration commune
# ========================================
FROM node:18-alpine AS base

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    curl \
    bash \
    git \
    python3 \
    make \
    g++

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de configuration des dépendances
COPY package*.json ./
COPY tsconfig.json ./

# ========================================
# STAGE DEPENDENCIES: Installation des dépendances
# ========================================
FROM base AS dependencies

# Installer toutes les dépendances (dev + prod)
RUN npm ci --include=dev

# ========================================
# STAGE DEVELOPMENT: Environnement de développement
# ========================================
FROM dependencies AS development

# Copier le code source
COPY . .

# Créer le répertoire des logs
RUN mkdir -p logs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=development
ENV PORT=3001
ENV HOST=0.0.0.0

# Commande par défaut pour le développement (avec hot reload)
CMD ["npm", "run", "dev"]

# ========================================
# STAGE BUILD: Compilation TypeScript
# ========================================
FROM dependencies AS build

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Supprimer les dépendances de développement
RUN npm ci --only=production && npm cache clean --force

# ========================================
# STAGE PRODUCTION: Image finale optimisée
# ========================================
FROM node:18-alpine AS production

# Installer curl pour les health checks
RUN apk add --no-cache curl

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Copier les dépendances de production depuis le stage build
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier le code compilé
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Créer le répertoire des logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Changer vers l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Commande par défaut pour la production
CMD ["node", "dist/server.js"]

# ========================================
# STAGE WORKER: Worker pour les tâches asynchrones
# ========================================
FROM production AS worker

# Commande pour le worker
CMD ["node", "dist/worker.js"]

