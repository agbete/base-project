import { Router, Request, Response } from 'express';
import { query, transaction } from '@/config/database';
import { logger } from '@/utils/logger';
import { authMiddleware, requirePermission } from '@/middleware/auth';
import { tenantMiddleware } from '@/middleware/tenant';
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
interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// ========================================
// LISTE DES RÔLES
// ========================================

router.get('/', requirePermission('users.roles.list'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  const includeSystem = req.query.includeSystem === 'true';
  
  let whereClause = 'WHERE (company_id = $1 OR is_system = true)';
  let queryParams = [tenantId];
  
  if (!includeSystem) {
    whereClause = 'WHERE company_id = $1';
  }
  
  const roles = await query(
    `SELECT 
      r.id, r.name, r.description, r.is_system as "isSystem",
      r.created_at as "createdAt", r.updated_at as "updatedAt",
      COUNT(u.id) as "userCount",
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'service', p.service,
            'resource', p.resource,
            'action', p.action
          )
        ) FILTER (WHERE p.id IS NOT NULL), 
        '[]'::json
      ) as permissions
     FROM roles r
     LEFT JOIN users u ON r.id = u.role_id AND u.company_id = $1
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     ${whereClause}
     GROUP BY r.id
     ORDER BY r.is_system DESC, r.name ASC`,
    queryParams
  );
  
  // Convertir userCount en nombre
  const processedRoles = roles.map(role => ({
    ...role,
    userCount: parseInt(role.userCount) || 0,
  }));
  
  res.json({
    success: true,
    data: processedRoles
  });
}));

// ========================================
// DÉTAILS D'UN RÔLE
// ========================================

router.get('/:id', requirePermission('users.roles.read'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  
  const roles = await query(
    `SELECT 
      r.id, r.name, r.description, r.is_system as "isSystem",
      r.company_id as "companyId", r.created_at as "createdAt", 
      r.updated_at as "updatedAt",
      COUNT(u.id) as "userCount",
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'service', p.service,
            'resource', p.resource,
            'action', p.action
          )
        ) FILTER (WHERE p.id IS NOT NULL), 
        '[]'::json
      ) as permissions
     FROM roles r
     LEFT JOIN users u ON r.id = u.role_id AND u.company_id = $2
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE r.id = $1 AND (r.company_id = $2 OR r.is_system = true)
     GROUP BY r.id`,
    [id, tenantId]
  );
  
  if (roles.length === 0) {
    throw new NotFoundError('Role');
  }
  
  const role = roles[0];
  role.userCount = parseInt(role.userCount) || 0;
  
  res.json({
    success: true,
    data: role
  });
}));

// ========================================
// CRÉATION DE RÔLE
// ========================================

router.post('/', requirePermission('users.roles.create'), asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    description,
    permissions = []
  }: CreateRoleRequest = req.body;
  
  const tenantId = req.tenantId;
  const createdBy = req.user?.id;
  
  // Validation des données
  if (!name) {
    throw new ValidationError('Role name is required');
  }
  
  if (name.length < 2 || name.length > 50) {
    throw new ValidationError('Role name must be between 2 and 50 characters');
  }
  
  await transaction(async (client) => {
    // Vérifier que le nom n'existe pas déjà dans cette entreprise
    const existingRoles = await client.query(
      'SELECT id FROM roles WHERE name = $1 AND company_id = $2',
      [name, tenantId]
    );
    
    if (existingRoles.rows.length > 0) {
      throw new ConflictError('Role name already exists in this company');
    }
    
    // Vérifier que toutes les permissions existent
    if (permissions.length > 0) {
      const validPermissions = await client.query(
        'SELECT id FROM permissions WHERE id = ANY($1)',
        [permissions]
      );
      
      if (validPermissions.rows.length !== permissions.length) {
        throw new ValidationError('Some permissions do not exist');
      }
    }
    
    // Créer le rôle
    const result = await client.query(
      `INSERT INTO roles (
        name, description, company_id, is_system, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, false, $4, NOW(), NOW())
      RETURNING id, created_at`,
      [name, description || null, tenantId, createdBy]
    );
    
    const newRole = result.rows[0];
    
    // Associer les permissions
    if (permissions.length > 0) {
      const permissionInserts = permissions.map((permissionId: string) => 
        `('${newRole.id}', '${permissionId}')`
      ).join(', ');
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionInserts}`
      );
    }
    
    logger.info('Role created', {
      roleId: newRole.id,
      name,
      tenantId,
      createdBy,
      permissionCount: permissions.length,
    });
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        id: newRole.id,
        name,
        description,
        permissions,
        createdAt: newRole.created_at,
      }
    });
  });
}));

// ========================================
// MISE À JOUR DE RÔLE
// ========================================

router.put('/:id', requirePermission('users.roles.update'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    description,
    permissions
  }: UpdateRoleRequest = req.body;
  
  const tenantId = req.tenantId;
  const updatedBy = req.user?.id;
  
  await transaction(async (client) => {
    // Vérifier que le rôle existe et appartient à cette entreprise
    const existingRoles = await client.query(
      'SELECT id, name, is_system FROM roles WHERE id = $1 AND company_id = $2',
      [id, tenantId]
    );
    
    if (existingRoles.rows.length === 0) {
      throw new NotFoundError('Role');
    }
    
    const existingRole = existingRoles.rows[0];
    
    // Ne pas permettre la modification des rôles système
    if (existingRole.is_system) {
      throw new ValidationError('Cannot modify system roles');
    }
    
    // Vérifier le nom si modifié
    if (name && name !== existingRole.name) {
      const nameExists = await client.query(
        'SELECT id FROM roles WHERE name = $1 AND company_id = $2 AND id != $3',
        [name, tenantId, id]
      );
      
      if (nameExists.rows.length > 0) {
        throw new ConflictError('Role name already exists');
      }
    }
    
    // Vérifier les permissions si fournies
    if (permissions && permissions.length > 0) {
      const validPermissions = await client.query(
        'SELECT id FROM permissions WHERE id = ANY($1)',
        [permissions]
      );
      
      if (validPermissions.rows.length !== permissions.length) {
        throw new ValidationError('Some permissions do not exist');
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
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(updatedBy);
      paramIndex++;
      
      // ID pour la clause WHERE
      updateValues.push(id);
      
      const updateQuery = `
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING updated_at
      `;
      
      await client.query(updateQuery, updateValues);
    }
    
    // Mettre à jour les permissions si fournies
    if (permissions !== undefined) {
      // Supprimer toutes les permissions existantes
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [id]
      );
      
      // Ajouter les nouvelles permissions
      if (permissions.length > 0) {
        const permissionInserts = permissions.map((permissionId: string) => 
          `('${id}', '${permissionId}')`
        ).join(', ');
        
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionInserts}`
        );
      }
    }
    
    logger.info('Role updated', {
      roleId: id,
      tenantId,
      updatedBy,
      changes: { name, description, permissions: permissions?.length },
    });
    
    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        id,
        updatedAt: new Date().toISOString(),
      }
    });
  });
}));

// ========================================
// SUPPRESSION DE RÔLE
// ========================================

router.delete('/:id', requirePermission('users.roles.delete'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const deletedBy = req.user?.id;
  
  await transaction(async (client) => {
    // Vérifier que le rôle existe
    const existingRoles = await client.query(
      'SELECT id, name, is_system FROM roles WHERE id = $1 AND company_id = $2',
      [id, tenantId]
    );
    
    if (existingRoles.rows.length === 0) {
      throw new NotFoundError('Role');
    }
    
    const role = existingRoles.rows[0];
    
    // Ne pas permettre la suppression des rôles système
    if (role.is_system) {
      throw new ValidationError('Cannot delete system roles');
    }
    
    // Vérifier qu'aucun utilisateur n'utilise ce rôle
    const usersWithRole = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role_id = $1 AND company_id = $2',
      [id, tenantId]
    );
    
    if (parseInt(usersWithRole.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete role that is assigned to users');
    }
    
    // Supprimer les permissions associées
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [id]
    );
    
    // Supprimer le rôle
    await client.query(
      'DELETE FROM roles WHERE id = $1',
      [id]
    );
    
    logger.info('Role deleted', {
      roleId: id,
      roleName: role.name,
      tenantId,
      deletedBy,
    });
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  });
}));

// ========================================
// DUPLICATION DE RÔLE
// ========================================

router.post('/:id/duplicate', requirePermission('users.roles.create'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const tenantId = req.tenantId;
  const createdBy = req.user?.id;
  
  if (!name) {
    throw new ValidationError('New role name is required');
  }
  
  await transaction(async (client) => {
    // Récupérer le rôle source avec ses permissions
    const sourceRoles = await client.query(
      `SELECT 
        r.name, r.description,
        COALESCE(
          array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), 
          ARRAY[]::uuid[]
        ) as permission_ids
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       WHERE r.id = $1 AND (r.company_id = $2 OR r.is_system = true)
       GROUP BY r.id`,
      [id, tenantId]
    );
    
    if (sourceRoles.rows.length === 0) {
      throw new NotFoundError('Source role');
    }
    
    const sourceRole = sourceRoles.rows[0];
    
    // Vérifier que le nouveau nom n'existe pas
    const existingRoles = await client.query(
      'SELECT id FROM roles WHERE name = $1 AND company_id = $2',
      [name, tenantId]
    );
    
    if (existingRoles.rows.length > 0) {
      throw new ConflictError('Role name already exists');
    }
    
    // Créer le nouveau rôle
    const result = await client.query(
      `INSERT INTO roles (
        name, description, company_id, is_system, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, false, $4, NOW(), NOW())
      RETURNING id, created_at`,
      [name, sourceRole.description, tenantId, createdBy]
    );
    
    const newRole = result.rows[0];
    
    // Copier les permissions
    if (sourceRole.permission_ids.length > 0) {
      const permissionInserts = sourceRole.permission_ids.map((permissionId: string) => 
        `('${newRole.id}', '${permissionId}')`
      ).join(', ');
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionInserts}`
      );
    }
    
    logger.info('Role duplicated', {
      sourceRoleId: id,
      newRoleId: newRole.id,
      newRoleName: name,
      tenantId,
      createdBy,
    });
    
    res.status(201).json({
      success: true,
      message: 'Role duplicated successfully',
      data: {
        id: newRole.id,
        name,
        description: sourceRole.description,
        permissionCount: sourceRole.permission_ids.length,
        createdAt: newRole.created_at,
      }
    });
  });
}));

// ========================================
// PERMISSIONS DISPONIBLES
// ========================================

router.get('/permissions/available', requirePermission('users.roles.read'), asyncHandler(async (req: Request, res: Response) => {
  const permissions = await query(
    `SELECT 
      id, name, description, service, resource, action
     FROM permissions 
     ORDER BY service, resource, action`
  );
  
  // Grouper par service
  const groupedPermissions = permissions.reduce((acc: any, permission) => {
    const service = permission.service;
    if (!acc[service]) {
      acc[service] = {};
    }
    
    const resource = permission.resource;
    if (!acc[service][resource]) {
      acc[service][resource] = [];
    }
    
    acc[service][resource].push(permission);
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      permissions,
      grouped: groupedPermissions,
    }
  });
}));

// ========================================
// STATISTIQUES DES RÔLES
// ========================================

router.get('/stats/overview', requirePermission('users.roles.list'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  
  const stats = await query(
    `SELECT 
      COUNT(*) as total_roles,
      COUNT(*) FILTER (WHERE is_system = false) as custom_roles,
      COUNT(*) FILTER (WHERE is_system = true) as system_roles
     FROM roles 
     WHERE company_id = $1 OR is_system = true`,
    [tenantId]
  );
  
  const roleUsage = await query(
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
      usage: roleUsage,
    }
  });
}));

export default router;

