-- ========= GEOFENCING RLS POLICIES =========

-- Enable RLS on geofences table
ALTER TABLE streamline.geofences ENABLE ROW LEVEL SECURITY;

-- Geofences policies
CREATE POLICY "Users can view geofences for their company" ON streamline.geofences
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create geofences for their company" ON streamline.geofences
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update geofences for their company" ON streamline.geofences
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete geofences for their company" ON streamline.geofences
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on geofence_events table
ALTER TABLE streamline.geofence_events ENABLE ROW LEVEL SECURITY;

-- Geofence events policies
CREATE POLICY "Users can view geofence events for their company" ON streamline.geofence_events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert geofence events" ON streamline.geofence_events
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON streamline.geofences TO authenticated;
GRANT SELECT, INSERT ON streamline.geofence_events TO authenticated;
GRANT USAGE ON SEQUENCE streamline.geofence_events_id_seq TO authenticated;
