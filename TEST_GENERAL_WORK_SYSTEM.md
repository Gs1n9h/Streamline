# 🧪 Test Plan: General Work Job System

## Pre-Test Setup

### 1. Run the Migration
```sql
-- In Supabase SQL Editor, run:
-- Copy contents of packages/db/sql/08-general-work-job-system.sql
-- Execute the entire script
```

### 2. Verify Migration Success
```sql
-- Check that all companies have default jobs
SELECT 
  c.id,
  c.name,
  c.default_job_id,
  j.name as default_job_name,
  j.is_system_default
FROM streamline.companies c
LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
WHERE c.default_job_id IS NULL 
   OR j.is_system_default IS NOT TRUE;

-- Should return 0 rows
```

---

## Test Cases

### 🔧 Database Level Tests

#### Test 1: System Default Job Creation
```sql
-- Test: ensure_company_has_default_job is idempotent
SELECT streamline.ensure_company_has_default_job('your-company-id-here');
-- Run twice, should return same job_id both times

-- Verify job was created
SELECT * FROM streamline.jobs 
WHERE company_id = 'your-company-id-here' AND is_system_default = TRUE;
```

#### Test 2: RLS Policy Protection
```sql
-- Test: Users cannot create system default jobs
INSERT INTO streamline.jobs (name, company_id, is_system_default)
VALUES ('Fake System Job', 'your-company-id-here', TRUE);
-- Should fail with RLS policy violation

-- Test: Cannot delete system default job
DELETE FROM streamline.jobs WHERE is_system_default = TRUE;
-- Should fail or delete 0 rows

-- Test: Cannot archive system default job
UPDATE streamline.jobs 
SET is_archived = TRUE 
WHERE is_system_default = TRUE;
-- Should fail with check constraint violation
```

#### Test 3: Clock-in Function
```sql
-- Test: Clock in without job (job tracking disabled)
SELECT streamline.create_timesheet_with_optional_job(
  'user-id-here',
  'company-id-here',
  NULL,  -- No job provided
  40.7128,  -- Latitude
  -74.0060  -- Longitude
);
-- Should succeed and return timesheet_id

-- Verify timesheet was created with default job
SELECT t.*, j.name as job_name, j.is_system_default
FROM streamline.timesheets t
JOIN streamline.jobs j ON t.job_id = j.id
WHERE t.staff_id = 'user-id-here'
ORDER BY t.created_at DESC
LIMIT 1;
```

---

### 📱 Mobile App Tests

#### Test 4: Clock-in with Job Tracking Disabled
**Steps:**
1. Go to Company Settings in web dashboard
2. Toggle "Job Tracking" to OFF
3. Save settings
4. Open mobile app
5. Try to clock in (swipe right on slider)

**Expected Result:**
- ✅ Clock-in succeeds without job selection
- ✅ No error messages
- ✅ Timesheet created with "General Work" job
- ✅ User can see active timesheet

#### Test 5: Clock-in with Job Tracking Enabled
**Steps:**
1. Go to Company Settings in web dashboard  
2. Toggle "Job Tracking" to ON
3. Toggle "Require Job Selection" to ON
4. Save settings
5. Open mobile app
6. Try to clock in (swipe right on slider)

**Expected Result:**
- ✅ Job selection modal appears
- ✅ Can select from available jobs
- ✅ Clock-in succeeds with selected job
- ✅ Timesheet created with correct job

#### Test 6: Clock-in with Optional Job Selection
**Steps:**
1. Go to Company Settings in web dashboard
2. Toggle "Job Tracking" to ON
3. Toggle "Require Job Selection" to OFF
4. Save settings
5. Open mobile app
6. Try to clock in (swipe right on slider)

**Expected Result:**
- ✅ Clock-in succeeds immediately (no modal)
- ✅ Uses default job automatically
- ✅ Timesheet created successfully

---

### 🖥️ Web Dashboard Tests

#### Test 7: Jobs Management Screen
**Steps:**
1. Go to Dashboard → Jobs tab
2. Look for "General Work" job

**Expected Result:**
- ✅ "General Work" job appears at top of list
- ✅ Has blue "System Default" badge
- ✅ Shows "Auto-created for job tracking" text
- ✅ Delete button is grayed out/disabled
- ✅ Clicking delete shows warning message

#### Test 8: Company Settings Screen
**Steps:**
1. Go to Dashboard → Settings tab
2. Find "Job Tracking" toggle
3. Toggle it OFF
4. Save settings

**Expected Result:**
- ✅ Toggle switches to OFF
- ✅ No error messages
- ✅ "Require Job Selection" section disappears
- ✅ Default job is automatically set
- ✅ Settings save successfully

#### Test 9: Employee Detail Timesheets
**Steps:**
1. Go to Dashboard → Employees tab
2. Click on any employee
3. Go to Timesheets tab
4. Look for entries with "General Work"

**Expected Result:**
- ✅ Timesheets show job name correctly
- ✅ "General Work" entries display properly
- ✅ No broken job references
- ✅ Export to CSV works

#### Test 10: Reports Tab
**Steps:**
1. Go to Dashboard → Reports tab
2. Generate a timesheet report
3. Look for "General Work" entries

**Expected Result:**
- ✅ "General Work" appears in job filter dropdown
- ✅ Reports include "General Work" timesheets
- ✅ CSV export includes "General Work" entries
- ✅ No broken references or NULL values

---

### 🔒 Security Tests

#### Test 11: User Permission Tests
**Steps:**
1. Login as non-admin user
2. Try to access Jobs management
3. Try to modify company settings

**Expected Result:**
- ✅ Cannot see/modify system default jobs
- ✅ Cannot access company settings (admin only)
- ✅ Can see jobs in timesheet/clock-in contexts
- ✅ RLS policies enforce proper access

#### Test 12: Cross-Company Isolation
**Steps:**
1. Create test data for multiple companies
2. Verify each company has its own default job
3. Try to access other company's data

**Expected Result:**
- ✅ Each company has separate "General Work" job
- ✅ Cannot see other companies' jobs
- ✅ Cannot clock in to other companies' jobs
- ✅ RLS policies enforce company isolation

---

### ⚡ Performance Tests

#### Test 13: Load Testing
**Steps:**
1. Create multiple companies (if possible)
2. Test clock-in performance
3. Test job loading performance

**Expected Result:**
- ✅ Clock-in completes in <100ms
- ✅ Jobs list loads quickly
- ✅ No performance degradation
- ✅ Database queries are efficient

---

## Test Results Checklist

### ✅ Database Tests
- [ ] Migration ran successfully
- [ ] All companies have default jobs
- [ ] RLS policies protect system defaults
- [ ] Clock-in function works without job
- [ ] Cannot delete/archive system defaults
- [ ] Idempotent function behavior

### ✅ Mobile App Tests  
- [ ] Clock-in works with tracking disabled
- [ ] Clock-in works with tracking enabled
- [ ] Clock-in works with optional selection
- [ ] No 403 errors or crashes
- [ ] Proper job selection flows

### ✅ Web Dashboard Tests
- [ ] Jobs screen shows system defaults properly
- [ ] Settings toggle works correctly
- [ ] Employee timesheets display correctly
- [ ] Reports include system defaults
- [ ] CSV exports work properly

### ✅ Security Tests
- [ ] User permissions enforced
- [ ] Company isolation maintained
- [ ] No privilege escalation possible
- [ ] RLS policies working correctly

### ✅ Performance Tests
- [ ] Clock-in performance acceptable
- [ ] No significant slowdown
- [ ] Database queries optimized
- [ ] UI responsive

---

## Troubleshooting Guide

### Issue: Migration Failed
**Symptoms:** Error messages during SQL execution
**Solution:** 
1. Check for syntax errors in SQL
2. Verify schema exists
3. Check for conflicting policies
4. Run rollback script if needed

### Issue: Clock-in Still Fails
**Symptoms:** NULL job_id constraint violation
**Solution:**
1. Verify company has default job: `SELECT default_job_id FROM streamline.companies WHERE id = 'company-id'`
2. Check if default job exists: `SELECT * FROM streamline.jobs WHERE id = 'default-job-id'`
3. Run ensure function manually: `SELECT streamline.ensure_company_has_default_job('company-id')`

### Issue: System Default Not Protected
**Symptoms:** Can delete system default job
**Solution:**
1. Check RLS policies are active: `SELECT * FROM pg_policies WHERE tablename = 'jobs'`
2. Verify user context: `SELECT auth.uid()`
3. Re-run RLS policy creation

### Issue: Performance Problems
**Symptoms:** Slow queries or timeouts
**Solution:**
1. Check indexes: `SELECT * FROM pg_indexes WHERE tablename = 'jobs'`
2. Analyze query plans: `EXPLAIN ANALYZE SELECT ...`
3. Verify statistics are up to date: `ANALYZE streamline.jobs`

---

## Success Criteria

### 🎯 Must Pass (Critical)
- ✅ Users can clock in when job tracking is disabled
- ✅ No NULL job_id constraint violations
- ✅ System default jobs cannot be deleted
- ✅ Company isolation maintained
- ✅ No security vulnerabilities

### 🎯 Should Pass (Important)  
- ✅ UI clearly shows system defaults
- ✅ Performance impact minimal
- ✅ All existing functionality works
- ✅ Mobile app requires no changes
- ✅ Reports include system defaults properly

### 🎯 Nice to Have (Enhancement)
- ✅ Clear user messaging about system defaults
- ✅ Monitoring/alerting for issues
- ✅ Documentation updated
- ✅ Team trained on new system

---

## Post-Test Actions

### If All Tests Pass ✅
1. Deploy to production
2. Monitor for 24 hours
3. Update documentation
4. Train support team
5. Communicate changes to users

### If Tests Fail ❌
1. Document failing tests
2. Analyze root causes
3. Fix issues and re-test
4. Consider rollback if critical
5. Update implementation plan

---

## Monitoring Queries

### Check System Health
```sql
-- Companies without default jobs (should be 0)
SELECT COUNT(*) as companies_without_defaults
FROM streamline.companies c
LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
WHERE c.default_job_id IS NULL OR j.is_system_default IS NOT TRUE;

-- System default jobs per company (should be 1 each)
SELECT 
  company_id,
  COUNT(*) as system_defaults_count
FROM streamline.jobs 
WHERE is_system_default = TRUE 
GROUP BY company_id
HAVING COUNT(*) != 1;

-- Recent clock-ins using system defaults
SELECT 
  COUNT(*) as recent_system_default_clockins
FROM streamline.timesheets t
JOIN streamline.jobs j ON t.job_id = j.id
WHERE j.is_system_default = TRUE
  AND t.created_at > NOW() - INTERVAL '24 hours';
```

### Performance Monitoring
```sql
-- Average clock-in function execution time
SELECT 
  schemaname,
  funcname,
  calls,
  total_time,
  mean_time
FROM pg_stat_user_functions 
WHERE funcname LIKE '%timesheet%';
```

---

**Ready to test!** 🚀

Run through these test cases systematically to ensure the General Work Job System is working correctly before deploying to production.
