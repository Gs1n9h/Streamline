-- Deploy Reports Functions to Supabase
-- Run this in your Supabase SQL Editor

-- Function to get detailed timesheet report with filtering
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
    p.full_name as staff_name,
    j.name as job_name,
    t.clock_in,
    t.clock_out,
    CASE 
      WHEN t.clock_out IS NOT NULL THEN 
        ROUND(EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0, 2)
      ELSE 
        ROUND(EXTRACT(EPOCH FROM (NOW() - t.clock_in)) / 3600.0, 2)
    END as total_hours,
    cm.pay_rate,
    CASE 
      WHEN t.clock_out IS NOT NULL THEN 
        ROUND((EXTRACT(EPOCH FROM (t.clock_out - t.clock_in)) / 3600.0) * cm.pay_rate, 2)
      ELSE 
        ROUND((EXTRACT(EPOCH FROM (NOW() - t.clock_in)) / 3600.0) * cm.pay_rate, 2)
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
  JOIN streamline.profiles p ON t.staff_id = p.id
  JOIN streamline.jobs j ON t.job_id = j.id
  JOIN streamline.company_members cm ON t.staff_id = cm.user_id AND t.company_id = cm.company_id
  WHERE t.company_id = p_company_id
    AND t.clock_in::DATE >= p_start_date
    AND (p_end_date IS NULL OR t.clock_in::DATE <= p_end_date)
    AND (p_staff_id IS NULL OR t.staff_id = p_staff_id)
  ORDER BY t.clock_in DESC;
$$ LANGUAGE sql STABLE;

-- Function to get staff members for a company (for filtering dropdown)
CREATE OR REPLACE FUNCTION streamline.get_company_staff(p_company_id UUID)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  role TEXT
) AS $$
  SELECT
    cm.user_id as staff_id,
    p.full_name as staff_name,
    cm.role
  FROM streamline.company_members cm
  JOIN streamline.profiles p ON cm.user_id = p.id
  WHERE cm.company_id = p_company_id
  ORDER BY p.full_name;
$$ LANGUAGE sql STABLE;

-- Test the functions (optional - you can run these to verify)
-- SELECT * FROM streamline.get_company_staff('your-company-id-here');
-- SELECT * FROM streamline.get_detailed_timesheet_report('your-company-id-here', '2024-01-01'::DATE);
