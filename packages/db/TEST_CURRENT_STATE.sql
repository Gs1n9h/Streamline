-- ========= QUICK TEST TO IDENTIFY THE ISSUE =========
-- Run this FIRST to understand your current setup

-- TEST 1: Where are the tables?
SELECT 
    'Tables Location' as test,
    schemaname,
    COUNT(*) as table_count,
    string_agg(tablename, ', ') as tables
FROM pg_tables 
WHERE tablename IN ('companies', 'job_assignments', 'company_members', 'profiles', 'jobs', 'timesheets')
GROUP BY schemaname
ORDER BY schemaname;

-- TEST 2: Do RLS policies exist on job_assignments?
SELECT 
    'RLS Policies on job_assignments' as test,
    schemaname,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'job_assignments'
ORDER BY schemaname, cmd;

-- TEST 3: Does the function exist?
SELECT 
    'update_company_location_settings function' as test,
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_company_location_settings';

-- TEST 4: What columns does companies table have?
SELECT 
    'companies table columns' as test,
    table_schema,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name IN ('id', 'name', 'location_tracking_enabled', 'updated_at')
ORDER BY table_schema, ordinal_position;

-- TEST 5: Check your user's company membership
SELECT 
    'Your company membership' as test,
    user_id,
    company_id,
    role
FROM streamline.company_members
WHERE user_id = auth.uid()
UNION ALL
SELECT 
    'Your company membership' as test,
    user_id,
    company_id,
    role
FROM public.company_members
WHERE user_id = auth.uid();

-- TEST 6: Can you access job_assignments?
SELECT 
    'Access test - streamline.job_assignments' as test,
    COUNT(*) as record_count,
    'SUCCESS' as status
FROM streamline.job_assignments
UNION ALL
SELECT 
    'Access test - public.job_assignments' as test,
    COUNT(*) as record_count,
    'SUCCESS' as status
FROM public.job_assignments;

-- INTERPRETATION GUIDE:
-- 
-- If TEST 1 shows tables in 'public':
--   → Your tables are in the wrong schema
--   → Option A: Move them to streamline
--   → Option B: Change client to use 'public'
--
-- If TEST 1 shows tables in 'streamline':
--   → Tables are in the right place
--   → Check TEST 2 for RLS policies
--
-- If TEST 2 shows no policies or wrong schema:
--   → RLS policies need to be created/fixed
--
-- If TEST 3 shows function in 'public' but tables in 'streamline':
--   → Function is in wrong schema
--
-- If TEST 4 shows 'updated_at' column:
--   → Column exists (shouldn't cause error)
-- If TEST 4 doesn't show 'updated_at':
--   → This is why you get the 400 error
--
-- If TEST 5 shows no results:
--   → You don't have company membership (RLS will block everything)
--
-- If TEST 6 fails with 403:
--   → RLS is blocking you (check TEST 2 and TEST 5)
