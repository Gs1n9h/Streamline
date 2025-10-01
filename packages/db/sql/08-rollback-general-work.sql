-- ========= ROLLBACK: General Work Job System =========
-- Use this script to rollback the General Work Job System if needed
-- WARNING: This will remove all system default jobs and may cause clock-in issues

BEGIN;

RAISE NOTICE 'Starting rollback of General Work Job System...';

-- 1. Drop the monitoring view
DROP VIEW IF EXISTS streamline.v_company_default_jobs;
RAISE NOTICE '✅ Dropped monitoring view';

-- 2. Remove trigger and trigger function
DROP TRIGGER IF EXISTS trigger_auto_create_default_job ON streamline.companies;
DROP FUNCTION IF EXISTS streamline.trigger_create_default_job();
RAISE NOTICE '✅ Removed auto-creation trigger';

-- 3. Drop the new RLS policies
DROP POLICY IF EXISTS "Users cannot create system default jobs" ON streamline.jobs;
DROP POLICY IF EXISTS "System default jobs cannot be deleted" ON streamline.jobs;
DROP POLICY IF EXISTS "System default jobs cannot be archived" ON streamline.jobs;
RAISE NOTICE '✅ Removed RLS policies';

-- 4. Clear company default_job_id references to system defaults
UPDATE streamline.companies 
SET default_job_id = NULL
WHERE default_job_id IN (
  SELECT id FROM streamline.jobs WHERE is_system_default = TRUE
);
RAISE NOTICE '✅ Cleared company default_job_id references';

-- 5. Remove all system default jobs
DELETE FROM streamline.jobs WHERE is_system_default = TRUE;
RAISE NOTICE '✅ Deleted all system default jobs';

-- 6. Drop the ensure_company_has_default_job function
DROP FUNCTION IF EXISTS streamline.ensure_company_has_default_job(UUID);
RAISE NOTICE '✅ Dropped ensure_company_has_default_job function';

-- 7. Restore original create_timesheet_with_optional_job function
-- (This restores the version from 06-job-management.sql)
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
RAISE NOTICE '✅ Restored original create_timesheet_with_optional_job function';

-- 8. Remove constraints
ALTER TABLE streamline.jobs DROP CONSTRAINT IF EXISTS chk_system_default_not_archived;
RAISE NOTICE '✅ Removed check constraint';

-- 9. Drop indexes
DROP INDEX IF EXISTS streamline.idx_one_system_default_per_company;
DROP INDEX IF EXISTS streamline.idx_jobs_system_default;
RAISE NOTICE '✅ Dropped indexes';

-- 10. Remove the is_system_default column
ALTER TABLE streamline.jobs DROP COLUMN IF EXISTS is_system_default;
RAISE NOTICE '✅ Removed is_system_default column';

-- 11. Verification - check for any remaining references
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  -- Check if any companies still reference non-existent jobs
  SELECT COUNT(*) INTO remaining_count
  FROM streamline.companies c
  LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
  WHERE c.default_job_id IS NOT NULL AND j.id IS NULL;
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Found % companies with invalid default_job_id references', remaining_count;
    -- Clean them up
    UPDATE streamline.companies SET default_job_id = NULL 
    WHERE default_job_id NOT IN (SELECT id FROM streamline.jobs);
    RAISE NOTICE 'Cleaned up invalid references';
  END IF;
END $$;

RAISE NOTICE '🔄 General Work Job System rollback completed';
RAISE WARNING '⚠️  WARNING: Users may not be able to clock in when job tracking is disabled';
RAISE NOTICE 'You may need to manually set default jobs or re-enable job tracking for affected companies';

-- Uncomment the next line to actually commit the rollback
-- COMMIT;

-- By default, rollback the transaction (safety measure)
ROLLBACK;
