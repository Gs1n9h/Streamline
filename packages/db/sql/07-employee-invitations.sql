-- ========= EMPLOYEE INVITATIONS SYSTEM =========
-- System for inviting new employees to join companies

-- 1. Create employee invitations table
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

COMMENT ON TABLE streamline.employee_invitations IS 'Stores pending employee invitations';

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_id ON streamline.employee_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON streamline.employee_invitations (email);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON streamline.employee_invitations (status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON streamline.employee_invitations (token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_expires_at ON streamline.employee_invitations (expires_at);

-- 3. Add unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invitations_unique_pending 
ON streamline.employee_invitations (company_id, email) 
WHERE status = 'pending';

-- 4. Enable RLS
ALTER TABLE streamline.employee_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view invitations for their companies" ON streamline.employee_invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert invitations for their companies" ON streamline.employee_invitations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update invitations for their companies" ON streamline.employee_invitations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invitations for their companies" ON streamline.employee_invitations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id 
      FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Create function to automatically expire old invitations
CREATE OR REPLACE FUNCTION streamline.expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE streamline.employee_invitations 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to accept invitation and create company member
CREATE OR REPLACE FUNCTION streamline.accept_employee_invitation(
  p_token UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM streamline.employee_invitations
  WHERE token = p_token 
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Create company member
  INSERT INTO streamline.company_members (
    user_id,
    company_id,
    role,
    pay_rate,
    pay_period
  ) VALUES (
    p_user_id,
    invitation_record.company_id,
    invitation_record.role,
    invitation_record.pay_rate,
    invitation_record.pay_period
  );
  
  -- Mark invitation as accepted
  UPDATE streamline.employee_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION streamline.expire_old_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION streamline.accept_employee_invitation(UUID, UUID) TO authenticated;

-- 9. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION streamline.update_employee_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_invitations_updated_at
  BEFORE UPDATE ON streamline.employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION streamline.update_employee_invitations_updated_at();
