-- ========= VERIFICATION TESTS FOR FIXES =========
-- Run these queries to verify all fixes are working

-- TEST 1: Check table grants are properly set
SELECT 
    'Table Grants Check' as test_name,
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'streamline' 
AND table_name IN ('job_assignments', 'companies', 'company_members')
AND grantee = 'authenticated'
GROUP BY table_name
ORDER BY table_name;

-- TEST 2: Check RLS policies are clean and correct
SELECT 
    'RLS Policies Check' as test_name,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'job_assignments'
AND schemaname = 'streamline'
ORDER BY cmd;

-- TEST 3: Check location settings functions have proper security
SELECT 
    'Function Security Check' as test_name,
    p.proname as function_name,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'streamline' 
AND p.proname IN ('get_company_location_settings', 'update_company_location_settings')
ORDER BY p.proname;

-- TEST 4: Check companies have location settings columns
SELECT 
    'Location Settings Schema Check' as test_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'streamline'
AND table_name = 'companies'
AND column_name IN ('location_tracking_enabled', 'location_ping_interval_seconds', 'location_ping_distance_meters', 'geofencing_enabled')
ORDER BY ordinal_position;

-- TEST 5: Sample location settings data
SELECT 
    'Sample Location Settings' as test_name,
    id,
    name,
    location_tracking_enabled,
    location_ping_interval_seconds,
    location_ping_distance_meters,
    geofencing_enabled
FROM streamline.companies
LIMIT 3;

-- EXPECTED RESULTS:
-- TEST 1: Should show SELECT, INSERT, UPDATE, DELETE privileges for authenticated role
-- TEST 2: Should show clean INSERT, UPDATE, DELETE, SELECT policies (no "ALL" policy)
-- TEST 3: Should show both functions as SECURITY DEFINER
-- TEST 4: Should show all 4 location settings columns exist
-- TEST 5: Should show sample companies with location settings data

-- TROUBLESHOOTING:
-- If TEST 1 fails: Run the table grants migration again
-- If TEST 2 shows "ALL" policy: Run the cleanup migration again  
-- If TEST 3 shows INVOKER: Functions need SECURITY DEFINER
-- If TEST 4 is empty: Location settings columns missing
-- If TEST 5 fails: Companies table access issues
