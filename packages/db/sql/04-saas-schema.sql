-- ========= SAAS INFRASTRUCTURE: SUBSCRIPTION & BILLING =========

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

-- Create indexes for performance
CREATE INDEX idx_company_subscriptions_company_id ON streamline.company_subscriptions (company_id);
CREATE INDEX idx_company_subscriptions_status ON streamline.company_subscriptions (status);
CREATE INDEX idx_usage_metrics_company_date ON streamline.usage_metrics (company_id, recorded_date);
CREATE INDEX idx_billing_invoices_company_id ON streamline.billing_invoices (company_id);
CREATE INDEX idx_billing_invoices_status ON streamline.billing_invoices (status);
CREATE INDEX idx_webhook_events_stripe_id ON streamline.webhook_events (stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON streamline.webhook_events (processed);

-- Insert default subscription plans
INSERT INTO streamline.subscription_plans (name, description, price_monthly, price_yearly, max_employees, max_jobs, features, sort_order) VALUES
('Starter', 'Perfect for small teams getting started', 29.00, 290.00, 5, 10, '{"time_tracking": true, "basic_reports": true, "gps_tracking": true, "email_support": true}', 1),
('Professional', 'For growing teams that need more features', 79.00, 790.00, 25, 50, '{"time_tracking": true, "advanced_reports": true, "gps_tracking": true, "payroll_export": true, "priority_support": true, "custom_branding": true}', 2),
('Enterprise', 'For large teams with advanced needs', 199.00, 1990.00, -1, -1, '{"time_tracking": true, "advanced_reports": true, "gps_tracking": true, "payroll_export": true, "priority_support": true, "custom_branding": true, "api_access": true, "white_label": true, "dedicated_support": true}', 3);
