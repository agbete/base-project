-- ========================================
-- MIGRATION 002: Row Level Security (RLS)
-- Multi-tenant Data Isolation
-- ========================================

-- ========================================
-- SECURITY FUNCTIONS
-- ========================================

-- Function to get current tenant (company_id) from session
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Get tenant from session variable set by application
    RETURN COALESCE(
        current_setting('app.current_tenant', true)::UUID,
        NULL
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.is_super_admin', true)::BOOLEAN,
        FALSE
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user', true)::UUID,
        NULL
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- CREATE APPLICATION ROLE
-- ========================================

-- Create application role for RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role;
    END IF;
END
$$;

-- Grant necessary permissions to app_role
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- Grant app_role to saas_user
GRANT app_role TO saas_user;

-- ========================================
-- ENABLE RLS ON TABLES
-- ========================================

-- Enable RLS on multi-tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Companies table doesn't need RLS as it's the tenant table itself
-- Permissions table is system-wide, no RLS needed
-- System_settings table is global, no RLS needed

-- ========================================
-- RLS POLICIES FOR USERS TABLE
-- ========================================

-- Policy for users: can only see users from same company or if super admin
CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR ROLES TABLE
-- ========================================

-- Policy for roles: can only see roles from same company or if super admin
CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR USER_ROLES TABLE
-- ========================================

-- Policy for user_roles: can only see assignments for users in same company
CREATE POLICY tenant_isolation_user_roles ON user_roles
    FOR ALL TO app_role
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_roles.user_id 
            AND (u.company_id = current_tenant_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_roles.user_id 
            AND (u.company_id = current_tenant_id() OR is_super_admin())
        )
    );

-- ========================================
-- RLS POLICIES FOR SESSIONS TABLE
-- ========================================

-- Policy for sessions: can only see sessions from same company or if super admin
CREATE POLICY tenant_isolation_sessions ON sessions
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR AUDIT_LOGS TABLE
-- ========================================

-- Policy for audit_logs: can only see logs from same company or if super admin
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
        OR company_id IS NULL -- System-wide logs visible to all
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
        OR company_id IS NULL
    );

-- ========================================
-- RLS POLICIES FOR COMPANY_SETTINGS TABLE
-- ========================================

-- Policy for company_settings: can only see settings from same company or if super admin
CREATE POLICY tenant_isolation_company_settings ON company_settings
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR CODE_GENERATORS TABLE
-- ========================================

-- Policy for code_generators: can only see generators from same company or if super admin
CREATE POLICY tenant_isolation_code_generators ON code_generators
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR GENERATED_CODES TABLE
-- ========================================

-- Policy for generated_codes: can only see codes from same company or if super admin
CREATE POLICY tenant_isolation_generated_codes ON generated_codes
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- RLS POLICIES FOR RATE_LIMITS TABLE
-- ========================================

-- Policy for rate_limits: can only see limits from same company or if super admin
CREATE POLICY tenant_isolation_rate_limits ON rate_limits
    FOR ALL TO app_role
    USING (
        company_id = current_tenant_id() 
        OR is_super_admin()
    )
    WITH CHECK (
        company_id = current_tenant_id() 
        OR is_super_admin()
    );

-- ========================================
-- SPECIAL POLICIES FOR COMPANIES TABLE
-- ========================================

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy for companies: super admins can see all, regular users can only see their own
CREATE POLICY tenant_isolation_companies ON companies
    FOR ALL TO app_role
    USING (
        is_super_admin() 
        OR id = current_tenant_id()
    )
    WITH CHECK (
        is_super_admin() 
        OR id = current_tenant_id()
    );

-- ========================================
-- HELPER FUNCTIONS FOR PERMISSION CHECKING
-- ========================================

-- Function to check if current user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    tenant_id UUID;
    has_perm BOOLEAN := FALSE;
BEGIN
    -- Get current user and tenant
    user_id := current_user_id();
    tenant_id := current_tenant_id();
    
    -- Super admins have all permissions
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has the permission through their roles
    SELECT EXISTS(
        SELECT 1 
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        JOIN permissions p ON p.id = ANY(r.permission_ids)
        WHERE u.id = user_id
        AND u.company_id = tenant_id
        AND CONCAT(p.service, '.', p.resource, '.', p.action) = permission_name
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for current user
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TEXT[] AS $$
DECLARE
    user_id UUID;
    tenant_id UUID;
    permissions TEXT[];
BEGIN
    -- Get current user and tenant
    user_id := current_user_id();
    tenant_id := current_tenant_id();
    
    -- Super admins have all permissions
    IF is_super_admin() THEN
        SELECT ARRAY_AGG(CONCAT(service, '.', resource, '.', action))
        FROM permissions
        INTO permissions;
        RETURN permissions;
    END IF;
    
    -- Get user permissions through roles
    SELECT ARRAY_AGG(DISTINCT CONCAT(p.service, '.', p.resource, '.', p.action))
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    JOIN permissions p ON p.id = ANY(r.permission_ids)
    WHERE u.id = user_id
    AND u.company_id = tenant_id
    INTO permissions;
    
    RETURN COALESCE(permissions, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SECURITY VALIDATION FUNCTIONS
-- ========================================

-- Function to validate tenant isolation (for testing)
CREATE OR REPLACE FUNCTION validate_tenant_isolation()
RETURNS TABLE(
    table_name TEXT,
    has_rls BOOLEAN,
    policy_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity,
        COUNT(p.policyname)::INTEGER
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'users', 'roles', 'user_roles', 'sessions', 
        'audit_logs', 'company_settings', 'code_generators', 
        'generated_codes', 'rate_limits', 'companies'
    )
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEXES FOR RLS PERFORMANCE
-- ========================================

-- Additional indexes to optimize RLS queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_id_status ON users(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_company_id_system ON roles(company_id, is_system);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_company_id_active ON sessions(company_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_company_id_created ON audit_logs(company_id, created_at);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_company ON users(company_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active_company ON sessions(company_id) WHERE is_active = true;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION current_tenant_id() IS 'Returns the current tenant (company) ID from session context';
COMMENT ON FUNCTION is_super_admin() IS 'Returns true if current user is a super admin';
COMMENT ON FUNCTION current_user_id() IS 'Returns the current user ID from session context';
COMMENT ON FUNCTION has_permission(TEXT) IS 'Checks if current user has a specific permission';
COMMENT ON FUNCTION get_user_permissions() IS 'Returns array of all permissions for current user';
COMMENT ON FUNCTION validate_tenant_isolation() IS 'Validates RLS setup for tenant isolation (testing)';

-- ========================================
-- GRANT EXECUTE PERMISSIONS
-- ========================================

-- Grant execute permissions on functions to app_role
GRANT EXECUTE ON FUNCTION current_tenant_id() TO app_role;
GRANT EXECUTE ON FUNCTION is_super_admin() TO app_role;
GRANT EXECUTE ON FUNCTION current_user_id() TO app_role;
GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO app_role;
GRANT EXECUTE ON FUNCTION get_user_permissions() TO app_role;
GRANT EXECUTE ON FUNCTION validate_tenant_isolation() TO app_role;

