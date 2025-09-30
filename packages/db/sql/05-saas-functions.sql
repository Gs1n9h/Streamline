-- ========= SAAS INFRASTRUCTURE: FUNCTIONS & RPCs =========

-- Function to check if company can add more employees
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

-- Function to check if company can add more jobs
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

-- Function to get company subscription info
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

-- Function to record usage metrics
CREATE OR REPLACE FUNCTION streamline.record_usage_metric(p_company_id UUID, p_metric_type TEXT, p_metric_value INTEGER)
RETURNS VOID AS $$
  INSERT INTO streamline.usage_metrics (company_id, metric_type, metric_value, recorded_date)
  VALUES (p_company_id, p_metric_type, p_metric_value, CURRENT_DATE)
  ON CONFLICT (company_id, metric_type, recorded_date)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get usage summary for billing
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

-- Function to check subscription status and enforce limits
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

-- Create triggers to enforce limits
CREATE TRIGGER enforce_employee_limit
  BEFORE INSERT ON streamline.company_members
  FOR EACH ROW
  EXECUTE FUNCTION streamline.enforce_subscription_limits();

CREATE TRIGGER enforce_job_limit
  BEFORE INSERT ON streamline.jobs
  FOR EACH ROW
  EXECUTE FUNCTION streamline.enforce_subscription_limits();

-- Function to create default subscription for new companies
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

-- Create trigger to auto-create subscription for new companies
CREATE TRIGGER create_company_subscription
  AFTER INSERT ON streamline.companies
  FOR EACH ROW
  EXECUTE FUNCTION streamline.create_default_subscription();
