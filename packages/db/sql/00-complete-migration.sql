-- ========= STREAMLINE: COMPLETE DATABASE MIGRATION =========
-- This file contains the complete database setup for Streamline
-- Run this in the Supabase SQL Editor to set up the entire database

-- Create custom schema
CREATE SCHEMA IF NOT EXISTS streamline;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========= CORE TABLES =========

-- 1. COMPANIES TABLE
CREATE TABLE streamline.companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.companies IS 'Represents a business/tenant in the system.';

-- 2. PROFILES TABLE (Stores user-centric info)
CREATE TABLE streamline.profiles (
  id          UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT
);
COMMENT ON TABLE streamline.profiles IS 'Stores user-specific data, independent of company membership.';

-- 3. COMPANY MEMBERS JUNCTION TABLE (Many-to-Many link)
CREATE TABLE streamline.company_members (
  user_id     UUID NOT NULL REFERENCES streamline.profiles(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  pay_rate    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pay_period  TEXT NOT NULL DEFAULT 'hourly' CHECK (pay_period IN ('hourly')),
  PRIMARY KEY (user_id, company_id)
);
COMMENT ON TABLE streamline.company_members IS 'Links users to companies and defines their role and pay rate.';

-- 4. JOBS TABLE
CREATE TABLE streamline.jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  company_id    UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  is_archived   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.jobs IS 'Defines a work site or project.';

-- 5. TIMESHEETS TABLE
CREATE TABLE streamline.timesheets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id              UUID NOT NULL REFERENCES streamline.profiles(id) ON DELETE CASCADE,
  job_id                UUID NOT NULL REFERENCES streamline.jobs(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  clock_in              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out             TIMESTAMPTZ,
  clock_in_latitude     DOUBLE PRECISION,
  clock_in_longitude    DOUBLE PRECISION,
  clock_out_latitude    DOUBLE PRECISION,
  clock_out_longitude   DOUBLE PRECISION,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.timesheets IS 'Individual time entries for staff against jobs.';

-- 6. LOCATION PINGS TABLE (For live tracking)
CREATE TABLE streamline.location_pings (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES streamline.profiles(id) ON DELETE CASCADE,
  timesheet_id  UUID NOT NULL REFERENCES streamline.timesheets(id) ON DELETE CASCADE,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.location_pings IS 'Stores periodic location updates for live tracking.';

-- ========= SAAS TABLES =========

-- 1. SUBSCRIPTION PLANS TABLE
CREATE TABLE streamline.subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL,
  price_yearly  NUMERIC(10, 2) NOT NULL,
  max_employees INTEGER NOT NULL DEFAULT 1,
  max_jobs      INTEGER NOT NULL DEFAULT 10,
  features      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.subscription_plans IS 'Available subscription plans with pricing and limits.';

-- 2. COMPANY SUBSCRIPTIONS TABLE
CREATE TABLE streamline.company_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  plan_id               UUID NOT NULL REFERENCES streamline.subscription_plans(id),
  status                TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id) -- One subscription per company
);
COMMENT ON TABLE streamline.company_subscriptions IS 'Company subscription details and Stripe integration.';

-- 3. USAGE TRACKING TABLE
CREATE TABLE streamline.usage_metrics (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  metric_type   TEXT NOT NULL, -- 'employees', 'timesheets', 'jobs', 'storage'
  metric_value  INTEGER NOT NULL DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric_type, recorded_date)
);
COMMENT ON TABLE streamline.usage_metrics IS 'Daily usage tracking for billing and plan enforcement.';

-- 4. BILLING INVOICES TABLE
CREATE TABLE streamline.billing_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  subscription_id   UUID NOT NULL REFERENCES streamline.company_subscriptions(id),
  stripe_invoice_id TEXT,
  amount            NUMERIC(10, 2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.billing_invoices IS 'Billing invoice records from Stripe.';

-- 5. WEBHOOK EVENTS TABLE (for Stripe webhook processing)
CREATE TABLE streamline.webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  stripe_event_id TEXT UNIQUE,
  event_type      TEXT NOT NULL,
  processed       BOOLEAN DEFAULT FALSE,
  payload         JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.webhook_events IS 'Stripe webhook events for audit and reprocessing.';

-- ========= INDEXES =========

-- Core table indexes
CREATE INDEX idx_location_pings_user_timestamp ON streamline.location_pings (user_id, created_at DESC);
CREATE INDEX idx_timesheets_staff_clock_in ON streamline.timesheets (staff_id, clock_in DESC);
CREATE INDEX idx_timesheets_company_clock_in ON streamline.timesheets (company_id, clock_in DESC);
CREATE INDEX idx_jobs_company_id ON streamline.jobs (company_id);
CREATE INDEX idx_company_members_company_id ON streamline.company_members (company_id);
CREATE INDEX idx_company_members_user_id ON streamline.company_members (user_id);

-- SaaS table indexes
CREATE INDEX idx_company_subscriptions_company_id ON streamline.company_subscriptions (company_id);
CREATE INDEX idx_company_subscriptions_status ON streamline.company_subscriptions (status);
CREATE INDEX idx_usage_metrics_company_date ON streamline.usage_metrics (company_id, recorded_date);
CREATE INDEX idx_billing_invoices_company_id ON streamline.billing_invoices (company_id);
CREATE INDEX idx_billing_invoices_status ON streamline.billing_invoices (status);
CREATE INDEX idx_webhook_events_stripe_id ON streamline.webhook_events (stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON streamline.webhook_events (processed);

-- ========= ROW LEVEL SECURITY =========

-- Enable RLS on all tables
ALTER TABLE streamline.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.webhook_events ENABLE ROW LEVEL SECURITY;

-- Core RLS Policies
CREATE POLICY "Allow users to manage their own profile" ON streamline.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Allow members to see their own companies" ON streamline.companies
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = id AND company_members.user_id = auth.uid()
  ));

CREATE POLICY "Allow authenticated users to create companies" ON streamline.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to see their own memberships" ON streamline.company_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow admins to manage company memberships" ON streamline.company_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = company_members.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

CREATE POLICY "Allow members to see company jobs" ON streamline.jobs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = jobs.company_id AND company_members.user_id = auth.uid()
  ));

CREATE POLICY "Allow admins to manage company jobs" ON streamline.jobs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = jobs.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

CREATE POLICY "Allow staff to manage their own timesheets" ON streamline.timesheets
  FOR ALL USING (auth.uid() = staff_id);

CREATE POLICY "Allow admins to see all company timesheets" ON streamline.timesheets
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = timesheets.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

CREATE POLICY "Allow users to manage their own location pings" ON streamline.location_pings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow admins to see company location pings" ON streamline.location_pings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    JOIN streamline.timesheets t ON cm.company_id = t.company_id
    WHERE t.id = location_pings.timesheet_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- SaaS RLS Policies
CREATE POLICY "Allow everyone to see subscription plans" ON streamline.subscription_plans
  FOR SELECT USING (true);

CREATE POLICY "Allow members to see their company subscription" ON streamline.company_subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = company_subscriptions.company_id AND company_members.user_id = auth.uid()
  ));

CREATE POLICY "Allow admins to manage company subscription" ON streamline.company_subscriptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = company_subscriptions.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

CREATE POLICY "Allow members to see company usage metrics" ON streamline.usage_metrics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = usage_metrics.company_id AND company_members.user_id = auth.uid()
  ));

CREATE POLICY "Allow members to see company billing invoices" ON streamline.billing_invoices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = billing_invoices.company_id AND company_members.user_id = auth.uid()
  ));

-- ========= FUNCTIONS =========

-- Core Functions
CREATE OR REPLACE FUNCTION streamline.get_active_shift(p_staff_id UUID)
RETURNS SETOF streamline.timesheets AS $$
  SELECT * FROM streamline.timesheets
  WHERE staff_id = p_staff_id AND clock_out IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION streamline.clock_out_user(p_timesheet_id UUID, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION)
RETURNS VOID AS $$
  UPDATE streamline.timesheets
  SET
    clock_out = NOW(),
    clock_out_latitude = p_latitude,
    clock_out_longitude = p_longitude
  WHERE id = p_timesheet_id AND staff_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

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

-- SaaS Functions
CREATE OR REPLACE FUNCTION streamline.can_add_employee(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current employee count
  SELECT COUNT(*) INTO current_count
  FROM streamline.company_members
  WHERE company_id = p_company_id;
  
  -- Get max employees from subscription
  SELECT sp.max_employees INTO max_allowed
  FROM streamline.company_subscriptions cs
  JOIN streamline.subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.company_id = p_company_id AND cs.status = 'active';
  
  -- Return true if unlimited (-1) or under limit
  RETURN (max_allowed = -1 OR current_count < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION streamline.can_add_job(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current job count
  SELECT COUNT(*) INTO current_count
  FROM streamline.jobs
  WHERE company_id = p_company_id AND is_archived = FALSE;
  
  -- Get max jobs from subscription
  SELECT sp.max_jobs INTO max_allowed
  FROM streamline.company_subscriptions cs
  JOIN streamline.subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.company_id = p_company_id AND cs.status = 'active';
  
  -- Return true if unlimited (-1) or under limit
  RETURN (max_allowed = -1 OR current_count < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION streamline.get_company_subscription(p_company_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_description TEXT,
  status TEXT,
  max_employees INTEGER,
  max_jobs INTEGER,
  current_employees INTEGER,
  current_jobs INTEGER,
  features JSONB,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ
) AS $$
  SELECT
    sp.name as plan_name,
    sp.description as plan_description,
    cs.status,
    sp.max_employees,
    sp.max_jobs,
    (SELECT COUNT(*) FROM streamline.company_members WHERE company_id = p_company_id) as current_employees,
    (SELECT COUNT(*) FROM streamline.jobs WHERE company_id = p_company_id AND is_archived = FALSE) as current_jobs,
    sp.features,
    cs.current_period_end,
    cs.trial_end
  FROM streamline.company_subscriptions cs
  JOIN streamline.subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.company_id = p_company_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION streamline.record_usage_metric(p_company_id UUID, p_metric_type TEXT, p_metric_value INTEGER)
RETURNS VOID AS $$
  INSERT INTO streamline.usage_metrics (company_id, metric_type, metric_value, recorded_date)
  VALUES (p_company_id, p_metric_type, p_metric_value, CURRENT_DATE)
  ON CONFLICT (company_id, metric_type, recorded_date)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION streamline.get_usage_summary(p_company_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  metric_type TEXT,
  total_usage INTEGER,
  average_daily INTEGER
) AS $$
  SELECT
    metric_type,
    SUM(metric_value) as total_usage,
    ROUND(AVG(metric_value)) as average_daily
  FROM streamline.usage_metrics
  WHERE company_id = p_company_id
    AND recorded_date >= p_start_date
    AND recorded_date <= p_end_date
  GROUP BY metric_type;
$$ LANGUAGE sql STABLE;

-- Trigger Functions
CREATE OR REPLACE FUNCTION streamline.enforce_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
  company_uuid UUID;
  can_proceed BOOLEAN;
BEGIN
  -- Get company_id from the trigger context
  IF TG_TABLE_NAME = 'company_members' THEN
    company_uuid := NEW.company_id;
    -- Check employee limit
    SELECT streamline.can_add_employee(company_uuid) INTO can_proceed;
    IF NOT can_proceed THEN
      RAISE EXCEPTION 'Employee limit reached for your subscription plan';
    END IF;
  ELSIF TG_TABLE_NAME = 'jobs' THEN
    company_uuid := NEW.company_id;
    -- Check job limit
    SELECT streamline.can_add_job(company_uuid) INTO can_proceed;
    IF NOT can_proceed THEN
      RAISE EXCEPTION 'Job limit reached for your subscription plan';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION streamline.create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  starter_plan_id UUID;
BEGIN
  -- Get the starter plan ID
  SELECT id INTO starter_plan_id
  FROM streamline.subscription_plans
  WHERE name = 'Starter' AND is_active = TRUE
  LIMIT 1;
  
  -- Create a trial subscription
  INSERT INTO streamline.company_subscriptions (
    company_id,
    plan_id,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    starter_plan_id,
    'trialing',
    NOW() + INTERVAL '14 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========= TRIGGERS =========

-- Create triggers to enforce limits
CREATE TRIGGER enforce_employee_limit
  BEFORE INSERT ON streamline.company_members
  FOR EACH ROW
  EXECUTE FUNCTION streamline.enforce_subscription_limits();

CREATE TRIGGER enforce_job_limit
  BEFORE INSERT ON streamline.jobs
  FOR EACH ROW
  EXECUTE FUNCTION streamline.enforce_subscription_limits();

-- Create trigger to auto-create subscription for new companies
CREATE TRIGGER create_company_subscription
  AFTER INSERT ON streamline.companies
  FOR EACH ROW
  EXECUTE FUNCTION streamline.create_default_subscription();

-- ========= EMPLOYEE INVITATIONS SYSTEM =========

-- Employee invitations table
CREATE TABLE IF NOT EXISTS streamline.employee_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  pay_rate      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pay_period    TEXT NOT NULL DEFAULT 'hourly' CHECK (pay_period IN ('hourly')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token         UUID DEFAULT gen_random_uuid(),
  invited_by    UUID NOT NULL REFERENCES streamline.profiles(id),
  invited_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employee invitations
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_id ON streamline.employee_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON streamline.employee_invitations (email);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON streamline.employee_invitations (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invitations_unique_pending 
ON streamline.employee_invitations (company_id, email) 
WHERE status = 'pending';

-- Enable RLS for employee invitations
ALTER TABLE streamline.employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee invitations
CREATE POLICY "Users can view invitations for their companies" ON streamline.employee_invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invitations for their companies" ON streamline.employee_invitations
  FOR ALL USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ========= GENERAL WORK JOB SYSTEM =========
-- Ensures every company has a system default job for when job tracking is disabled

-- Add is_system_default column to jobs table
ALTER TABLE streamline.jobs 
ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT FALSE;

-- Create indexes and constraints
CREATE INDEX IF NOT EXISTS idx_jobs_system_default 
ON streamline.jobs (company_id, is_system_default) 
WHERE is_system_default = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_system_default_per_company 
ON streamline.jobs (company_id) 
WHERE is_system_default = TRUE;

ALTER TABLE streamline.jobs 
ADD CONSTRAINT IF NOT EXISTS chk_system_default_not_archived 
  CHECK (NOT (is_system_default = TRUE AND is_archived = TRUE));

-- RLS policies to protect system defaults
CREATE POLICY IF NOT EXISTS "Users cannot create system default jobs" ON streamline.jobs
  FOR INSERT WITH CHECK (is_system_default = FALSE OR is_system_default IS NULL);

CREATE POLICY IF NOT EXISTS "System default jobs cannot be deleted" ON streamline.jobs
  FOR DELETE USING (is_system_default = FALSE OR is_system_default IS NULL);

CREATE POLICY IF NOT EXISTS "System default jobs cannot be archived" ON streamline.jobs
  FOR UPDATE USING (
    CASE 
      WHEN OLD.is_system_default = TRUE THEN 
        (NEW.is_archived = OLD.is_archived AND OLD.is_archived = FALSE)
      ELSE TRUE
    END
  );

-- Function to ensure company has default job
CREATE OR REPLACE FUNCTION streamline.ensure_company_has_default_job(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  v_default_job_id UUID;
  v_company_name TEXT;
BEGIN
  SELECT id INTO v_default_job_id
  FROM streamline.jobs
  WHERE company_id = p_company_id AND is_system_default = TRUE AND is_archived = FALSE
  LIMIT 1;
  
  IF v_default_job_id IS NOT NULL THEN
    UPDATE streamline.companies SET default_job_id = v_default_job_id
    WHERE id = p_company_id AND (default_job_id IS NULL OR default_job_id != v_default_job_id);
    RETURN v_default_job_id;
  END IF;
  
  SELECT name INTO v_company_name FROM streamline.companies WHERE id = p_company_id;
  
  INSERT INTO streamline.jobs (name, address, company_id, is_archived, is_system_default)
  VALUES ('General Work', COALESCE(v_company_name, 'Company') || ' - Default Work Location', 
          p_company_id, FALSE, TRUE)
  RETURNING id INTO v_default_job_id;
  
  UPDATE streamline.companies SET default_job_id = v_default_job_id WHERE id = p_company_id;
  
  RETURN v_default_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating default job on company insert
CREATE OR REPLACE FUNCTION streamline.trigger_create_default_job()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM streamline.ensure_company_has_default_job(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_default_job ON streamline.companies;
CREATE TRIGGER trigger_auto_create_default_job
  AFTER INSERT ON streamline.companies
  FOR EACH ROW
  EXECUTE FUNCTION streamline.trigger_create_default_job();

-- Grant permissions
GRANT EXECUTE ON FUNCTION streamline.ensure_company_has_default_job(UUID) TO authenticated;

-- ========= SEED DATA =========

-- Insert default subscription plans
INSERT INTO streamline.subscription_plans (name, description, price_monthly, price_yearly, max_employees, max_jobs, features, sort_order) VALUES
('Starter', 'Perfect for small teams getting started', 29.00, 290.00, 5, 10, '{"time_tracking": true, "basic_reports": true, "gps_tracking": true, "email_support": true}', 1),
('Professional', 'For growing teams that need more features', 79.00, 790.00, 25, 50, '{"time_tracking": true, "advanced_reports": true, "gps_tracking": true, "payroll_export": true, "priority_support": true, "custom_branding": true}', 2),
('Enterprise', 'For large teams with advanced needs', 199.00, 1990.00, -1, -1, '{"time_tracking": true, "advanced_reports": true, "gps_tracking": true, "payroll_export": true, "priority_support": true, "custom_branding": true, "api_access": true, "white_label": true, "dedicated_support": true}', 3);

-- ========= COMPLETE =========
-- Database setup is now complete!
-- You can now create users, companies, and start using the application.
