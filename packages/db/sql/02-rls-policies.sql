-- ========= ROW LEVEL SECURITY (RLS) POLICIES =========

-- Enable RLS on all tables
ALTER TABLE streamline.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamline.location_pings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to see and manage their own profile
CREATE POLICY "Allow users to manage their own profile" ON streamline.profiles
  FOR ALL USING (auth.uid() = id);

-- Policy: Allow members to see companies they belong to
CREATE POLICY "Allow members to see their own companies" ON streamline.companies
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = id AND company_members.user_id = auth.uid()
  ));

-- Policy: Allow admins to create companies (for company creation flow)
CREATE POLICY "Allow authenticated users to create companies" ON streamline.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Allow admins to update their company settings
CREATE POLICY "Allow admins to update their company" ON streamline.companies
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = companies.id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- Policy: Allow members to see their own membership details
CREATE POLICY "Allow users to see their own memberships" ON streamline.company_members
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow admins to manage memberships in their company
CREATE POLICY "Allow admins to manage company memberships" ON streamline.company_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = company_members.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- Policy: Allow users to see jobs in their companies
CREATE POLICY "Allow members to see company jobs" ON streamline.jobs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members
    WHERE company_members.company_id = jobs.company_id AND company_members.user_id = auth.uid()
  ));

-- Policy: Allow admins to manage jobs in their company
CREATE POLICY "Allow admins to manage company jobs" ON streamline.jobs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = jobs.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- Policy: Allow staff to manage their own timesheets
CREATE POLICY "Allow staff to manage their own timesheets" ON streamline.timesheets
  FOR ALL USING (auth.uid() = staff_id);

-- Policy: Allow admins to see all company timesheets
CREATE POLICY "Allow admins to see all company timesheets" ON streamline.timesheets
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    WHERE cm.company_id = timesheets.company_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- Policy: Allow users to manage their own location pings
CREATE POLICY "Allow users to manage their own location pings" ON streamline.location_pings
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Allow admins to see company location pings
CREATE POLICY "Allow admins to see company location pings" ON streamline.location_pings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM streamline.company_members cm
    JOIN streamline.timesheets t ON cm.company_id = t.company_id
    WHERE t.id = location_pings.timesheet_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

