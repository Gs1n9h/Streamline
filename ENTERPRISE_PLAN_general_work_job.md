# 🏢 ENTERPRISE PLAN: General Work Job Implementation

## Executive Summary

Implement a system-wide "General Work" job for each company that serves as a fallback when job tracking is disabled. This maintains database integrity while supporting optional job tracking.

---

## 🎯 Solution Architecture

### Core Concept
```
┌─────────────────────────────────────────────────────────────┐
│  Every Company Has:                                         │
│  ├─ One "General Work" job (auto-created)                  │
│  ├─ Marked as system-managed (is_system_default = TRUE)    │
│  ├─ Cannot be deleted by users                             │
│  ├─ Used when job_tracking_enabled = FALSE                 │
│  └─ Referenced as companies.default_job_id                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Changes

### 1. **Extend Jobs Table**

**New Columns**:
```sql
ALTER TABLE streamline.jobs ADD COLUMN IF NOT EXISTS 
  is_system_default BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN streamline.jobs.is_system_default IS 
  'System-managed default job that cannot be deleted by users';
```

**Purpose**:
- Distinguish between user-created jobs and system defaults
- Prevent accidental deletion
- Enable special UI treatment

**Indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_system_default 
ON streamline.jobs (company_id, is_system_default) 
WHERE is_system_default = TRUE;
```

---

### 2. **Update Companies Table**

**Verify Existing Columns**:
- ✅ `job_tracking_enabled BOOLEAN DEFAULT TRUE`
- ✅ `job_selection_required BOOLEAN DEFAULT TRUE`
- ✅ `default_job_id UUID REFERENCES streamline.jobs(id)`

**Add Constraint**:
```sql
-- Ensure default_job_id always points to a valid, non-archived job
ALTER TABLE streamline.companies 
ADD CONSTRAINT fk_default_job_active 
  FOREIGN KEY (default_job_id) 
  REFERENCES streamline.jobs(id)
  DEFERRABLE INITIALLY DEFERRED;
```

**Why Deferrable**: Allows creating job and company in same transaction.

---

## 🔒 RLS Policy Updates

### Current RLS Policies on Jobs Table

**Review Existing**:
```sql
-- Users can view jobs for their companies
CREATE POLICY "Users can view jobs for their companies" ON streamline.jobs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Admins can manage jobs
CREATE POLICY "Admins can manage jobs for their companies" ON streamline.jobs
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### **New RLS Policy for System Default Jobs**

**Prevent Deletion of System Defaults**:
```sql
-- Override: Admins CANNOT delete system default jobs
CREATE POLICY "System default jobs cannot be deleted" ON streamline.jobs
  FOR DELETE USING (
    is_system_default = FALSE  -- Only allow deleting non-system jobs
  );

-- Override: Admins CANNOT archive system default jobs
CREATE POLICY "System default jobs cannot be archived" ON streamline.jobs
  FOR UPDATE USING (
    CASE 
      WHEN is_system_default = TRUE THEN 
        -- Allow updates but prevent archiving
        (NEW.is_archived = OLD.is_archived AND OLD.is_archived = FALSE)
      ELSE 
        TRUE
    END
  );
```

**Rationale**:
- System defaults are critical infrastructure
- Prevent accidental/malicious deletion
- Maintain data integrity
- Still allow updating name/address if needed

### **Additional Security Policies**

**Prevent Creating Multiple System Defaults**:
```sql
-- Ensure only one system default per company
CREATE UNIQUE INDEX idx_one_system_default_per_company 
ON streamline.jobs (company_id) 
WHERE is_system_default = TRUE;
```

**Check Constraint**:
```sql
-- System defaults cannot be archived
ALTER TABLE streamline.jobs 
ADD CONSTRAINT chk_system_default_not_archived 
  CHECK (
    NOT (is_system_default = TRUE AND is_archived = TRUE)
  );
```

---

## 🔧 Function Updates

### 1. **Create Function: ensure_company_has_default_job**

**Purpose**: Idempotent function to ensure company has a default job

```sql
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
  
  -- If exists, return it
  IF v_default_job_id IS NOT NULL THEN
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

GRANT EXECUTE ON FUNCTION streamline.ensure_company_has_default_job(UUID) TO authenticated;
```

**Security Notes**:
- SECURITY DEFINER: Runs with function creator's privileges
- Prevents privilege escalation
- Users can't create jobs in other companies
- Function validates company_id implicitly through FK constraints

---

### 2. **Update Function: create_timesheet_with_optional_job**

**Enhanced Logic**:
```sql
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
    c.job_selection_required,
    c.job_tracking_enabled
  INTO 
    job_selection_required,
    job_tracking_enabled
  FROM streamline.companies c
  WHERE c.id = p_company_id;
  
  -- Determine the job ID to use
  IF job_tracking_enabled = FALSE THEN
    -- Job tracking disabled: ALWAYS use default job
    -- Ensure default job exists
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
    RAISE EXCEPTION 'Invalid job ID for this company';
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
```

**Key Improvements**:
1. **Explicit job_tracking_enabled check**: Clearer logic flow
2. **Always ensures default job exists**: Calls `ensure_company_has_default_job()`
3. **Idempotent**: Safe to call multiple times
4. **Proper error messages**: Clear exceptions for debugging

---

### 3. **Create Trigger: auto_create_default_job_on_company_insert**

**Purpose**: Automatically create default job when company is created

```sql
CREATE OR REPLACE FUNCTION streamline.trigger_create_default_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default job for new company
  PERFORM streamline.ensure_company_has_default_job(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to companies table
CREATE TRIGGER trigger_auto_create_default_job
  AFTER INSERT ON streamline.companies
  FOR EACH ROW
  EXECUTE FUNCTION streamline.trigger_create_default_job();
```

**Benefits**:
- Automatic onboarding
- Zero manual intervention
- Consistent across all companies
- Works for both new signups and admin-created companies

---

## 🔄 Data Migration Strategy

### For Existing Companies Without Default Job

**Migration SQL**:
```sql
-- Step 1: Add the new column
ALTER TABLE streamline.jobs 
ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT FALSE;

-- Step 2: Create default job for ALL existing companies
DO $$
DECLARE
  company_record RECORD;
  new_job_id UUID;
BEGIN
  FOR company_record IN 
    SELECT id, name FROM streamline.companies 
  LOOP
    -- Create default job if it doesn't exist
    SELECT streamline.ensure_company_has_default_job(company_record.id) 
    INTO new_job_id;
    
    RAISE NOTICE 'Created default job % for company %', 
                 new_job_id, company_record.name;
  END LOOP;
END $$;

-- Step 3: Verify all companies have default jobs
SELECT 
  c.id,
  c.name,
  c.default_job_id,
  j.name as default_job_name,
  j.is_system_default
FROM streamline.companies c
LEFT JOIN streamline.jobs j ON c.default_job_id = j.id
WHERE c.default_job_id IS NULL OR j.is_system_default IS NOT TRUE;

-- Should return 0 rows
```

**Rollback Plan**:
```sql
-- If migration fails, can rollback:
BEGIN;
  -- Remove system default jobs
  DELETE FROM streamline.jobs WHERE is_system_default = TRUE;
  
  -- Clear default_job_id references
  UPDATE streamline.companies SET default_job_id = NULL;
  
  -- Drop column
  ALTER TABLE streamline.jobs DROP COLUMN IF EXISTS is_system_default;
ROLLBACK; -- or COMMIT if intentional
```

---

## 🛡️ Security Considerations

### 1. **Privilege Escalation Prevention**

**Risk**: User creates fake system default job
**Mitigation**:
```sql
-- Users cannot set is_system_default = TRUE
CREATE POLICY "Users cannot create system default jobs" ON streamline.jobs
  FOR INSERT WITH CHECK (
    is_system_default = FALSE OR is_system_default IS NULL
  );

-- Only functions with SECURITY DEFINER can create system defaults
```

### 2. **Company Isolation**

**Risk**: User accesses another company's default job
**Mitigation**:
- RLS policies enforce company_id matching
- All queries filter by company_id
- Job assignments validate company membership

### 3. **Data Integrity**

**Risk**: Default job gets deleted/corrupted
**Mitigation**:
```sql
-- Prevent deletion
CREATE POLICY prevents deletion (see RLS section above)

-- Prevent archiving
CHECK constraint (see schema section above)

-- Foreign key with proper cascade
ALTER TABLE streamline.companies 
  ADD CONSTRAINT fk_default_job 
  FOREIGN KEY (default_job_id) 
  REFERENCES streamline.jobs(id)
  ON DELETE RESTRICT;  -- Prevent deleting if referenced
```

### 4. **Audit Trail**

**Enhancement**: Track who/when default job was created
```sql
ALTER TABLE streamline.jobs 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES streamline.profiles(id),
ADD COLUMN IF NOT EXISTS system_created BOOLEAN DEFAULT FALSE;

-- Update trigger to set these fields
```

---

## 📱 Impact on Mobile App

### Current Behavior ✅
```typescript
// apps/mobile/screens/DashboardScreen.tsx (Lines 380-386)
const { data: timesheetId, error } = await supabase.rpc(
  'create_timesheet_with_optional_job',
  {
    p_staff_id: user?.id,
    p_company_id: membership.company_id,
    p_job_id: jobId || null,  // Can still be NULL
    p_latitude: location.latitude,
    p_longitude: location.longitude
  }
);
```

**Changes Required**: ✅ **NONE**

**Why It Works**:
- Function handles NULL job_id internally
- Automatically uses default job
- Mobile app doesn't need to know about system defaults
- Backwards compatible

---

## 🖥️ Impact on Web Dashboard

### 1. **Jobs Management Screen**

**Changes Required**:
```typescript
// Display system default differently
{jobs.map(job => (
  <div key={job.id} className={job.is_system_default ? 'system-job' : ''}>
    <span>{job.name}</span>
    {job.is_system_default && (
      <Badge>System Default</Badge>
    )}
    {/* Hide delete button for system defaults */}
    {!job.is_system_default && (
      <button onClick={() => deleteJob(job.id)}>Delete</button>
    )}
  </div>
))}
```

### 2. **Company Settings Screen**

**Changes Required**:
```typescript
// Ensure default_job_id is set when disabling job tracking
const handleJobTrackingToggle = async (enabled: boolean) => {
  if (!enabled) {
    // Ensure default job exists before disabling
    const { data: defaultJobId } = await supabase.rpc(
      'ensure_company_has_default_job',
      { p_company_id: companyId }
    );
    
    // Update company settings
    await supabase
      .from('companies')
      .update({ 
        job_tracking_enabled: false,
        default_job_id: defaultJobId 
      })
      .eq('id', companyId);
  }
};
```

### 3. **Reports & Timesheets Display**

**Changes Required**:
```typescript
// Option to hide "General Work" from reports
const filteredTimesheets = timesheets.filter(ts => {
  if (hideSystemDefaults && ts.job?.is_system_default) {
    return false;
  }
  return true;
});

// Or show as "No Specific Job" in UI
const displayJobName = (job: Job) => {
  if (job.is_system_default) {
    return 'General Work';
  }
  return job.name;
};
```

---

## 🧪 Testing Strategy

### 1. **Unit Tests**

**Database Functions**:
```sql
-- Test: Create default job for new company
-- Test: Idempotency (calling twice returns same job)
-- Test: Cannot delete system default job
-- Test: Cannot archive system default job
-- Test: Only one system default per company
-- Test: Clock in without job uses default
-- Test: Clock in with job uses specified job
```

### 2. **Integration Tests**

**Scenarios**:
```
✅ New company signup → Default job auto-created
✅ Admin disables job tracking → Uses default job for clock-in
✅ Admin tries to delete system default → Error/prevented
✅ User clocks in without job → Uses default (no error)
✅ User clocks in with job → Uses specified job
✅ Migration on existing company → Default job created
✅ Mobile app clock in (tracking disabled) → Success
✅ Mobile app clock in (tracking enabled, no job) → Success
✅ Web dashboard shows system default with badge
✅ Reports handle system default jobs correctly
```

### 3. **Security Tests**

**Attack Scenarios**:
```
❌ User tries to set is_system_default=true → Blocked by RLS
❌ User tries to delete system default → Blocked by policy
❌ User tries to access another company's default → Blocked by RLS
❌ User tries to archive system default → Blocked by constraint
✅ Admin can update system default name/address → Allowed
✅ Function creates default job → Succeeds (SECURITY DEFINER)
```

### 4. **Performance Tests**

**Load Testing**:
```
- 1000 companies → Default job creation time
- 10,000 clock-ins/hour → Using default jobs
- Query performance with is_system_default filter
- Index effectiveness on system default lookups
```

---

## 📋 Migration Checklist

### Phase 1: Database Changes
- [ ] Add `is_system_default` column to jobs table
- [ ] Create indexes for system default jobs
- [ ] Add check constraints
- [ ] Create `ensure_company_has_default_job()` function
- [ ] Update `create_timesheet_with_optional_job()` function
- [ ] Create trigger for new companies
- [ ] Update RLS policies
- [ ] Run migration on existing companies
- [ ] Verify all companies have default jobs

### Phase 2: Backend Validation
- [ ] Test all database functions
- [ ] Verify RLS policies work correctly
- [ ] Test clock-in with/without jobs
- [ ] Test company onboarding
- [ ] Load test with default jobs
- [ ] Security audit

### Phase 3: Frontend Updates (Web)
- [ ] Update Jobs management screen
- [ ] Add system default badge/indicator
- [ ] Hide delete button for system defaults
- [ ] Update Company Settings screen
- [ ] Handle job tracking toggle
- [ ] Update Reports to display defaults appropriately
- [ ] Update Timesheet displays

### Phase 4: Mobile App Validation
- [ ] Test clock-in without job
- [ ] Test clock-in with job
- [ ] Test with job tracking enabled
- [ ] Test with job tracking disabled
- [ ] Verify backward compatibility

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Update admin documentation
- [ ] Create user guide for system defaults
- [ ] Document RLS policy changes
- [ ] Update schema documentation

### Phase 6: Deployment
- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Deploy to production (with rollback plan)
- [ ] Monitor for 24 hours
- [ ] Gather user feedback

---

## 🚨 Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Migration fails for existing companies** | High | Low | Rollback script ready, test on staging first |
| **RLS policy blocks legitimate access** | High | Low | Comprehensive testing, gradual rollout |
| **Performance degradation** | Medium | Low | Indexes in place, load testing |
| **User confusion about system default** | Low | Medium | Clear UI indicators, documentation |
| **Orphaned timesheets if job deleted** | High | Very Low | FK constraint prevents deletion |
| **Multiple system defaults created** | Medium | Low | Unique index prevents this |

---

## 💰 Cost/Benefit Analysis

### Benefits
✅ **Immediate**: Unblocks users from clocking in
✅ **Security**: Proper RLS policies maintain data isolation
✅ **UX**: Seamless experience for users
✅ **Scalability**: Works for 1 company or 10,000 companies
✅ **Maintainability**: Clear system vs user jobs distinction
✅ **Backward Compatible**: No breaking changes to mobile app

### Costs
⚠️ **Development**: ~3-5 days for implementation + testing
⚠️ **Migration**: Need to migrate existing companies
⚠️ **Storage**: One extra job per company (~100 bytes each)
⚠️ **Complexity**: Additional logic in job management
⚠️ **UI Updates**: Frontend needs to handle system defaults

### ROI
**High** - Solves critical blocker with enterprise-grade solution that scales.

---

## 🎯 Success Criteria

1. ✅ **100% of companies** have a system default job
2. ✅ **Mobile users can clock in** when job tracking is disabled
3. ✅ **No security vulnerabilities** in RLS policies
4. ✅ **Zero data loss** during migration
5. ✅ **Performance maintained** (<100ms for clock-in operations)
6. ✅ **UI clearly indicates** system vs user jobs
7. ✅ **Full audit trail** of all changes
8. ✅ **Documentation complete** for admins and developers

---

## 📖 Consequences & Trade-offs

### ✅ Positive Consequences

1. **Data Integrity Maintained**
   - No NULL job_id values
   - All timesheets have valid job references
   - Referential integrity preserved

2. **Backward Compatibility**
   - Existing queries continue to work
   - Mobile app requires no changes
   - Reports still function correctly

3. **User Experience**
   - Users can clock in seamlessly
   - No complex job selection when not needed
   - Clear system vs user job distinction

4. **Security**
   - RLS policies remain effective
   - Company isolation maintained
   - Audit trail preserved

5. **Scalability**
   - Works for any number of companies
   - Performance impact minimal (one job per company)
   - Easy to understand and maintain

### ⚠️ Trade-offs

1. **"Phantom" Data**
   - **Issue**: Every company has a job that may never be used
   - **Impact**: If company enables job tracking, "General Work" still exists
   - **Mitigation**: Clear UI indication that it's a system default
   - **Severity**: Low - minimal storage cost (~100 bytes)

2. **Job List "Pollution"**
   - **Issue**: Users see "General Work" in job lists even if not using it
   - **Impact**: Slight UI clutter
   - **Mitigation**: 
     - Show badge/indicator
     - Option to hide in reports/filters
     - Always sort to bottom of lists
   - **Severity**: Low - UX design solves this

3. **Cannot Disable Job Tracking Completely**
   - **Issue**: There's ALWAYS at least one job (the default)
   - **Impact**: "Disable job tracking" really means "use default job only"
   - **Mitigation**: Clear documentation and UI messaging
   - **Severity**: Low - meets business requirement

4. **Migration Complexity**
   - **Issue**: Need to create jobs for all existing companies
   - **Impact**: One-time migration effort
   - **Mitigation**: Idempotent function, can run multiple times safely
   - **Severity**: Low - one-time cost

5. **Deletion Restrictions**
   - **Issue**: Admins cannot delete system default job
   - **Impact**: Might confuse users expecting full control
   - **Mitigation**: Clear error messages, UI hides delete button
   - **Severity**: Low - protects system integrity

6. **Reports May Show Default Job**
   - **Issue**: Reports include "General Work" timesheets
   - **Impact**: May not be meaningful if job tracking disabled
   - **Mitigation**: 
     - Filter option to exclude system defaults
     - Group "General Work" separately in reports
     - Show as "No Specific Job" in some contexts
   - **Severity**: Low - UX design decision

### 🔄 Alternative Considered & Rejected

**Making job_id NULLABLE**:
- ❌ Breaks existing queries that assume job_id exists
- ❌ Requires changing INNER JOIN to LEFT JOIN everywhere
- ❌ Reports need to handle NULL job_id
- ❌ More complex query logic throughout codebase
- ✅ Would be "cleaner" from schema perspective

**Why General Work Approach is Better**:
- ✅ No breaking changes to existing queries
- ✅ All timesheets have valid job references
- ✅ Simpler report logic
- ✅ Better for data warehousing/analytics
- ✅ Easier to understand and maintain

---

## 🔮 Future Considerations

### Potential Enhancements

1. **Multiple System Defaults**
   - Allow companies to have multiple system-managed jobs
   - Example: "General Work", "Administrative", "Training"
   - Requires updating unique constraint

2. **Job Categories**
   - Categorize jobs (billable vs non-billable, project types)
   - System defaults could be "Non-Billable" category
   - Better reporting and analytics

3. **Auto-Archive Old Jobs**
   - Archive jobs with no recent timesheets
   - Exclude system defaults from auto-archiving
   - Cleanup old, unused jobs

4. **Smart Default Selection**
   - If user typically works at one location, auto-select it
   - Machine learning to predict likely job
   - System default as fallback

5. **Job Templates**
   - Industry-specific job templates
   - Pre-configured system defaults for different business types
   - Onboarding wizard

---

## 📝 Summary

This plan provides an **enterprise-grade solution** that:

✅ **Solves the immediate problem**: Users can clock in when job tracking is disabled
✅ **Maintains security**: RLS policies properly enforced
✅ **Scales infinitely**: Works for 1 or 10,000+ companies
✅ **Preserves data integrity**: No NULL values, all FKs valid
✅ **Minimizes changes**: Mobile app requires zero changes
✅ **Clear consequences**: Understood trade-offs with mitigation strategies
✅ **Production-ready**: Comprehensive testing and rollback plans

The "General Work" approach is **superior to making job_id nullable** for this use case because it maintains backward compatibility while solving the business requirement elegantly.

**Estimated Timeline**: 3-5 days for full implementation and testing
**Risk Level**: Low (with proper testing and migration strategy)
**Recommended Approach**: ⭐⭐⭐⭐⭐ Enterprise Ready
