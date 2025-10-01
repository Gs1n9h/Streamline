-- ========= COMPREHENSIVE FIX FOR SCHEMA AND RLS ISSUES =========
-- This script handles both scenarios: tables in public OR streamline schema

-- STEP 1: Determine where tables are located
DO $$
DECLARE
    tables_in_public INTEGER;
    tables_in_streamline INTEGER;
BEGIN
    -- Count tables in public schema
    SELECT COUNT(*) INTO tables_in_public
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('companies', 'job_assignments', 'company_members');
    
    -- Count tables in streamline schema
    SELECT COUNT(*) INTO tables_in_streamline
    FROM pg_tables 
    WHERE schemaname = 'streamline' 
    AND tablename IN ('companies', 'job_assignments', 'company_members');
    
    RAISE NOTICE 'Tables in public schema: %', tables_in_public;
    RAISE NOTICE 'Tables in streamline schema: %', tables_in_streamline;
    
    IF tables_in_public > 0 AND tables_in_streamline = 0 THEN
        RAISE NOTICE '⚠️  TABLES ARE IN PUBLIC SCHEMA! You need to either:';
        RAISE NOTICE '   1. Move tables to streamline schema (see section below)';
        RAISE NOTICE '   2. Change client config to use public schema';
    ELSIF tables_in_streamline > 0 THEN
        RAISE NOTICE '✅ Tables are in streamline schema - proceeding with fixes';
    ELSE
        RAISE EXCEPTION 'Cannot find tables in either schema!';
    END IF;
END $$;

-- STEP 2: Fix for STREAMLINE schema (if tables are there)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can manage job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can insert job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can update job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can delete job assignments for their companies" ON streamline.job_assignments;

-- Create proper RLS policies for streamline.job_assignments
CREATE POLICY "Users can view job assignments for their companies" 
ON streamline.job_assignments
FOR SELECT 
USING (
    company_id IN (
        SELECT company_id 
        FROM streamline.company_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert job assignments" 
ON streamline.job_assignments
FOR INSERT 
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM streamline.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update job assignments" 
ON streamline.job_assignments
FOR UPDATE 
USING (
    company_id IN (
        SELECT company_id 
        FROM streamline.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM streamline.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can delete job assignments" 
ON streamline.job_assignments
FOR DELETE 
USING (
    company_id IN (
        SELECT company_id 
        FROM streamline.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Fix update_company_location_settings function
CREATE OR REPLACE FUNCTION streamline.update_company_location_settings(
    p_company_id UUID,
    p_location_tracking_enabled BOOLEAN DEFAULT NULL,
    p_location_ping_interval_seconds INTEGER DEFAULT NULL,
    p_location_ping_distance_meters INTEGER DEFAULT NULL,
    p_geofencing_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE streamline.companies
    SET 
        location_tracking_enabled = COALESCE(p_location_tracking_enabled, location_tracking_enabled),
        location_ping_interval_seconds = COALESCE(p_location_ping_interval_seconds, location_ping_interval_seconds),
        location_ping_distance_meters = COALESCE(p_location_ping_distance_meters, location_ping_distance_meters),
        geofencing_enabled = COALESCE(p_geofencing_enabled, geofencing_enabled)
    WHERE id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA streamline TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA streamline TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA streamline TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA streamline TO authenticated;

-- STEP 3: Alternative fix for PUBLIC schema (commented out - uncomment if needed)
/*
-- If your tables are in public schema, uncomment and run this section:

DROP POLICY IF EXISTS "Users can view job assignments for their companies" ON public.job_assignments;
DROP POLICY IF EXISTS "Admins can insert job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Admins can update job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Admins can delete job assignments" ON public.job_assignments;

CREATE POLICY "Users can view job assignments for their companies" 
ON public.job_assignments
FOR SELECT 
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert job assignments" 
ON public.job_assignments
FOR INSERT 
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM public.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update job assignments" 
ON public.job_assignments
FOR UPDATE 
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM public.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can delete job assignments" 
ON public.job_assignments
FOR DELETE 
USING (
    company_id IN (
        SELECT company_id 
        FROM public.company_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Fix function for public schema
CREATE OR REPLACE FUNCTION public.update_company_location_settings(
    p_company_id UUID,
    p_location_tracking_enabled BOOLEAN DEFAULT NULL,
    p_location_ping_interval_seconds INTEGER DEFAULT NULL,
    p_location_ping_distance_meters INTEGER DEFAULT NULL,
    p_geofencing_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.companies
    SET 
        location_tracking_enabled = COALESCE(p_location_tracking_enabled, location_tracking_enabled),
        location_ping_interval_seconds = COALESCE(p_location_ping_interval_seconds, location_ping_interval_seconds),
        location_ping_distance_meters = COALESCE(p_location_ping_distance_meters, location_ping_distance_meters),
        geofencing_enabled = COALESCE(p_geofencing_enabled, geofencing_enabled)
    WHERE id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- STEP 4: Verification queries
-- Run these to verify the fix worked:
/*
-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'job_assignments';

-- Check function
SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_company_location_settings';

-- Test access (should work now)
SELECT COUNT(*) FROM streamline.job_assignments;
*/
