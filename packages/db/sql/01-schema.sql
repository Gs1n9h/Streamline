-- ========= STREAMLINE: COMPLETE DATABASE SCHEMA =========
-- Run this in the Supabase SQL Editor to set up the entire database

-- Create custom schema
CREATE SCHEMA IF NOT EXISTS streamline;

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

-- Create indexes for better performance
CREATE INDEX idx_location_pings_user_timestamp ON streamline.location_pings (user_id, created_at DESC);
CREATE INDEX idx_timesheets_staff_clock_in ON streamline.timesheets (staff_id, clock_in DESC);
CREATE INDEX idx_timesheets_company_clock_in ON streamline.timesheets (company_id, clock_in DESC);
CREATE INDEX idx_jobs_company_id ON streamline.jobs (company_id);
CREATE INDEX idx_company_members_company_id ON streamline.company_members (company_id);
CREATE INDEX idx_company_members_user_id ON streamline.company_members (user_id);

