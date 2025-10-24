import { Router, Request, Response } from 'express';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { authMiddleware, requirePermission } from '@/middleware/auth';
import { tenantMiddleware } from '@/middleware/tenant';
import { 
  asyncHandler 
} from '@/middleware/errorHandler';

const router = Router();

// Appliquer les middlewares globaux
router.use(authMiddleware);
router.use(tenantMiddleware);

// ========================================
// LISTE DE TOUTES LES PERMISSIONS
// ========================================

router.get('/', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { service, resource, action, search } = req.query as any;
  
  // Construire la requête avec filtres
  let whereConditions = ['1=1'];
  let queryParams: any[] = [];
  let paramIndex = 1;
  
  if (service) {
    whereConditions.push(`service = $${paramIndex}`);
    queryParams.push(service);
    paramIndex++;
  }
  
  if (resource) {
    whereConditions.push(`resource = $${paramIndex}`);
    queryParams.push(resource);
    paramIndex++;
  }
  
  if (action) {
    whereConditions.push(`action = $${paramIndex}`);
    queryParams.push(action);
    paramIndex++;
  }
  
  if (search) {
    whereConditions.push(`(
      name ILIKE $${paramIndex} OR 
      description ILIKE $${paramIndex} OR
      service ILIKE $${paramIndex} OR
      resource ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const permissions = await query(
    `SELECT 
      id, name, description, service, resource, action,
      created_at as "createdAt", updated_at as "updatedAt"
     FROM permissions 
     WHERE ${whereClause}
     ORDER BY service, resource, action`,
    queryParams
  );
  
  res.json({
    success: true,
    data: permissions
  });
}));

// ========================================
// PERMISSIONS GROUPÉES PAR SERVICE
// ========================================

router.get('/grouped', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const permissions = await query(
    `SELECT 
      id, name, description, service, resource, action
     FROM permissions 
     ORDER BY service, resource, action`
  );
  
  // Grouper par service puis par ressource
  const grouped = permissions.reduce((acc: any, permission) => {
    const { service, resource } = permission;
    
    if (!acc[service]) {
      acc[service] = {
        name: service,
        resources: {}
      };
    }
    
    if (!acc[service].resources[resource]) {
      acc[service].resources[resource] = {
        name: resource,
        permissions: []
      };
    }
    
    acc[service].resources[resource].permissions.push(permission);
    return acc;
  }, {});
  
  // Convertir en tableau pour faciliter l'utilisation côté client
  const groupedArray = Object.values(grouped).map((service: any) => ({
    ...service,
    resources: Object.values(service.resources)
  }));
  
  res.json({
    success: true,
    data: {
      grouped: groupedArray,
      flat: permissions
    }
  });
}));

// ========================================
// SERVICES DISPONIBLES
// ========================================

router.get('/services', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const services = await query(
    `SELECT 
      service,
      COUNT(*) as permission_count,
      array_agg(DISTINCT resource) as resources
     FROM permissions 
     GROUP BY service
     ORDER BY service`
  );
  
  res.json({
    success: true,
    data: services
  });
}));

// ========================================
// RESSOURCES D'UN SERVICE
// ========================================

router.get('/services/:service/resources', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { service } = req.params;
  
  const resources = await query(
    `SELECT 
      resource,
      COUNT(*) as permission_count,
      array_agg(action ORDER BY action) as actions
     FROM permissions 
     WHERE service = $1
     GROUP BY resource
     ORDER BY resource`,
    [service]
  );
  
  res.json({
    success: true,
    data: resources
  });
}));

// ========================================
// ACTIONS D'UNE RESSOURCE
// ========================================

router.get('/services/:service/resources/:resource/actions', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { service, resource } = req.params;
  
  const actions = await query(
    `SELECT 
      id, name, description, action
     FROM permissions 
     WHERE service = $1 AND resource = $2
     ORDER BY action`,
    [service, resource]
  );
  
  res.json({
    success: true,
    data: actions
  });
}));

// ========================================
// PERMISSIONS D'UN UTILISATEUR
// ========================================

router.get('/user/:userId', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const tenantId = req.tenantId;
  
  const userPermissions = await query(
    `SELECT 
      p.id, p.name, p.description, p.service, p.resource, p.action,
      r.name as role_name,
      u.first_name, u.last_name, u.email
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = $1 AND u.company_id = $2
     ORDER BY p.service, p.resource, p.action`,
    [userId, tenantId]
  );
  
  if (userPermissions.length === 0) {
    // Vérifier si l'utilisateur existe
    const users = await query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND company_id = $2',
      [userId, tenantId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        user: users[0],
        permissions: [],
        roleName: null
      }
    });
  }
  
  const user = {
    id: userId,
    firstName: userPermissions[0].first_name,
    lastName: userPermissions[0].last_name,
    email: userPermissions[0].email
  };
  
  const permissions = userPermissions.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    service: p.service,
    resource: p.resource,
    action: p.action
  }));
  
  // Grouper les permissions par service
  const groupedPermissions = permissions.reduce((acc: any, permission) => {
    const { service, resource } = permission;
    
    if (!acc[service]) {
      acc[service] = {};
    }
    
    if (!acc[service][resource]) {
      acc[service][resource] = [];
    }
    
    acc[service][resource].push(permission);
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      user,
      roleName: userPermissions[0].role_name,
      permissions,
      groupedPermissions
    }
  });
}));

// ========================================
// PERMISSIONS D'UN RÔLE
// ========================================

router.get('/role/:roleId', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { roleId } = req.params;
  const tenantId = req.tenantId;
  
  const rolePermissions = await query(
    `SELECT 
      p.id, p.name, p.description, p.service, p.resource, p.action,
      r.name as role_name, r.description as role_description
     FROM roles r
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE r.id = $1 AND (r.company_id = $2 OR r.is_system = true)
     ORDER BY p.service, p.resource, p.action`,
    [roleId, tenantId]
  );
  
  if (rolePermissions.length === 0) {
    // Vérifier si le rôle existe
    const roles = await query(
      'SELECT id, name, description FROM roles WHERE id = $1 AND (company_id = $2 OR is_system = true)',
      [roleId, tenantId]
    );
    
    if (roles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        role: roles[0],
        permissions: []
      }
    });
  }
  
  const role = {
    id: roleId,
    name: rolePermissions[0].role_name,
    description: rolePermissions[0].role_description
  };
  
  const permissions = rolePermissions.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    service: p.service,
    resource: p.resource,
    action: p.action
  }));
  
  // Grouper les permissions par service
  const groupedPermissions = permissions.reduce((acc: any, permission) => {
    const { service, resource } = permission;
    
    if (!acc[service]) {
      acc[service] = {};
    }
    
    if (!acc[service][resource]) {
      acc[service][resource] = [];
    }
    
    acc[service][resource].push(permission);
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      role,
      permissions,
      groupedPermissions
    }
  });
}));

// ========================================
// VÉRIFIER UNE PERMISSION SPÉCIFIQUE
// ========================================

router.post('/check', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const { userId, permission } = req.body;
  const tenantId = req.tenantId;
  const requestingUserId = req.user?.id;
  
  if (!userId || !permission) {
    return res.status(400).json({
      success: false,
      message: 'userId and permission are required'
    });
  }
  
  // Vérifier que l'utilisateur demandeur peut voir les permissions de cet utilisateur
  if (userId !== requestingUserId && !req.user?.permissions.includes('users.permissions.list')) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  }
  
  const userPermissions = await query(
    `SELECT 
      u.is_super_admin,
      COALESCE(
        array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), 
        ARRAY[]::text[]
      ) as permissions
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = $1 AND u.company_id = $2
     GROUP BY u.id, u.is_super_admin`,
    [userId, tenantId]
  );
  
  if (userPermissions.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const user = userPermissions[0];
  const hasPermission = user.is_super_admin || user.permissions.includes(permission);
  
  res.json({
    success: true,
    data: {
      userId,
      permission,
      hasPermission,
      isSuperAdmin: user.is_super_admin,
      allPermissions: user.permissions
    }
  });
}));

// ========================================
// STATISTIQUES DES PERMISSIONS
// ========================================

router.get('/stats/overview', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const stats = await query(
    `SELECT 
      COUNT(*) as total_permissions,
      COUNT(DISTINCT service) as total_services,
      COUNT(DISTINCT resource) as total_resources,
      COUNT(DISTINCT action) as total_actions
     FROM permissions`
  );
  
  const serviceStats = await query(
    `SELECT 
      service,
      COUNT(*) as permission_count,
      COUNT(DISTINCT resource) as resource_count,
      COUNT(DISTINCT action) as action_count
     FROM permissions
     GROUP BY service
     ORDER BY permission_count DESC`
  );
  
  const actionStats = await query(
    `SELECT 
      action,
      COUNT(*) as usage_count
     FROM permissions
     GROUP BY action
     ORDER BY usage_count DESC`
  );
  
  res.json({
    success: true,
    data: {
      overview: stats[0],
      byService: serviceStats,
      byAction: actionStats
    }
  });
}));

// ========================================
// MATRICE DES PERMISSIONS (pour interface d'administration)
// ========================================

router.get('/matrix', requirePermission('users.permissions.list'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId;
  
  // Récupérer toutes les permissions
  const permissions = await query(
    `SELECT id, name, service, resource, action FROM permissions ORDER BY service, resource, action`
  );
  
  // Récupérer tous les rôles avec leurs permissions
  const rolePermissions = await query(
    `SELECT 
      r.id as role_id, r.name as role_name,
      COALESCE(
        array_agg(p.id) FILTER (WHERE p.id IS NOT NULL), 
        ARRAY[]::uuid[]
      ) as permission_ids
     FROM roles r
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE r.company_id = $1 OR r.is_system = true
     GROUP BY r.id, r.name
     ORDER BY r.name`,
    [tenantId]
  );
  
  // Créer la matrice
  const matrix = rolePermissions.map(role => ({
    roleId: role.role_id,
    roleName: role.role_name,
    permissions: permissions.map(permission => ({
      permissionId: permission.id,
      permissionName: permission.name,
      service: permission.service,
      resource: permission.resource,
      action: permission.action,
      hasPermission: role.permission_ids.includes(permission.id)
    }))
  }));
  
  res.json({
    success: true,
    data: {
      permissions,
      roles: rolePermissions,
      matrix
    }
  });
}));

export default router;

