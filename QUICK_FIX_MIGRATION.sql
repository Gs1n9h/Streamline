-- ========= QUICK FIX: Complete General Work Migration =========
-- Run this in Supabase SQL Editor to fix the clock-in issue immediately

-- 1. Create default jobs for all companies (including yours)
DO $$
DECLARE
  company_record RECORD;
  new_job_id UUID;
BEGIN
  FOR company_record IN 
    SELECT id, name FROM streamline.companies 
  LOOP
    -- Create default job for each company
    SELECT streamline.ensure_company_has_default_job(company_record.id) 
    INTO new_job_id;
    
    RAISE NOTICE 'Created default job % for company %', 
                 new_job_id, company_record.name;
  END LOOP;
END $$;

-- 2. Add RLS policies to protect system defaults
CREATE POLICY IF NOT EXISTS "Users cannot create system default jobs" ON streamline.jobs
  FOR INSERT WITH CHECK (
    is_system_default = FALSE OR is_system_default IS NULL
  );

CREATE POLICY IF NOT EXISTS "System default jobs cannot be deleted" ON streamline.jobs
  FOR DELETE USING (
    is_system_default = FALSE OR is_system_default IS NULL
  );

-- 3. Create trigger for auto-creating default job on company insert
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

-- 4. Verify all companies have default jobs
SELECT 
  c.id,
  c.name,
  c.default_job_id,
  j.name as default_job_name,
  j.is_system_default,
  CASE 
    WHEN c.default_job_id IS NULL THEN '❌ NO DEFAULT JOB'
    WHEN j.is_system_default IS NOT TRUE THEN '⚠️  NOT SYSTEM DEFAULT'
    ELSE '✅ READY'
  END as status
FROM streamline.companies c
LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
ORDER BY c.name;

-- 5. Test the fix with your specific company
SELECT 
  'Testing clock-in function for rohim88406...' as message,
  streamline.create_timesheet_with_optional_job(
    '27dc9d3a-d171-40ed-abc9-fc3744d53adf',  -- Your user ID from the error
    'e98be83a-0926-4e47-b677-8d06c53e4ae5',  -- Your company ID from the error
    NULL,  -- No job provided (this should now work!)
    -36.4288931113481,  -- Latitude from error
    145.400549281505    -- Longitude from error
  ) as test_timesheet_id;

-- 6. Verify the test timesheet was created with the default job
SELECT 
  t.id,
  t.staff_id,
  t.company_id,
  j.name as job_name,
  j.is_system_default,
  t.created_at
FROM streamline.timesheets t
JOIN streamline.jobs j ON t.job_id = j.id
WHERE t.company_id = 'e98be83a-0926-4e47-b677-8d06c53e4ae5'
ORDER BY t.created_at DESC
LIMIT 1;

-- ========= MIGRATION COMPLETE =========
-- If you see ✅ READY for all companies and the test passes, 
-- your mobile app should now work without errors!
