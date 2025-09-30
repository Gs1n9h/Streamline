-- Add location tracking settings to companies table
ALTER TABLE streamline.companies 
ADD COLUMN IF NOT EXISTS location_tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS location_ping_interval_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS location_ping_distance_meters INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS geofencing_enabled BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN streamline.companies.location_tracking_enabled IS 'Whether location tracking is enabled for this company';
COMMENT ON COLUMN streamline.companies.location_ping_interval_seconds IS 'Interval between location pings in seconds (default: 30)';
COMMENT ON COLUMN streamline.companies.location_ping_distance_meters IS 'Minimum distance in meters to trigger location ping (default: 50)';
COMMENT ON COLUMN streamline.companies.geofencing_enabled IS 'Whether geofencing is enabled for this company';

-- Create function to get company location settings
CREATE OR REPLACE FUNCTION streamline.get_company_location_settings(p_company_id UUID)
RETURNS TABLE(
  location_tracking_enabled BOOLEAN,
  location_ping_interval_seconds INTEGER,
  location_ping_distance_meters INTEGER,
  geofencing_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.location_tracking_enabled,
    c.location_ping_interval_seconds,
    c.location_ping_distance_meters,
    c.geofencing_enabled
  FROM streamline.companies c
  WHERE c.id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update company location settings
CREATE OR REPLACE FUNCTION streamline.update_company_location_settings(
  p_company_id UUID,
  p_location_tracking_enabled BOOLEAN DEFAULT NULL,
  p_location_ping_interval_seconds INTEGER DEFAULT NULL,
  p_location_ping_distance_meters INTEGER DEFAULT NULL,
  p_geofencing_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE streamline.companies
  SET 
    location_tracking_enabled = COALESCE(p_location_tracking_enabled, location_tracking_enabled),
    location_ping_interval_seconds = COALESCE(p_location_ping_interval_seconds, location_ping_interval_seconds),
    location_ping_distance_meters = COALESCE(p_location_ping_distance_meters, location_ping_distance_meters),
    geofencing_enabled = COALESCE(p_geofencing_enabled, geofencing_enabled),
    updated_at = NOW()
  WHERE id = p_company_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
