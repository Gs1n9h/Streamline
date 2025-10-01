-- ========= GENERAL WORK JOB SYSTEM =========
-- Solves the job_id NOT NULL constraint issue by ensuring every company has a system default job
-- This allows users to clock in when job tracking is disabled

-- 1. Add is_system_default column to jobs table
ALTER TABLE streamline.jobs 
ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN streamline.jobs.is_system_default IS 
  'System-managed default job that cannot be deleted by users';

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_system_default 
ON streamline.jobs (company_id, is_system_default) 
WHERE is_system_default = TRUE;

-- 3. Add constraints to ensure data integrity
-- Only one system default per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_system_default_per_company 
ON streamline.jobs (company_id) 
WHERE is_system_default = TRUE;

-- System defaults cannot be archived
ALTER TABLE streamline.jobs 
ADD CONSTRAINT IF NOT EXISTS chk_system_default_not_archived 
  CHECK (NOT (is_system_default = TRUE AND is_archived = TRUE));

-- 4. Update RLS policies to protect system default jobs
-- Prevent users from creating system default jobs
CREATE POLICY IF NOT EXISTS "Users cannot create system default jobs" ON streamline.jobs
  FOR INSERT WITH CHECK (
    is_system_default = FALSE OR is_system_default IS NULL
  );

-- Prevent deletion of system default jobs
CREATE POLICY IF NOT EXISTS "System default jobs cannot be deleted" ON streamline.jobs
  FOR DELETE USING (
    is_system_default = FALSE OR is_system_default IS NULL
  );

-- Prevent archiving of system default jobs (allow other updates)
CREATE POLICY IF NOT EXISTS "System default jobs cannot be archived" ON streamline.jobs
  FOR UPDATE USING (
    CASE 
      WHEN OLD.is_system_default = TRUE THEN 
        -- Allow updates but prevent archiving
        (NEW.is_archived = OLD.is_archived AND OLD.is_archived = FALSE)
      ELSE 
        TRUE
    END
  );

-- 5. Create function to ensure company has default job (idempotent)
CREATE OR REPLACE FUNCTION streamline.ensure_company_has_default_job(
  p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_default_job_id UUID;
  v_company_name TEXT;
BEGIN
  -- Check if company already has a system default job
  SELECT id INTO v_default_job_id
  FROM streamline.jobs
  WHERE company_id = p_company_id 
    AND is_system_default = TRUE
    AND is_archived = FALSE
  LIMIT 1;
  
  -- If exists, ensure it's set as company default and return it
  IF v_default_job_id IS NOT NULL THEN
    -- Make sure it's set as the company's default_job_id
    UPDATE streamline.companies
    SET default_job_id = v_default_job_id
    WHERE id = p_company_id AND (default_job_id IS NULL OR default_job_id != v_default_job_id);
    
    RETURN v_default_job_id;
  END IF;
  
  -- Get company name for better job naming
  SELECT name INTO v_company_name
  FROM streamline.companies
  WHERE id = p_company_id;
  
  -- Create system default job
  INSERT INTO streamline.jobs (
    name,
    address,
    company_id,
    is_archived,
    is_system_default
  ) VALUES (
    'General Work',
    COALESCE(v_company_name, 'Company') || ' - Default Work Location',
    p_company_id,
    FALSE,
    TRUE
  ) RETURNING id INTO v_default_job_id;
  
  -- Update company's default_job_id
  UPDATE streamline.companies
  SET default_job_id = v_default_job_id
  WHERE id = p_company_id;
  
  RETURN v_default_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION streamline.ensure_company_has_default_job(UUID) IS 
  'Ensures company has a system default job, creates if needed (idempotent)';

-- 6. Update the timesheet creation function to use default job when needed
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
  job_tracking_enabled BOOLEAN;
BEGIN
  -- Get company settings
  SELECT 
    COALESCE(c.job_selection_required, TRUE),
    COALESCE(c.job_tracking_enabled, TRUE)
  INTO 
    job_selection_required,
    job_tracking_enabled
  FROM streamline.companies c
  WHERE c.id = p_company_id;
  
  -- If company not found, raise error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found: %', p_company_id;
  END IF;
  
  -- Determine the job ID to use
  IF job_tracking_enabled = FALSE THEN
    -- Job tracking disabled: ALWAYS use default job
    -- Ensure default job exists (idempotent)
    final_job_id := streamline.ensure_company_has_default_job(p_company_id);
    
  ELSIF job_selection_required = TRUE THEN
    -- Job selection is required, use provided job_id
    IF p_job_id IS NULL THEN
      RAISE EXCEPTION 'Job selection is required for this company';
    END IF;
    final_job_id := p_job_id;
    
  ELSE
    -- Job selection is optional
    IF p_job_id IS NOT NULL THEN
      final_job_id := p_job_id;
    ELSE
      -- No job provided, use default
      final_job_id := streamline.ensure_company_has_default_job(p_company_id);
    END IF;
  END IF;
  
  -- Validate that the job exists and belongs to the company
  IF NOT EXISTS (
    SELECT 1 FROM streamline.jobs 
    WHERE id = final_job_id 
      AND company_id = p_company_id 
      AND is_archived = FALSE
  ) THEN
    RAISE EXCEPTION 'Invalid job ID for this company: %', final_job_id;
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

COMMENT ON FUNCTION streamline.create_timesheet_with_optional_job IS 
  'Creates timesheet with automatic default job handling when job tracking is disabled';

-- 7. Create trigger function for auto-creating default job on company insert
CREATE OR REPLACE FUNCTION streamline.trigger_create_default_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default job for new company
  PERFORM streamline.ensure_company_has_default_job(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Attach trigger to companies table
DROP TRIGGER IF EXISTS trigger_auto_create_default_job ON streamline.companies;
CREATE TRIGGER trigger_auto_create_default_job
  AFTER INSERT ON streamline.companies
  FOR EACH ROW
  EXECUTE FUNCTION streamline.trigger_create_default_job();

COMMENT ON TRIGGER trigger_auto_create_default_job ON streamline.companies IS 
  'Automatically creates system default job when new company is created';

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION streamline.ensure_company_has_default_job(UUID) TO authenticated;

-- Note: create_timesheet_with_optional_job permissions already granted in 06-job-management.sql

-- 10. Migrate existing companies to have default jobs
DO $$
DECLARE
  company_record RECORD;
  new_job_id UUID;
  company_count INTEGER := 0;
  success_count INTEGER := 0;
BEGIN
  -- Count total companies
  SELECT COUNT(*) INTO company_count FROM streamline.companies;
  
  RAISE NOTICE 'Starting migration for % companies...', company_count;
  
  -- Process each company
  FOR company_record IN 
    SELECT id, name FROM streamline.companies 
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Create default job if it doesn't exist
      SELECT streamline.ensure_company_has_default_job(company_record.id) 
      INTO new_job_id;
      
      success_count := success_count + 1;
      
      -- Log progress every 100 companies
      IF success_count % 100 = 0 THEN
        RAISE NOTICE 'Processed % of % companies...', success_count, company_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default job for company % (%): %', 
                    company_record.id, company_record.name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migration completed: % of % companies processed successfully', 
               success_count, company_count;
END $$;

-- 11. Verification query - ensure all companies have default jobs
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM streamline.companies c
  LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
  WHERE c.default_job_id IS NULL 
     OR j.id IS NULL 
     OR j.is_system_default IS NOT TRUE
     OR j.is_archived = TRUE;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Found % companies without proper default jobs', missing_count;
    
    -- Show details
    RAISE NOTICE 'Companies missing default jobs:';
    FOR company_record IN 
      SELECT c.id, c.name, c.default_job_id, j.is_system_default, j.is_archived
      FROM streamline.companies c
      LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
      WHERE c.default_job_id IS NULL 
         OR j.id IS NULL 
         OR j.is_system_default IS NOT TRUE
         OR j.is_archived = TRUE
      LIMIT 10
    LOOP
      RAISE NOTICE '- Company: % (%) - default_job_id: %, system_default: %, archived: %',
                   company_record.name, company_record.id, company_record.default_job_id,
                   company_record.is_system_default, company_record.is_archived;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All companies have valid system default jobs';
  END IF;
END $$;

-- 12. Create summary view for monitoring system defaults
CREATE OR REPLACE VIEW streamline.v_company_default_jobs AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  c.job_tracking_enabled,
  c.job_selection_required,
  c.default_job_id,
  j.name as default_job_name,
  j.is_system_default,
  j.is_archived as default_job_archived,
  j.created_at as default_job_created
FROM streamline.companies c
LEFT JOIN streamline.jobs j ON c.default_job_id = j.id;

COMMENT ON VIEW streamline.v_company_default_jobs IS 
  'Monitoring view for company default job status';

-- Grant view access
GRANT SELECT ON streamline.v_company_default_jobs TO authenticated;

-- ========= MIGRATION COMPLETE =========
-- Summary of changes:
-- ✅ Added is_system_default column to jobs table
-- ✅ Created indexes and constraints for data integrity
-- ✅ Updated RLS policies to protect system defaults
-- ✅ Created ensure_company_has_default_job() function
-- ✅ Updated create_timesheet_with_optional_job() function
-- ✅ Created trigger for auto-creating default jobs
-- ✅ Migrated all existing companies to have default jobs
-- ✅ Added verification and monitoring tools

RAISE NOTICE '🎉 General Work Job System migration completed successfully!';
RAISE NOTICE 'Users can now clock in when job tracking is disabled.';
RAISE NOTICE 'Check streamline.v_company_default_jobs view to monitor system defaults.';
