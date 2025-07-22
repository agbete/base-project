import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/config/database';
import { logger } from '@/utils/logger';
import { authMiddleware, requirePermission, requireAnyPermission } from '@/middleware/auth';
import { tenantMiddleware, checkQuota } from '@/middleware/tenant';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';

const router = Router();

// Appliquer les middlewares globaux
router.use(authMiddleware);
router.use(tenantMiddleware);

// Interfaces
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  password?: string;
  sendInvitation?: boolean;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  preferences?: any;
}

interface UserFilters {
  search?: string;
  roleId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// LISTE DES UTILISATEURS
// ========================================

router.get('/', requirePermission('users.users.list'), asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    roleId,
    status = 'active',
    page = 1,
    limit = 25,
    sortBy = 'created_at',
    sortOrder = 'desc'
  }: UserFilters = req.query as any;
  
  const tenantId = req.tenantId;
  const offset = (Number(page) - 1) * Number(limit);
  
  // Construire la requête avec filtres
  let whereConditions = ['u.company_id = $1'];
  let queryParams: any[] = [tenantId];
  let paramIndex = 2;
  
  if (search) {
    whereConditions.push(`(
      u.first_name ILIKE $${paramIndex} OR 
      u.last_name ILIKE $${paramIndex} OR 
      u.email ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }
  
  if (roleId) {
    whereConditions.push(`u.role_id = $${paramIndex}`);
    queryParams.push(roleId);
    paramIndex++;
  }
  
  if (status) {
    whereConditions.push(`u.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  
  // Validation du tri
  const allowedSortFields = ['created_at', 'first_name', 'last_name', 'email', 'last_login_at'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  const whereClause = whereConditions.join(' AND ');
  
  // Requête principale
  const usersQuery = `
    SELECT 
      u.id, u.email, u.first_name as "firstName", u.last_name as "lastName",
      u.role_id as "roleId", u.status, u.is_super_admin as "isSuperAdmin",
      u.two_factor_enabled as "twoFactorEnabled", u.last_login_at as "lastLoginAt",
      u.created_at as "createdAt", u.updated_at as "updatedAt",
      u.preferences,
      r.name as "roleName",
      COUNT(*) OVER() as total_count
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE ${whereClause}
    ORDER BY u.${sortField} ${sortDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(Number(limit), offset);
  
  const users = await query(usersQuery, queryParams);
  
  const totalCount = users.length > 0 ? parseInt(users[0].total_count) : 0;
  const totalPages = Math.ceil(totalCount / Number(limit));
  
  // Nettoyer les données (supprimer total_count de chaque utilisateur)
  const cleanUsers = users.map(user => {
    const { total_count, ...cleanUser } = user;
    return cleanUser;
  });
  
  res.json({
    success: true,
    data: {
      users: cleanUsers,
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
// DÉTAILS D'UN UTILISATEUR
// ========================================

router.get('/:id', requirePermission('users.users.read'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  
  const users = await query(
    `SELECT 
      u.id, u.email, u.first_name as "firstName", u.last_name as "lastName",
      u.role_id as "roleId", u.status, u.is_super_admin as "isSuperAdmin",
      u.two_factor_enabled as "twoFactorEnabled", u.last_login_at as "lastLoginAt",
      u.failed_login_attempts as "failedLoginAttempts", u.locked_until as "lockedUntil",
      u.created_at as "createdAt", u.updated_at as "updatedAt",
      u.preferences,
      r.name as "roleName",
      COALESCE(
        json_agg(
          DISTINCT p.name
        ) FILTER (WHERE p.name IS NOT NULL), 
        '[]'::json
      ) as permissions
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = $1 AND u.company_id = $2
     GROUP BY u.id, r.name`,
    [id, tenantId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('User');
  }
  
  const user = users[0];
  
  res.json({
    success: true,
    data: user
  });
}));

// ========================================
// CRÉATION D'UTILISATEUR
// ========================================

router.post('/', 
  requirePermission('users.users.create'),
  checkQuota('users'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      email,
      firstName,
      lastName,
      roleId,
      password,
      sendInvitation = true
    }: CreateUserRequest = req.body;
    
    const tenantId = req.tenantId;
    const createdBy = req.user?.id;
    
    // Validation des données
    if (!email || !firstName || !lastName || !roleId) {
      throw new ValidationError('Email, firstName, lastName, and roleId are required');
    }
    
    if (!password && !sendInvitation) {
      throw new ValidationError('Password is required when not sending invitation');
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
    
    await transaction(async (client) => {
      // Vérifier que l'email n'existe pas déjà
      const existingUsers = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUsers.rows.length > 0) {
        throw new ConflictError('Email already exists');
      }
      
      // Vérifier que le rôle existe et appartient à la même entreprise
      const roles = await client.query(
        'SELECT id, name FROM roles WHERE id = $1 AND (company_id = $2 OR is_system = true)',
        [roleId, tenantId]
      );
      
      if (roles.rows.length === 0) {
        throw new ValidationError('Invalid role ID');
      }
      
      // Générer un mot de passe temporaire si nécessaire
      let passwordHash = null;
      let tempPassword = null;
      
      if (password) {
        const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
        passwordHash = await bcrypt.hash(password, saltRounds);
      } else if (sendInvitation) {
        // Générer un mot de passe temporaire
        tempPassword = generateTempPassword();
        const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
        passwordHash = await bcrypt.hash(tempPassword, saltRounds);
      }
      
      // Créer l'utilisateur
      const result = await client.query(
        `INSERT INTO users (
          email, first_name, last_name, password_hash, company_id, role_id,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, created_at`,
        [
          email.toLowerCase(),
          firstName,
          lastName,
          passwordHash,
          tenantId,
          roleId,
          'active',
          createdBy
        ]
      );
      
      const newUser = result.rows[0];
      
      // TODO: Envoyer l'invitation par email si demandé
      if (sendInvitation) {
        // await sendUserInvitation(email, firstName, tempPassword);
        logger.info('User invitation should be sent', {
          userId: newUser.id,
          email,
          tempPassword: '[REDACTED]',
        });
      }
      
      logger.info('User created', {
        userId: newUser.id,
        email,
        createdBy,
        tenantId,
      });
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: newUser.id,
          email,
          firstName,
          lastName,
          roleId,
          status: 'active',
          createdAt: newUser.created_at,
          invitationSent: sendInvitation,
        }
      });
    });
  })
);

// ========================================
// MISE À JOUR D'UTILISATEUR
// ========================================

router.put('/:id', requirePermission('users.users.update'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    roleId,
    status,
    preferences
  }: UpdateUserRequest = req.body;
  
  const tenantId = req.tenantId;
  const updatedBy = req.user?.id;
  
  await transaction(async (client) => {
    // Vérifier que l'utilisateur existe et appartient à la même entreprise
    const existingUsers = await client.query(
      'SELECT id, email, role_id FROM users WHERE id = $1 AND company_id = $2',
      [id, tenantId]
    );
    
    if (existingUsers.rows.length === 0) {
      throw new NotFoundError('User');
    }
    
    const existingUser = existingUsers.rows[0];
    
    // Vérifier le rôle si fourni
    if (roleId && roleId !== existingUser.role_id) {
      const roles = await client.query(
        'SELECT id FROM roles WHERE id = $1 AND (company_id = $2 OR is_system = true)',
        [roleId, tenantId]
      );
      
      if (roles.rows.length === 0) {
        throw new ValidationError('Invalid role ID');
      }
    }
    
    // Construire la requête de mise à jour
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (firstName !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      updateValues.push(firstName);
      paramIndex++;
    }
    
    if (lastName !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      updateValues.push(lastName);
      paramIndex++;
    }
    
    if (roleId !== undefined) {
      updateFields.push(`role_id = $${paramIndex}`);
      updateValues.push(roleId);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    if (preferences !== undefined) {
      updateFields.push(`preferences = $${paramIndex}`);
      updateValues.push(JSON.stringify(preferences));
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      throw new ValidationError('No fields to update');
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramIndex}`);
    updateValues.push(updatedBy);
    paramIndex++;
    
    // ID et company_id pour la clause WHERE
    updateValues.push(id, tenantId);
    
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex - 1} AND company_id = $${paramIndex}
      RETURNING id, updated_at
    `;
    
    const result = await client.query(updateQuery, updateValues);
    
    logger.info('User updated', {
      userId: id,
      updatedBy,
      tenantId,
      changes: { firstName, lastName, roleId, status, preferences: !!preferences },
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id,
        updatedAt: result.rows[0].updated_at,
      }
    });
  });
}));

// ========================================
// SUPPRESSION D'UTILISATEUR
// ========================================

router.delete('/:id', requirePermission('users.users.delete'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const deletedBy = req.user?.id;
  
  // Vérifier qu'on ne supprime pas son propre compte
  if (id === deletedBy) {
    throw new ValidationError('Cannot delete your own account');
  }
  
  await transaction(async (client) => {
    // Vérifier que l'utilisateur existe
    const existingUsers = await client.query(
      'SELECT id, email FROM users WHERE id = $1 AND company_id = $2',
      [id, tenantId]
    );
    
    if (existingUsers.rows.length === 0) {
      throw new NotFoundError('User');
    }
    
    const user = existingUsers.rows[0];
    
    // Soft delete - marquer comme supprimé
    await client.query(
      `UPDATE users 
       SET status = 'inactive', 
           deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [deletedBy, id, tenantId]
    );
    
    logger.info('User deleted', {
      userId: id,
      userEmail: user.email,
      deletedBy,
      tenantId,
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  });
}));

// ========================================
// CHANGEMENT DE MOT DE PASSE
// ========================================

router.post('/:id/change-password', 
  requireAnyPermission(['users.users.update', 'users.own.update']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const tenantId = req.tenantId;
    const requestingUserId = req.user?.id;
    
    if (!newPassword) {
      throw new ValidationError('New password is required');
    }
    
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }
    
    // Si l'utilisateur change son propre mot de passe, vérifier l'ancien
    const isOwnPassword = id === requestingUserId;
    
    await transaction(async (client) => {
      const users = await client.query(
        'SELECT id, password_hash FROM users WHERE id = $1 AND company_id = $2',
        [id, tenantId]
      );
      
      if (users.rows.length === 0) {
        throw new NotFoundError('User');
      }
      
      const user = users.rows[0];
      
      // Vérifier l'ancien mot de passe si c'est le sien
      if (isOwnPassword) {
        if (!currentPassword) {
          throw new ValidationError('Current password is required');
        }
        
        const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!passwordValid) {
          throw new ValidationError('Current password is incorrect');
        }
      }
      
      // Hasher le nouveau mot de passe
      const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Mettre à jour le mot de passe
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, id]
      );
      
      logger.info('Password changed', {
        userId: id,
        changedBy: requestingUserId,
        isOwnPassword,
        tenantId,
      });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    });
  })
);

// ========================================
// STATISTIQUES DES UTILISATEURS
// ========================================

router.get('/stats/overview', requirePermission('users.users.list'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  
  const stats = await query(
    `SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE status = 'active') as active_users,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
      COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
      COUNT(*) FILTER (WHERE two_factor_enabled = true) as users_with_2fa,
      COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as active_last_30_days,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30_days
     FROM users 
     WHERE company_id = $1`,
    [tenantId]
  );
  
  const roleStats = await query(
    `SELECT 
      r.name as role_name,
      COUNT(u.id) as user_count
     FROM roles r
     LEFT JOIN users u ON r.id = u.role_id AND u.company_id = $1
     WHERE r.company_id = $1 OR r.is_system = true
     GROUP BY r.id, r.name
     ORDER BY user_count DESC`,
    [tenantId]
  );
  
  res.json({
    success: true,
    data: {
      overview: stats[0],
      roleDistribution: roleStats,
    }
  });
}));

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default router;

