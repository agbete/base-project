import { Router, Request, Response } from 'express';
import { query, transaction } from '@/config/database';
import { invalidateTenantCache } from '@/middleware/tenant';
import { invalidateUserCache } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { authMiddleware, requirePermission, requireSuperAdmin } from '@/middleware/auth';
import { tenantMiddleware } from '@/middleware/tenant';
import { 
  ValidationError, 
  NotFoundError,
  asyncHandler 
} from '@/middleware/errorHandler';

const router = Router();

// Appliquer les middlewares globaux
router.use(authMiddleware);
router.use(tenantMiddleware);

// Interfaces
interface SystemSettings {
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIps: string[];
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number; // en jours
    };
    sessionTimeout: number; // en minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // en minutes
  };
  features: {
    registrationEnabled: boolean;
    twoFactorRequired: boolean;
    emailVerificationRequired: boolean;
  };
  limits: {
    maxCompanies: number;
    maxUsersPerCompany: number;
    maxStoragePerCompany: string;
    maxApiCallsPerHour: number;
  };
}

interface CompanySettings {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    favicon?: string;
  };
  activeServices: string[];
  quotas: {
    maxUsers: number;
    maxStorage: string;
    maxApiCalls: number;
  };
  regional: {
    timezone: string;
    currency: string;
    locale: string;
    dateFormat: string;
    timeFormat: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    webhookUrl?: string;
  };
  security: {
    passwordPolicy?: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    twoFactorRequired: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
  };
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    desktop: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
  accessibility: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
  };
}

// ========================================
// PARAMÈTRES SYSTÈME (Super Admin uniquement)
// ========================================

router.get('/system', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  // Pour cette démo, on retourne des paramètres par défaut
  // En production, ces paramètres seraient stockés en base de données
  const systemSettings: SystemSettings = {
    maintenance: {
      enabled: false,
      message: 'System maintenance in progress. Please try again later.',
      allowedIps: ['127.0.0.1', '::1']
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxAge: 90
      },
      sessionTimeout: 60, // 1 heure
      maxLoginAttempts: 5,
      lockoutDuration: 30 // 30 minutes
    },
    features: {
      registrationEnabled: true,
      twoFactorRequired: false,
      emailVerificationRequired: true
    },
    limits: {
      maxCompanies: 1000,
      maxUsersPerCompany: 10000,
      maxStoragePerCompany: '1TB',
      maxApiCallsPerHour: 100000
    }
  };
  
  res.json({
    success: true,
    data: systemSettings
  });
}));

router.put('/system', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const settings: Partial<SystemSettings> = req.body;
  const updatedBy = req.user?.id;
  
  // TODO: Implémenter la sauvegarde des paramètres système en base de données
  // Pour cette démo, on simule la mise à jour
  
  logger.info('System settings updated', {
    updatedBy,
    settings: Object.keys(settings),
  });
  
  res.json({
    success: true,
    message: 'System settings updated successfully',
    data: settings
  });
}));

// ========================================
// PARAMÈTRES D'ENTREPRISE
// ========================================

router.get('/company', requirePermission('settings.company.read'), asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.user?.companyId;
  
  if (!companyId) {
    throw new ValidationError('Company ID not found');
  }
  
  const companies = await query(
    'SELECT id, name, slug, plan, settings FROM companies WHERE id = $1',
    [companyId]
  );
  
  if (companies.length === 0) {
    throw new NotFoundError('Company');
  }
  
  const company = companies[0];
  
  res.json({
    success: true,
    data: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      plan: company.plan,
      settings: company.settings || {}
    }
  });
}));

router.put('/company', requirePermission('settings.company.update'), asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.user?.companyId;
  const settings: Partial<CompanySettings> = req.body;
  const updatedBy = req.user?.id;
  
  if (!companyId) {
    throw new ValidationError('Company ID not found');
  }
  
  await transaction(async (client) => {
    // Récupérer les paramètres actuels
    const companies = await client.query(
      'SELECT settings FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companies.rows.length === 0) {
      throw new NotFoundError('Company');
    }
    
    const currentSettings = companies.rows[0].settings || {};
    
    // Fusionner les paramètres (deep merge)
    const mergedSettings = deepMerge(currentSettings, settings);
    
    // Mettre à jour en base de données
    await client.query(
      'UPDATE companies SET settings = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
      [JSON.stringify(mergedSettings), updatedBy, companyId]
    );
    
    // Invalider le cache
    await invalidateTenantCache(companyId);
    
    logger.info('Company settings updated', {
      companyId,
      updatedBy,
      settingsKeys: Object.keys(settings),
    });
    
    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: {
        settings: mergedSettings,
        updatedAt: new Date().toISOString()
      }
    });
  });
}));

// ========================================
// PARAMÈTRES UTILISATEUR
// ========================================

router.get('/user', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new ValidationError('User ID not found');
  }
  
  const users = await query(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('User');
  }
  
  const preferences = users[0].preferences || getDefaultUserPreferences();
  
  res.json({
    success: true,
    data: preferences
  });
}));

router.put('/user', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const preferences: Partial<UserPreferences> = req.body;
  
  if (!userId) {
    throw new ValidationError('User ID not found');
  }
  
  await transaction(async (client) => {
    // Récupérer les préférences actuelles
    const users = await client.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );
    
    if (users.rows.length === 0) {
      throw new NotFoundError('User');
    }
    
    const currentPreferences = users.rows[0].preferences || getDefaultUserPreferences();
    
    // Fusionner les préférences
    const mergedPreferences = deepMerge(currentPreferences, preferences);
    
    // Mettre à jour en base de données
    await client.query(
      'UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(mergedPreferences), userId]
    );
    
    // Invalider le cache utilisateur
    await invalidateUserCache(userId);
    
    logger.info('User preferences updated', {
      userId,
      preferencesKeys: Object.keys(preferences),
    });
    
    res.json({
      success: true,
      message: 'User preferences updated successfully',
      data: {
        preferences: mergedPreferences,
        updatedAt: new Date().toISOString()
      }
    });
  });
}));

// ========================================
// SERVICES DISPONIBLES
// ========================================

router.get('/services', requirePermission('settings.company.read'), asyncHandler(async (req: Request, res: Response) => {
  const availableServices = {
    auth: {
      name: 'Authentication',
      description: 'User authentication and authorization',
      required: true,
      category: 'core'
    },
    users: {
      name: 'User Management',
      description: 'Manage users, roles and permissions',
      required: true,
      category: 'core'
    },
    settings: {
      name: 'Settings',
      description: 'System and company settings',
      required: true,
      category: 'core'
    },
    crm: {
      name: 'CRM',
      description: 'Customer relationship management',
      required: false,
      category: 'business'
    },
    inventory: {
      name: 'Inventory',
      description: 'Stock and inventory management',
      required: false,
      category: 'business'
    },
    invoicing: {
      name: 'Invoicing',
      description: 'Invoice and billing management',
      required: false,
      category: 'business'
    },
    reporting: {
      name: 'Reporting',
      description: 'Reports and analytics',
      required: false,
      category: 'analytics'
    },
    notifications: {
      name: 'Notifications',
      description: 'Email, SMS and push notifications',
      required: false,
      category: 'communication'
    },
    api: {
      name: 'API Access',
      description: 'REST API access for integrations',
      required: false,
      category: 'integration'
    },
    webhooks: {
      name: 'Webhooks',
      description: 'Webhook integrations',
      required: false,
      category: 'integration'
    }
  };
  
  // Récupérer les services activés pour l'entreprise
  const companyId = req.user?.companyId;
  const companies = await query(
    'SELECT settings FROM companies WHERE id = $1',
    [companyId]
  );
  
  const activeServices = companies[0]?.settings?.activeServices || ['auth', 'users', 'settings'];
  
  // Marquer les services actifs
  const servicesWithStatus = Object.entries(availableServices).map(([key, service]) => ({
    key,
    ...service,
    active: activeServices.includes(key)
  }));
  
  res.json({
    success: true,
    data: {
      services: servicesWithStatus,
      activeServices,
      categories: ['core', 'business', 'analytics', 'communication', 'integration']
    }
  });
}));

router.put('/services', requirePermission('settings.company.update'), asyncHandler(async (req: Request, res: Response) => {
  const { activeServices } = req.body;
  const companyId = req.user?.companyId;
  const updatedBy = req.user?.id;
  
  if (!Array.isArray(activeServices)) {
    throw new ValidationError('activeServices must be an array');
  }
  
  // Vérifier que les services obligatoires sont inclus
  const requiredServices = ['auth', 'users', 'settings'];
  const missingRequired = requiredServices.filter(service => !activeServices.includes(service));
  
  if (missingRequired.length > 0) {
    throw new ValidationError(`Required services missing: ${missingRequired.join(', ')}`);
  }
  
  await transaction(async (client) => {
    // Récupérer les paramètres actuels
    const companies = await client.query(
      'SELECT settings FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companies.rows.length === 0) {
      throw new NotFoundError('Company');
    }
    
    const currentSettings = companies.rows[0].settings || {};
    const updatedSettings = {
      ...currentSettings,
      activeServices
    };
    
    // Mettre à jour en base de données
    await client.query(
      'UPDATE companies SET settings = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
      [JSON.stringify(updatedSettings), updatedBy, companyId]
    );
    
    // Invalider le cache
    await invalidateTenantCache(companyId);
    
    logger.info('Active services updated', {
      companyId,
      updatedBy,
      activeServices,
    });
    
    res.json({
      success: true,
      message: 'Active services updated successfully',
      data: {
        activeServices,
        updatedAt: new Date().toISOString()
      }
    });
  });
}));

// ========================================
// THÈMES ET BRANDING
// ========================================

router.get('/themes', asyncHandler(async (req: Request, res: Response) => {
  const themes = [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean and modern default theme',
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#F59E0B',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1F2937'
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Dark theme for low-light environments',
      colors: {
        primary: '#60A5FA',
        secondary: '#3B82F6',
        accent: '#FBBF24',
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB'
      }
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Professional corporate theme',
      colors: {
        primary: '#1E40AF',
        secondary: '#1E3A8A',
        accent: '#059669',
        background: '#FFFFFF',
        surface: '#F1F5F9',
        text: '#0F172A'
      }
    }
  ];
  
  res.json({
    success: true,
    data: themes
  });
}));

// ========================================
// LANGUES DISPONIBLES
// ========================================

router.get('/languages', asyncHandler(async (req: Request, res: Response) => {
  const languages = [
    { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
  ];
  
  res.json({
    success: true,
    data: languages
  });
}));

// ========================================
// FUSEAUX HORAIRES
// ========================================

router.get('/timezones', asyncHandler(async (req: Request, res: Response) => {
  const timezones = [
    { value: 'Europe/Paris', label: 'Paris (UTC+1)', offset: '+01:00' },
    { value: 'Europe/London', label: 'London (UTC+0)', offset: '+00:00' },
    { value: 'America/New_York', label: 'New York (UTC-5)', offset: '-05:00' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)', offset: '-08:00' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)', offset: '+09:00' },
    { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)', offset: '+08:00' },
    { value: 'Australia/Sydney', label: 'Sydney (UTC+10)', offset: '+10:00' },
    { value: 'UTC', label: 'UTC', offset: '+00:00' }
  ];
  
  res.json({
    success: true,
    data: timezones
  });
}));

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

function getDefaultUserPreferences(): UserPreferences {
  return {
    theme: 'system',
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    notifications: {
      email: true,
      push: true,
      sms: false,
      desktop: true
    },
    dashboard: {
      layout: 'default',
      widgets: ['overview', 'recent-activity', 'quick-actions']
    },
    accessibility: {
      highContrast: false,
      fontSize: 'medium',
      reducedMotion: false
    }
  };
}

export default router;

