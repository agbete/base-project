-- ========================================
-- SEED 001: PERMISSIONS SYSTÈME
-- ========================================

-- Supprimer les permissions existantes pour éviter les doublons
DELETE FROM role_permissions;
DELETE FROM permissions;

-- ========================================
-- PERMISSIONS AUTHENTIFICATION
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'auth.sessions.create', 'Se connecter au système', 'auth', 'sessions', 'create'),
(uuid_generate_v4(), 'auth.sessions.delete', 'Se déconnecter du système', 'auth', 'sessions', 'delete'),
(uuid_generate_v4(), 'auth.password.update', 'Changer son mot de passe', 'auth', 'password', 'update'),
(uuid_generate_v4(), 'auth.profile.read', 'Voir son profil', 'auth', 'profile', 'read'),
(uuid_generate_v4(), 'auth.profile.update', 'Modifier son profil', 'auth', 'profile', 'update'),
(uuid_generate_v4(), 'auth.2fa.setup', 'Configurer l''authentification 2FA', 'auth', '2fa', 'create'),
(uuid_generate_v4(), 'auth.2fa.disable', 'Désactiver l''authentification 2FA', 'auth', '2fa', 'delete');

-- ========================================
-- PERMISSIONS UTILISATEURS
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'users.users.list', 'Lister les utilisateurs', 'users', 'users', 'list'),
(uuid_generate_v4(), 'users.users.read', 'Voir les détails d''un utilisateur', 'users', 'users', 'read'),
(uuid_generate_v4(), 'users.users.create', 'Créer un utilisateur', 'users', 'users', 'create'),
(uuid_generate_v4(), 'users.users.update', 'Modifier un utilisateur', 'users', 'users', 'update'),
(uuid_generate_v4(), 'users.users.delete', 'Supprimer un utilisateur', 'users', 'users', 'delete'),
(uuid_generate_v4(), 'users.own.update', 'Modifier ses propres informations', 'users', 'own', 'update');

-- ========================================
-- PERMISSIONS RÔLES
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'users.roles.list', 'Lister les rôles', 'users', 'roles', 'list'),
(uuid_generate_v4(), 'users.roles.read', 'Voir les détails d''un rôle', 'users', 'roles', 'read'),
(uuid_generate_v4(), 'users.roles.create', 'Créer un rôle', 'users', 'roles', 'create'),
(uuid_generate_v4(), 'users.roles.update', 'Modifier un rôle', 'users', 'roles', 'update'),
(uuid_generate_v4(), 'users.roles.delete', 'Supprimer un rôle', 'users', 'roles', 'delete');

-- ========================================
-- PERMISSIONS PERMISSIONS
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'users.permissions.list', 'Lister les permissions', 'users', 'permissions', 'list'),
(uuid_generate_v4(), 'users.permissions.read', 'Voir les détails d''une permission', 'users', 'permissions', 'read');

-- ========================================
-- PERMISSIONS PARAMÈTRES
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'settings.company.read', 'Voir les paramètres de l''entreprise', 'settings', 'company', 'read'),
(uuid_generate_v4(), 'settings.company.update', 'Modifier les paramètres de l''entreprise', 'settings', 'company', 'update'),
(uuid_generate_v4(), 'settings.user.read', 'Voir ses préférences utilisateur', 'settings', 'user', 'read'),
(uuid_generate_v4(), 'settings.user.update', 'Modifier ses préférences utilisateur', 'settings', 'user', 'update'),
(uuid_generate_v4(), 'settings.system.read', 'Voir les paramètres système', 'settings', 'system', 'read'),
(uuid_generate_v4(), 'settings.system.update', 'Modifier les paramètres système', 'settings', 'system', 'update');

-- ========================================
-- PERMISSIONS CRM
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'crm.clients.list', 'Lister les clients', 'crm', 'clients', 'list'),
(uuid_generate_v4(), 'crm.clients.read', 'Voir les détails d''un client', 'crm', 'clients', 'read'),
(uuid_generate_v4(), 'crm.clients.create', 'Créer un client', 'crm', 'clients', 'create'),
(uuid_generate_v4(), 'crm.clients.update', 'Modifier un client', 'crm', 'clients', 'update'),
(uuid_generate_v4(), 'crm.clients.delete', 'Supprimer un client', 'crm', 'clients', 'delete'),
(uuid_generate_v4(), 'crm.contacts.list', 'Lister les contacts', 'crm', 'contacts', 'list'),
(uuid_generate_v4(), 'crm.contacts.read', 'Voir les détails d''un contact', 'crm', 'contacts', 'read'),
(uuid_generate_v4(), 'crm.contacts.create', 'Créer un contact', 'crm', 'contacts', 'create'),
(uuid_generate_v4(), 'crm.contacts.update', 'Modifier un contact', 'crm', 'contacts', 'update'),
(uuid_generate_v4(), 'crm.contacts.delete', 'Supprimer un contact', 'crm', 'contacts', 'delete');

-- ========================================
-- PERMISSIONS INVENTAIRE
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'inventory.products.list', 'Lister les produits', 'inventory', 'products', 'list'),
(uuid_generate_v4(), 'inventory.products.read', 'Voir les détails d''un produit', 'inventory', 'products', 'read'),
(uuid_generate_v4(), 'inventory.products.create', 'Créer un produit', 'inventory', 'products', 'create'),
(uuid_generate_v4(), 'inventory.products.update', 'Modifier un produit', 'inventory', 'products', 'update'),
(uuid_generate_v4(), 'inventory.products.delete', 'Supprimer un produit', 'inventory', 'products', 'delete'),
(uuid_generate_v4(), 'inventory.stock.list', 'Voir les niveaux de stock', 'inventory', 'stock', 'list'),
(uuid_generate_v4(), 'inventory.stock.update', 'Modifier les niveaux de stock', 'inventory', 'stock', 'update');

-- ========================================
-- PERMISSIONS FACTURATION
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'invoicing.invoices.list', 'Lister les factures', 'invoicing', 'invoices', 'list'),
(uuid_generate_v4(), 'invoicing.invoices.read', 'Voir les détails d''une facture', 'invoicing', 'invoices', 'read'),
(uuid_generate_v4(), 'invoicing.invoices.create', 'Créer une facture', 'invoicing', 'invoices', 'create'),
(uuid_generate_v4(), 'invoicing.invoices.update', 'Modifier une facture', 'invoicing', 'invoices', 'update'),
(uuid_generate_v4(), 'invoicing.invoices.delete', 'Supprimer une facture', 'invoicing', 'invoices', 'delete'),
(uuid_generate_v4(), 'invoicing.payments.list', 'Lister les paiements', 'invoicing', 'payments', 'list'),
(uuid_generate_v4(), 'invoicing.payments.create', 'Enregistrer un paiement', 'invoicing', 'payments', 'create');

-- ========================================
-- PERMISSIONS RAPPORTS
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'reporting.reports.list', 'Lister les rapports', 'reporting', 'reports', 'list'),
(uuid_generate_v4(), 'reporting.reports.read', 'Voir un rapport', 'reporting', 'reports', 'read'),
(uuid_generate_v4(), 'reporting.reports.create', 'Créer un rapport', 'reporting', 'reports', 'create'),
(uuid_generate_v4(), 'reporting.analytics.read', 'Voir les analytics', 'reporting', 'analytics', 'read'),
(uuid_generate_v4(), 'reporting.exports.create', 'Exporter des données', 'reporting', 'exports', 'create');

-- ========================================
-- PERMISSIONS API
-- ========================================

INSERT INTO permissions (id, name, description, service, resource, action) VALUES
(uuid_generate_v4(), 'api.tokens.list', 'Lister les tokens API', 'api', 'tokens', 'list'),
(uuid_generate_v4(), 'api.tokens.create', 'Créer un token API', 'api', 'tokens', 'create'),
(uuid_generate_v4(), 'api.tokens.delete', 'Supprimer un token API', 'api', 'tokens', 'delete'),
(uuid_generate_v4(), 'api.webhooks.list', 'Lister les webhooks', 'api', 'webhooks', 'list'),
(uuid_generate_v4(), 'api.webhooks.create', 'Créer un webhook', 'api', 'webhooks', 'create'),
(uuid_generate_v4(), 'api.webhooks.update', 'Modifier un webhook', 'api', 'webhooks', 'update'),
(uuid_generate_v4(), 'api.webhooks.delete', 'Supprimer un webhook', 'api', 'webhooks', 'delete');

-- Afficher le nombre de permissions créées
SELECT 
    service,
    COUNT(*) as permission_count
FROM permissions 
GROUP BY service 
ORDER BY service;

