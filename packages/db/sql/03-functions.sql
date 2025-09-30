-- ========= CORE LOGIC FUNCTIONS =========

-- Function to get active shift for a staff member
CREATE OR REPLACE FUNCTION streamline.get_active_shift(p_staff_id UUID)
RETURNS SETOF streamline.timesheets AS $$
  SELECT * FROM streamline.timesheets
  WHERE staff_id = p_staff_id AND clock_out IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to clock out a user
CREATE OR REPLACE FUNCTION streamline.clock_out_user(p_timesheet_id UUID, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION)
RETURNS VOID AS $$
  UPDATE streamline.timesheets
  SET
    clock_out = NOW(),
    clock_out_latitude = p_latitude,
    clock_out_longitude = p_longitude
  WHERE id = p_timesheet_id AND staff_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get timesheets for a specific period
CREATE OR REPLACE FUNCTION streamline.get_timesheets_for_period(p_staff_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  id UUID,
  job_name TEXT,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  duration INTERVAL,
  clock_in_latitude DOUBLE PRECISION,
  clock_in_longitude DOUBLE PRECISION,
  clock_out_latitude DOUBLE PRECISION,
  clock_out_longitude DOUBLE PRECISION
) AS $$
  SELECT
    t.id,
    j.name as job_name,
    t.clock_in,
    t.clock_out,
    (COALESCE(t.clock_out, NOW()) - t.clock_in) as duration,
    t.clock_in_latitude,
    t.clock_in_longitude,
    t.clock_out_latitude,
    t.clock_out_longitude
  FROM streamline.timesheets t
  JOIN streamline.jobs j ON t.job_id = j.id
  WHERE t.staff_id = p_staff_id
    AND t.clock_in >= p_start_date
    AND t.clock_in <= p_end_date
  ORDER BY t.clock_in DESC;
$$ LANGUAGE sql STABLE;

-- Function to get latest locations for all active staff in a company
CREATE OR REPLACE FUNCTION streamline.get_latest_locations(p_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_updated_at TIMESTAMPTZ,
  job_name TEXT
) AS $$
  SELECT DISTINCT ON (p.user_id)
    p.user_id,
    pr.full_name,
    p.latitude,
    p.longitude,
    p.created_at as last_updated_at,
    j.name as job_name
  FROM streamline.location_pings p
  JOIN streamline.profiles pr ON p.user_id = pr.id
  JOIN streamline.timesheets t ON p.timesheet_id = t.id
  JOIN streamline.jobs j ON t.job_id = j.id
  WHERE p.timesheet_id IN (
      SELECT id FROM streamline.timesheets
      WHERE company_id = p_company_id AND clock_out IS NULL
    )
  ORDER BY p.user_id, p.created_at DESC;
$$ LANGUAGE sql STABLE;

-- Function to calculate payroll for a specific period
CREATE OR REPLACE FUNCTION streamline.calculate_payroll_for_period(p_company_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  total_hours NUMERIC,
  pay_rate NUMERIC,
  total_wage NUMERIC
) AS $$
  SELECT
    cm.user_id as staff_id,
    p.full_name,
    -- Extract epoch, divide by 3600 to get hours as a numeric value
    ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(t.clock_out, t.clock_in) - t.clock_in))) / 3600.0, 2) AS total_hours,
    cm.pay_rate,
    ROUND((SUM(EXTRACT(EPOCH FROM (COALESCE(t.clock_out, t.clock_in) - t.clock_in))) / 3600.0) * cm.pay_rate, 2) AS total_wage
  FROM streamline.timesheets t
  JOIN streamline.company_members cm ON t.staff_id = cm.user_id AND t.company_id = cm.company_id
  JOIN streamline.profiles p ON t.staff_id = p.id
  WHERE t.company_id = p_company_id
    AND t.clock_in >= p_start_date
    AND t.clock_in <= p_end_date
    AND t.clock_out IS NOT NULL -- Only count completed shifts
  GROUP BY cm.user_id, p.full_name, cm.pay_rate
  ORDER BY p.full_name;
$$ LANGUAGE sql STABLE;

-- Function to get daily summary for a company
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

