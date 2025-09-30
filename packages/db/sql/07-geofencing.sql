-- ========= GEOFENCING SCHEMA =========

-- 1. GEOFENCES TABLE
CREATE TABLE streamline.geofences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  center_latitude       DOUBLE PRECISION NOT NULL,
  center_longitude      DOUBLE PRECISION NOT NULL,
  radius_meters         INTEGER NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID NOT NULL REFERENCES streamline.profiles(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.geofences IS 'Geofence definitions for companies with configurable radius and center point.';

-- 2. GEOFENCE EVENTS TABLE
CREATE TABLE streamline.geofence_events (
  id                    BIGSERIAL PRIMARY KEY,
  geofence_id           UUID NOT NULL REFERENCES streamline.geofences(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES streamline.profiles(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES streamline.companies(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL CHECK (event_type IN ('enter', 'exit')),
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  distance_from_center  DOUBLE PRECISION NOT NULL, -- Distance in meters from geofence center
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE streamline.geofence_events IS 'Tracks when users enter or exit geofenced areas.';

-- Create indexes for better performance
CREATE INDEX idx_geofences_company_id ON streamline.geofences (company_id);
CREATE INDEX idx_geofences_active ON streamline.geofences (is_active);
CREATE INDEX idx_geofence_events_geofence_id ON streamline.geofence_events (geofence_id);
CREATE INDEX idx_geofence_events_user_id ON streamline.geofence_events (user_id);
CREATE INDEX idx_geofence_events_company_id ON streamline.geofence_events (company_id);
CREATE INDEX idx_geofence_events_created_at ON streamline.geofence_events (created_at DESC);
CREATE INDEX idx_geofence_events_type ON streamline.geofence_events (event_type);

-- ========= GEOFENCING FUNCTIONS =========

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION streamline.calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  earth_radius DOUBLE PRECISION := 6371000; -- Earth radius in meters
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a point is inside a geofence
CREATE OR REPLACE FUNCTION streamline.is_point_in_geofence(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_geofence_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  geofence_record RECORD;
  distance DOUBLE PRECISION;
BEGIN
  SELECT center_latitude, center_longitude, radius_meters, is_active
  INTO geofence_record
  FROM streamline.geofences
  WHERE id = p_geofence_id;
  
  IF NOT FOUND OR NOT geofence_record.is_active THEN
    RETURN FALSE;
  END IF;
  
  distance := streamline.calculate_distance(
    p_latitude,
    p_longitude,
    geofence_record.center_latitude,
    geofence_record.center_longitude
  );
  
  RETURN distance <= geofence_record.radius_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all geofences for a company
CREATE OR REPLACE FUNCTION streamline.get_company_geofences(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  center_latitude DOUBLE PRECISION,
  center_longitude DOUBLE PRECISION,
  radius_meters INTEGER,
  is_active BOOLEAN,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT 
    g.id,
    g.name,
    g.description,
    g.center_latitude,
    g.center_longitude,
    g.radius_meters,
    g.is_active,
    p.full_name as created_by_name,
    g.created_at
  FROM streamline.geofences g
  JOIN streamline.profiles p ON g.created_by = p.id
  WHERE g.company_id = p_company_id
  ORDER BY g.created_at DESC;
$$ LANGUAGE sql STABLE;

-- Function to get geofence events for a company with filtering
CREATE OR REPLACE FUNCTION streamline.get_geofence_events(
  p_company_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_geofence_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  geofence_name TEXT,
  user_name TEXT,
  event_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_from_center DOUBLE PRECISION,
  created_at TIMESTAMPTZ
) AS $$
  SELECT 
    ge.id,
    g.name as geofence_name,
    p.full_name as user_name,
    ge.event_type,
    ge.latitude,
    ge.longitude,
    ge.distance_from_center,
    ge.created_at
  FROM streamline.geofence_events ge
  JOIN streamline.geofences g ON ge.geofence_id = g.id
  JOIN streamline.profiles p ON ge.user_id = p.id
  WHERE ge.company_id = p_company_id
    AND (p_user_id IS NULL OR ge.user_id = p_user_id)
    AND (p_geofence_id IS NULL OR ge.geofence_id = p_geofence_id)
    AND (p_start_date IS NULL OR ge.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ge.created_at <= p_end_date)
  ORDER BY ge.created_at DESC;
$$ LANGUAGE sql STABLE;

-- Function to create a geofence
CREATE OR REPLACE FUNCTION streamline.create_geofence(
  p_company_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_center_latitude DOUBLE PRECISION,
  p_center_longitude DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 100
)
RETURNS UUID AS $$
DECLARE
  geofence_id UUID;
BEGIN
  INSERT INTO streamline.geofences (
    company_id,
    name,
    description,
    center_latitude,
    center_longitude,
    radius_meters,
    created_by
  ) VALUES (
    p_company_id,
    p_name,
    p_description,
    p_center_latitude,
    p_center_longitude,
    p_radius_meters,
    auth.uid()
  ) RETURNING id INTO geofence_id;
  
  RETURN geofence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a geofence
CREATE OR REPLACE FUNCTION streamline.update_geofence(
  p_geofence_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_center_latitude DOUBLE PRECISION DEFAULT NULL,
  p_center_longitude DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE streamline.geofences
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    center_latitude = COALESCE(p_center_latitude, center_latitude),
    center_longitude = COALESCE(p_center_longitude, center_longitude),
    radius_meters = COALESCE(p_radius_meters, radius_meters),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_geofence_id
    AND company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a geofence
CREATE OR REPLACE FUNCTION streamline.delete_geofence(p_geofence_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM streamline.geofences
  WHERE id = p_geofence_id
    AND company_id IN (
      SELECT company_id FROM streamline.company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
