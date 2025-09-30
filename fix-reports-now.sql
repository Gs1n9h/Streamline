-- IMMEDIATE FIX FOR REPORTS - RUN THIS IN SUPABASE SQL EDITOR
-- This will deploy the missing functions and fix both errors

-- 1. Fix the existing get_daily_summary function (syntax error)
CREATE OR REPLACE FUNCTION streamline.get_daily_summary(p_company_id UUID, p_date DATE)
RETURNS TABLE (
  total_hours NUMERIC,
  total_cost NUMERIC,
  staff_count BIGINT,
  jobs_worked TEXT[]
) AS $$
  SELECT
    ROUND(SUM(EXTRACT(EPOCH FROM (t.clock_out - t.clock_in))) / 3600.0, 2) AS total_hours,
    ROUND(SUM(EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0 * cm.pay_rate), 2) AS total_cost,
    COUNT(DISTINCT t.staff_id) AS staff_count,
    ARRAY_AGG(DISTINCT j.name) AS jobs_worked
  FROM streamline.timesheets t
  JOIN streamline.company_members cm ON t.staff_id = cm.user_id AND t.company_id = cm.company_id
  JOIN streamline.jobs j ON t.job_id = j.id
  WHERE t.company_id = p_company_id
    AND t.clock_in::DATE = p_date
    AND t.clock_out IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- 2. Create the detailed timesheet report function
CREATE OR REPLACE FUNCTION streamline.get_detailed_timesheet_report(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
  timesheet_id UUID,
  staff_id UUID,
  staff_name TEXT,
  job_name TEXT,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  total_hours NUMERIC,
  pay_rate NUMERIC,
  total_wage NUMERIC,
  clock_in_location TEXT,
  clock_out_location TEXT
) AS $$
  SELECT
    t.id as timesheet_id,
    t.staff_id,
    COALESCE(p.full_name, 'Unknown Staff') as staff_name,
    COALESCE(j.name, 'Unknown Job') as job_name,
    t.clock_in,
    t.clock_out,
    CASE 
      WHEN t.clock_out IS NOT NULL THEN 
        ROUND(EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0, 2)
      ELSE 
        ROUND(EXTRACT(EPOCH FROM (NOW() - t.clock_in)) / 3600.0, 2)
    END as total_hours,
    COALESCE(cm.pay_rate, 0) as pay_rate,
    CASE 
      WHEN t.clock_out IS NOT NULL THEN 
        ROUND((EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0) * COALESCE(cm.pay_rate, 0), 2)
      ELSE 
        ROUND((EXTRACT(EPOCH FROM (NOW() - t.clock_in)) / 3600.0) * COALESCE(cm.pay_rate, 0), 2)
    END as total_wage,
    CASE 
      WHEN t.clock_in_latitude IS NOT NULL AND t.clock_in_longitude IS NOT NULL THEN
        CONCAT(t.clock_in_latitude::TEXT, ', ', t.clock_in_longitude::TEXT)
      ELSE 'Not recorded'
    END as clock_in_location,
    CASE 
      WHEN t.clock_out_latitude IS NOT NULL AND t.clock_out_longitude IS NOT NULL THEN
        CONCAT(t.clock_out_latitude::TEXT, ', ', t.clock_out_longitude::TEXT)
      ELSE 'Not recorded'
    END as clock_out_location
  FROM streamline.timesheets t
  LEFT JOIN streamline.profiles p ON t.staff_id = p.id
  LEFT JOIN streamline.jobs j ON t.job_id = j.id
  LEFT JOIN streamline.company_members cm ON t.staff_id = cm.user_id AND t.company_id = cm.company_id
  WHERE t.company_id = p_company_id
    AND t.clock_in::DATE >= p_start_date
    AND (p_end_date IS NULL OR t.clock_in::DATE <= p_end_date)
    AND (p_staff_id IS NULL OR t.staff_id = p_staff_id)
  ORDER BY t.clock_in DESC;
$$ LANGUAGE sql STABLE;

-- 3. Create the staff members function
CREATE OR REPLACE FUNCTION streamline.get_company_staff(p_company_id UUID)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  role TEXT
) AS $$
  SELECT
    cm.user_id as staff_id,
    COALESCE(p.full_name, 'Unnamed User') as staff_name,
    cm.role
  FROM streamline.company_members cm
  LEFT JOIN streamline.profiles p ON cm.user_id = p.id
  WHERE cm.company_id = p_company_id
  ORDER BY COALESCE(p.full_name, 'Unnamed User');
$$ LANGUAGE sql STABLE;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION streamline.get_detailed_timesheet_report TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.get_company_staff TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.get_daily_summary TO authenticated;
