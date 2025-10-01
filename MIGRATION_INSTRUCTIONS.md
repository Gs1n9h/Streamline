# 🚀 Employee Invitations Migration Instructions

## Issues Fixed ✅

1. **403 Forbidden Error** - Fixed by removing admin API calls and fetching email from profiles table
2. **Missing Pending Invitations** - Created complete employee_invitations system with filtering

## Required Migration

To enable the employee invitations feature, you need to run the SQL migration in your Supabase dashboard:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration
Copy and paste the contents of `packages/db/sql/07-employee-invitations.sql` into the SQL Editor and run it.

**OR**

Copy and paste this SQL directly:

```sql
-- ========= EMPLOYEE INVITATIONS SYSTEM =========
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_id ON streamline.employee_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON streamline.employee_invitations (email);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON streamline.employee_invitations (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invitations_unique_pending 
ON streamline.employee_invitations (company_id, email) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE streamline.employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
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
```

### Step 3: Verify Migration
After running the migration, you should see:
- ✅ `employee_invitations` table created in the `streamline` schema
- ✅ All indexes and policies applied
- ✅ No errors in the SQL Editor

## New Features Available 🎉

### Employee Invitations
- **Invite New Employees**: Click "Invite Employee" button
- **Pending Invitations**: Show up in employee list with mail icon
- **Automatic Expiration**: Invitations expire after 7 days
- **Duplicate Prevention**: Can't invite same email twice to same company

### Advanced Filtering
- **All Members**: Shows everyone (employees + invitations)
- **Active Employees**: Only confirmed employees
- **Inactive Employees**: Disabled employees (future feature)
- **Pending Invitations**: Only pending invites

### Fixed Issues
- ✅ No more 403 Forbidden errors when viewing employee details
- ✅ Employee emails now load properly from profiles table
- ✅ Pending invitations visible in employee list
- ✅ Proper filtering and status management

## Testing Checklist ✅

1. **Employee List**: 
   - [ ] Filter dropdown works
   - [ ] Employee count updates with filter
   - [ ] Pending invitations show with mail icon

2. **Employee Invitations**:
   - [ ] "Invite Employee" button works
   - [ ] Form validation works
   - [ ] Invitation appears in "Pending" filter
   - [ ] Success message shows

3. **Employee Details**:
   - [ ] Click on employee opens detail view
   - [ ] No 403 errors
   - [ ] Email displays properly
   - [ ] All tabs work correctly

4. **Navigation**:
   - [ ] Back button works from detail view
   - [ ] Filter persists during navigation
   - [ ] Loading states work properly

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify the migration ran successfully in Supabase
3. Ensure you have admin role in your company
4. Check that RLS policies are applied correctly

The system is now ready for full employee management with invitations! 🚀
