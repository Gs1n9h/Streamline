-- ========= DIAGNOSTIC QUERIES FOR SCHEMA INVESTIGATION =========
-- Run these queries in Supabase SQL Editor to diagnose the issues

-- 1. CHECK WHICH SCHEMAS EXIST
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'streamline')
ORDER BY schema_name;

-- 2. CHECK WHERE job_assignments TABLE EXISTS
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'job_assignments';

-- 3. CHECK WHERE companies TABLE EXISTS
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'companies';

-- 4. LIST ALL TABLES IN streamline SCHEMA
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'streamline'
ORDER BY tablename;

-- 5. LIST ALL TABLES IN public SCHEMA (that might be Streamline tables)
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('companies', 'profiles', 'company_members', 'jobs', 'timesheets', 'job_assignments', 'geofences', 'geofence_events')
ORDER BY tablename;

-- 6. CHECK RLS STATUS FOR job_assignments
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'job_assignments';

-- 7. CHECK EXISTING RLS POLICIES ON job_assignments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'job_assignments';

-- 8. CHECK IF update_company_location_settings FUNCTION EXISTS AND IN WHICH SCHEMA
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_company_location_settings';

-- 9. CHECK companies TABLE COLUMNS
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY table_schema, ordinal_position;

-- 10. CHECK CURRENT SEARCH PATH
SHOW search_path;

-- 11. CHECK IF CURRENT USER HAS COMPANY MEMBERSHIP (for RLS testing)
SELECT 
    cm.user_id,
    cm.company_id,
    cm.role,
    p.full_name,
    c.name as company_name
FROM streamline.company_members cm
LEFT JOIN streamline.profiles p ON p.id = cm.user_id
LEFT JOIN streamline.companies c ON c.id = cm.company_id
WHERE cm.user_id = auth.uid();

-- 12. TEST DIRECT ACCESS TO job_assignments (will show RLS error if blocked)
SELECT COUNT(*) as total_job_assignments
FROM streamline.job_assignments;

-- 13. CHECK GRANTS ON job_assignments
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'streamline' 
AND table_name = 'job_assignments';
