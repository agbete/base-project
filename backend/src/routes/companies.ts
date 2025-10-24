import { Router, Request, Response } from 'express';
import { query, transaction } from '@/config/database';
import { invalidateTenantCache } from '@/middleware/tenant';
import { logger } from '@/utils/logger';
import { authMiddleware, requireSuperAdmin, requirePermission } from '@/middleware/auth';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';

const router = Router();

// Appliquer l'authentification
router.use(authMiddleware);

// Interfaces
interface CreateCompanyRequest {
  name: string;
  slug: string;
  plan: 'basic' | 'professional' | 'enterprise';
  settings: {
    branding: {
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
      companyName: string;
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
    };
  };
}

interface UpdateCompanyRequest {
  name?: string;
  slug?: string;
  plan?: 'basic' | 'professional' | 'enterprise';
  status?: 'active' | 'suspended' | 'inactive';
  settings?: any;
}

// ========================================
// LISTE DES ENTREPRISES (Super Admin uniquement)
// ========================================

router.get('/', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    plan,
    status = 'active',
    page = 1,
    limit = 25,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query as any;
  
  const offset = (Number(page) - 1) * Number(limit);
  
  // Construire la requête avec filtres
  let whereConditions = ['1=1'];
  let queryParams: any[] = [];
  let paramIndex = 1;
  
  if (search) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }
  
  if (plan) {
    whereConditions.push(`plan = $${paramIndex}`);
    queryParams.push(plan);
    paramIndex++;
  }
  
  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  
  // Validation du tri
  const allowedSortFields = ['created_at', 'name', 'plan', 'status'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  const whereClause = whereConditions.join(' AND ');
  
  // Requête principale avec statistiques
  const companiesQuery = `
    SELECT 
      c.id, c.name, c.slug, c.plan, c.status, c.settings,
      c.created_at as "createdAt", c.updated_at as "updatedAt",
      COUNT(u.id) as "userCount",
      COUNT(u.id) FILTER (WHERE u.status = 'active') as "activeUserCount",
      COUNT(*) OVER() as total_count
    FROM companies c
    LEFT JOIN users u ON c.id = u.company_id
    WHERE ${whereClause}
    GROUP BY c.id
    ORDER BY c.${sortField} ${sortDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(Number(limit), offset);
  
  const companies = await query(companiesQuery, queryParams);
  
  const totalCount = companies.length > 0 ? parseInt(companies[0].total_count) : 0;
  const totalPages = Math.ceil(totalCount / Number(limit));
  
  // Nettoyer les données
  const cleanCompanies = companies.map(company => {
    const { total_count, ...cleanCompany } = company;
    return {
      ...cleanCompany,
      userCount: parseInt(cleanCompany.userCount),
      activeUserCount: parseInt(cleanCompany.activeUserCount),
    };
  });
  
  res.json({
    success: true,
    data: {
      companies: cleanCompanies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      }
    }
  });
}));

// ========================================
// DÉTAILS D'UNE ENTREPRISE
// ========================================

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  
  // Vérifier les permissions
  if (!user?.isSuperAdmin && user?.companyId !== id) {
    throw new ValidationError('Access denied to this company');
  }
  
  const companies = await query(
    `SELECT 
      c.id, c.name, c.slug, c.plan, c.status, c.settings,
      c.created_at as "createdAt", c.updated_at as "updatedAt",
      COUNT(u.id) as "userCount",
      COUNT(u.id) FILTER (WHERE u.status = 'active') as "activeUserCount",
      COUNT(u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '30 days') as "activeUsersLast30Days"
     FROM companies c
     LEFT JOIN users u ON c.id = u.company_id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  
  if (companies.length === 0) {
    throw new NotFoundError('Company');
  }
  
  const company = companies[0];
  
  // Statistiques additionnelles pour les super admins
  let additionalStats = {};
  if (user?.isSuperAdmin) {
    const stats = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE u.created_at > NOW() - INTERVAL '30 days') as "newUsersLast30Days",
        MAX(u.last_login_at) as "lastUserActivity",
        COUNT(*) FILTER (WHERE u.two_factor_enabled = true) as "usersWithTwoFactor"
       FROM users u
       WHERE u.company_id = $1`,
      [id]
    );
    
    additionalStats = stats[0] || {};
  }
  
  res.json({
    success: true,
    data: {
      ...company,
      userCount: parseInt(company.userCount),
      activeUserCount: parseInt(company.activeUserCount),
      activeUsersLast30Days: parseInt(company.activeUsersLast30Days),
      ...additionalStats,
    }
  });
}));

// ========================================
// CRÉATION D'ENTREPRISE (Super Admin uniquement)
// ========================================

router.post('/', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    slug,
    plan = 'basic',
    settings
  }: CreateCompanyRequest = req.body;
  
  const createdBy = req.user?.id;
  
  // Validation des données
  if (!name || !slug) {
    throw new ValidationError('Name and slug are required');
  }
  
  // Validation du slug (format URL-friendly)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
  }
  
  // Validation du plan
  const validPlans = ['basic', 'professional', 'enterprise'];
  if (!validPlans.includes(plan)) {
    throw new ValidationError('Invalid plan');
  }
  
  // Paramètres par défaut
  const defaultSettings = {
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      companyName: name,
      ...settings?.branding,
    },
    activeServices: ['auth', 'users', 'settings', ...(settings?.activeServices || [])],
    quotas: {
      maxUsers: plan === 'basic' ? 10 : plan === 'professional' ? 100 : 1000,
      maxStorage: plan === 'basic' ? '1GB' : plan === 'professional' ? '10GB' : '100GB',
      maxApiCalls: plan === 'basic' ? 1000 : plan === 'professional' ? 10000 : 100000,
      ...settings?.quotas,
    },
    regional: {
      timezone: 'Europe/Paris',
      currency: 'EUR',
      locale: 'fr-FR',
      dateFormat: 'DD/MM/YYYY',
      ...settings?.regional,
    },
    ...settings,
  };
  
  await transaction(async (client) => {
    // Vérifier que le slug n'existe pas déjà
    const existingCompanies = await client.query(
      'SELECT id FROM companies WHERE slug = $1',
      [slug]
    );
    
    if (existingCompanies.rows.length > 0) {
      throw new ConflictError('Slug already exists');
    }
    
    // Créer l'entreprise
    const result = await client.query(
      `INSERT INTO companies (
        name, slug, plan, status, settings, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, created_at`,
      [name, slug, plan, 'active', JSON.stringify(defaultSettings), createdBy]
    );
    
    const newCompany = result.rows[0];
    
    logger.info('Company created', {
      companyId: newCompany.id,
      name,
      slug,
      plan,
      createdBy,
    });
    
    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        id: newCompany.id,
        name,
        slug,
        plan,
        status: 'active',
        settings: defaultSettings,
        createdAt: newCompany.created_at,
      }
    });
  });
}));

// ========================================
// MISE À JOUR D'ENTREPRISE
// ========================================

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    slug,
    plan,
    status,
    settings
  }: UpdateCompanyRequest = req.body;
  
  const user = req.user;
  const updatedBy = user?.id;
  
  // Vérifier les permissions
  const canUpdateCompany = user?.isSuperAdmin || 
    (user?.companyId === id && user?.permissions.includes('settings.company.update'));
  
  if (!canUpdateCompany) {
    throw new ValidationError('Insufficient permissions to update this company');
  }
  
  // Les non-super-admins ne peuvent pas changer le plan ou le statut
  if (!user?.isSuperAdmin && (plan !== undefined || status !== undefined)) {
    throw new ValidationError('Only super admins can change plan or status');
  }
  
  await transaction(async (client) => {
    // Vérifier que l'entreprise existe
    const existingCompanies = await client.query(
      'SELECT id, slug, settings FROM companies WHERE id = $1',
      [id]
    );
    
    if (existingCompanies.rows.length === 0) {
      throw new NotFoundError('Company');
    }
    
    const existingCompany = existingCompanies.rows[0];
    
    // Vérifier le slug si modifié
    if (slug && slug !== existingCompany.slug) {
      const slugExists = await client.query(
        'SELECT id FROM companies WHERE slug = $1 AND id != $2',
        [slug, id]
      );
      
      if (slugExists.rows.length > 0) {
        throw new ConflictError('Slug already exists');
      }
    }
    
    // Construire la requête de mise à jour
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    
    if (slug !== undefined) {
      updateFields.push(`slug = $${paramIndex}`);
      updateValues.push(slug);
      paramIndex++;
    }
    
    if (plan !== undefined) {
      updateFields.push(`plan = $${paramIndex}`);
      updateValues.push(plan);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    if (settings !== undefined) {
      // Fusionner avec les paramètres existants
      const currentSettings = existingCompany.settings || {};
      const mergedSettings = { ...currentSettings, ...settings };
      
      updateFields.push(`settings = $${paramIndex}`);
      updateValues.push(JSON.stringify(mergedSettings));
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      throw new ValidationError('No fields to update');
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramIndex}`);
    updateValues.push(updatedBy);
    paramIndex++;
    
    // ID pour la clause WHERE
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE companies 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, updated_at
    `;
    
    const result = await client.query(updateQuery, updateValues);
    
    // Invalider le cache de tenant
    await invalidateTenantCache(id);
    
    logger.info('Company updated', {
      companyId: id,
      updatedBy,
      changes: { name, slug, plan, status, settings: !!settings },
    });
    
    res.json({
      success: true,
      message: 'Company updated successfully',
      data: {
        id,
        updatedAt: result.rows[0].updated_at,
      }
    });
  });
}));

// ========================================
// SUPPRESSION D'ENTREPRISE (Super Admin uniquement)
// ========================================

router.delete('/:id', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deletedBy = req.user?.id;
  
  await transaction(async (client) => {
    // Vérifier que l'entreprise existe
    const existingCompanies = await client.query(
      'SELECT id, name FROM companies WHERE id = $1',
      [id]
    );
    
    if (existingCompanies.rows.length === 0) {
      throw new NotFoundError('Company');
    }
    
    const company = existingCompanies.rows[0];
    
    // Vérifier qu'il n'y a pas d'utilisateurs actifs
    const activeUsers = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (parseInt(activeUsers.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete company with active users');
    }
    
    // Soft delete - marquer comme supprimé
    await client.query(
      `UPDATE companies 
       SET status = 'inactive', 
           deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [deletedBy, id]
    );
    
    // Invalider le cache
    await invalidateTenantCache(id);
    
    logger.info('Company deleted', {
      companyId: id,
      companyName: company.name,
      deletedBy,
    });
    
    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  });
}));

// ========================================
// STATISTIQUES GLOBALES (Super Admin uniquement)
// ========================================

router.get('/stats/global', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const stats = await query(
    `SELECT 
      COUNT(*) as total_companies,
      COUNT(*) FILTER (WHERE status = 'active') as active_companies,
      COUNT(*) FILTER (WHERE status = 'suspended') as suspended_companies,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive_companies,
      COUNT(*) FILTER (WHERE plan = 'basic') as basic_plan,
      COUNT(*) FILTER (WHERE plan = 'professional') as professional_plan,
      COUNT(*) FILTER (WHERE plan = 'enterprise') as enterprise_plan,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30_days
     FROM companies`
  );
  
  const userStats = await query(
    `SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE status = 'active') as active_users,
      COUNT(DISTINCT company_id) as companies_with_users
     FROM users`
  );
  
  res.json({
    success: true,
    data: {
      companies: stats[0],
      users: userStats[0],
    }
  });
}));

// ========================================
// PARAMÈTRES DE L'ENTREPRISE COURANTE
// ========================================

router.get('/current/settings', requirePermission('settings.company.read'), asyncHandler(async (req: Request, res: Response) => {
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
    data: company
  });
}));

router.put('/current/settings', requirePermission('settings.company.update'), asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.user?.companyId;
  const { settings } = req.body;
  const updatedBy = req.user?.id;
  
  if (!companyId) {
    throw new ValidationError('Company ID not found');
  }
  
  if (!settings) {
    throw new ValidationError('Settings are required');
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
    const mergedSettings = { ...currentSettings, ...settings };
    
    // Mettre à jour les paramètres
    await client.query(
      'UPDATE companies SET settings = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3',
      [JSON.stringify(mergedSettings), updatedBy, companyId]
    );
    
    // Invalider le cache
    await invalidateTenantCache(companyId);
    
    logger.info('Company settings updated', {
      companyId,
      updatedBy,
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        settings: mergedSettings,
      }
    });
  });
}));

export default router;

