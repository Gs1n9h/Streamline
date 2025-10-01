-- ========= JOB MANAGEMENT ENHANCEMENTS =========
-- Admin settings for job features and employee assignments

-- 1. Extend companies table with job settings
ALTER TABLE streamline.companies ADD COLUMN IF NOT EXISTS job_tracking_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE streamline.companies ADD COLUMN IF NOT EXISTS job_selection_required BOOLEAN DEFAULT TRUE;
ALTER TABLE streamline.companies ADD COLUMN IF NOT EXISTS default_job_id UUID REFERENCES streamline.jobs(id);

COMMENT ON COLUMN streamline.companies.job_tracking_enabled IS 'Whether job tracking is enabled for this company';
COMMENT ON COLUMN streamline.companies.job_selection_required IS 'Whether employees must select a job when clocking in';
COMMENT ON COLUMN streamline.companies.default_job_id IS 'Default job to use when job selection is not required';

-- 2. Create job assignments table for specific employee assignments
CREATE TABLE IF NOT EXISTS streamline.job_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES streamline.jobs(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES streamline.profiles(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  assigned_by   UUID NOT NULL REFERENCES streamline.profiles(id),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id, company_id)
);

COMMENT ON TABLE streamline.job_assignments IS 'Assigns specific jobs to specific employees within a company';

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON streamline.job_assignments (job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON streamline.job_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_company_id ON streamline.job_assignments (company_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_active ON streamline.job_assignments (is_active);

-- 4. Enable RLS for job_assignments
ALTER TABLE streamline.job_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for job_assignments
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

-- 6. Create function to get available jobs for a user
CREATE OR REPLACE FUNCTION streamline.get_available_jobs_for_user(p_user_id UUID, p_company_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  is_default BOOLEAN,
  is_assigned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.name,
    j.address,
    (j.id = c.default_job_id) as is_default,
    (ja.id IS NOT NULL) as is_assigned
  FROM streamline.jobs j
  CROSS JOIN streamline.companies c
  LEFT JOIN streamline.job_assignments ja ON ja.job_id = j.id 
    AND ja.user_id = p_user_id 
    AND ja.company_id = p_company_id 
    AND ja.is_active = TRUE
  WHERE j.company_id = p_company_id 
    AND j.is_archived = FALSE
    AND c.id = p_company_id
    AND c.job_tracking_enabled = TRUE
    AND (
      -- Show job if:
      -- 1. No specific assignments exist for this company (all jobs available to all)
      NOT EXISTS (
        SELECT 1 FROM streamline.job_assignments ja2 
        WHERE ja2.company_id = p_company_id AND ja2.is_active = TRUE
      )
      OR
      -- 2. This user is specifically assigned to this job
      ja.id IS NOT NULL
      OR
      -- 3. This is the default job and no assignments exist for this user
      (j.id = c.default_job_id AND NOT EXISTS (
        SELECT 1 FROM streamline.job_assignments ja3 
        WHERE ja3.user_id = p_user_id AND ja3.company_id = p_company_id AND ja3.is_active = TRUE
      ))
    )
  ORDER BY is_default DESC, is_assigned DESC, j.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check if job selection is required
CREATE OR REPLACE FUNCTION streamline.is_job_selection_required(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  job_selection_required BOOLEAN;
  job_tracking_enabled BOOLEAN;
BEGIN
  SELECT c.job_selection_required, c.job_tracking_enabled
  INTO job_selection_required, job_tracking_enabled
  FROM streamline.companies c
  WHERE c.id = p_company_id;
  
  -- Job selection is required only if job tracking is enabled AND job selection is required
  RETURN COALESCE(job_tracking_enabled, TRUE) AND COALESCE(job_selection_required, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get default job for a company
CREATE OR REPLACE FUNCTION streamline.get_default_job_for_company(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  default_job_id UUID;
BEGIN
  SELECT c.default_job_id
  INTO default_job_id
  FROM streamline.companies c
  WHERE c.id = p_company_id;
  
  -- If no default job is set, get the first available job
  IF default_job_id IS NULL THEN
    SELECT j.id INTO default_job_id
    FROM streamline.jobs j
    WHERE j.company_id = p_company_id 
      AND j.is_archived = FALSE
    ORDER BY j.created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN default_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update the timesheet insertion to handle optional job selection
CREATE OR REPLACE FUNCTION streamline.create_timesheet_with_optional_job(
  p_staff_id UUID,
  p_company_id UUID,
  p_job_id UUID DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  timesheet_id UUID;
  final_job_id UUID;
  job_selection_required BOOLEAN;
BEGIN
  -- Check if job selection is required
  SELECT streamline.is_job_selection_required(p_company_id) INTO job_selection_required;
  
  -- Determine the job ID to use
  IF job_selection_required THEN
    -- Job selection is required, use provided job_id
    final_job_id := p_job_id;
  ELSE
    -- Job selection is not required, use default job or provided job
    IF p_job_id IS NOT NULL THEN
      final_job_id := p_job_id;
    ELSE
      final_job_id := streamline.get_default_job_for_company(p_company_id);
    END IF;
  END IF;
  
  -- Validate that the job exists and belongs to the company
  IF final_job_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM streamline.jobs 
      WHERE id = final_job_id 
        AND company_id = p_company_id 
        AND is_archived = FALSE
    ) THEN
      RAISE EXCEPTION 'Invalid job ID for this company';
    END IF;
  END IF;
  
  -- Create the timesheet
  INSERT INTO streamline.timesheets (
    staff_id,
    job_id,
    company_id,
    clock_in_latitude,
    clock_in_longitude
  ) VALUES (
    p_staff_id,
    final_job_id,
    p_company_id,
    p_latitude,
    p_longitude
  ) RETURNING id INTO timesheet_id;
  
  RETURN timesheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION streamline.get_available_jobs_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.is_job_selection_required(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.get_default_job_for_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.create_timesheet_with_optional_job(UUID, UUID, UUID, NUMERIC, NUMERIC) TO authenticated;
