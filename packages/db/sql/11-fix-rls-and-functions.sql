-- ========= FIX RLS POLICIES AND FUNCTIONS =========
-- This file fixes the issues with job_assignments RLS and update_company_location_settings

-- 1. Drop existing job_assignments policies
DROP POLICY IF EXISTS "Users can view job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can manage job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can insert job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can update job assignments for their companies" ON streamline.job_assignments;
DROP POLICY IF EXISTS "Admins can delete job assignments for their companies" ON streamline.job_assignments;

-- 2. Create proper RLS policies for job_assignments
CREATE POLICY "Users can view job assignments for their companies" ON streamline.job_assignments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert job assignments for their companies" ON streamline.job_assignments
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update job assignments for their companies" ON streamline.job_assignments
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete job assignments for their companies" ON streamline.job_assignments
  FOR DELETE USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Fix update_company_location_settings function (remove updated_at reference)
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION streamline.update_company_location_settings(UUID, BOOLEAN, INTEGER, INTEGER, BOOLEAN) TO authenticated;
