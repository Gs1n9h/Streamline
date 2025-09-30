import { supabase } from '../lib/supabase';

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface GeofenceEvent {
  geofence_id: string;
  event_type: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  distance_from_center: number;
}

class GeofencingService {
  private geofences: Geofence[] = [];
  private userGeofenceStates: Map<string, boolean> = new Map(); // Track if user is inside each geofence
  private companyId: string | null = null;

  // Initialize the service with company ID
  async initialize(companyId: string) {
    this.companyId = companyId;
    await this.loadGeofences();
  }

  // Load all active geofences for the company
  private async loadGeofences() {
    if (!this.companyId) return;

    try {
      console.log('🎯 Loading geofences for company:', this.companyId);
      
      const { data, error } = await supabase.rpc('get_company_geofences', {
        p_company_id: this.companyId
      });

      if (error) throw error;

      this.geofences = (data || []).filter((g: Geofence) => g.is_active);
      console.log('🎯 Loaded geofences:', this.geofences.length);
    } catch (error) {
      console.error('❌ Error loading geofences:', error);
    }
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Check if a point is inside a geofence
  private isPointInGeofence(
    latitude: number,
    longitude: number,
    geofence: Geofence
  ): boolean {
    const distance = this.calculateDistance(
      latitude,
      longitude,
      geofence.center_latitude,
      geofence.center_longitude
    );
    
    return distance <= geofence.radius_meters;
  }

  // Check geofences for a given location and trigger events
  async checkGeofences(latitude: number, longitude: number): Promise<GeofenceEvent[]> {
    if (!this.companyId || this.geofences.length === 0) {
      return [];
    }

    const events: GeofenceEvent[] = [];

    for (const geofence of this.geofences) {
      const isCurrentlyInside = this.isPointInGeofence(latitude, longitude, geofence);
      const wasPreviouslyInside = this.userGeofenceStates.get(geofence.id) || false;

      // Check for enter event
      if (isCurrentlyInside && !wasPreviouslyInside) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          geofence.center_latitude,
          geofence.center_longitude
        );

        events.push({
          geofence_id: geofence.id,
          event_type: 'enter',
          latitude,
          longitude,
          distance_from_center: distance
        });

        console.log(`🎯 Entered geofence: ${geofence.name} (${distance.toFixed(0)}m from center)`);
      }

      // Check for exit event
      if (!isCurrentlyInside && wasPreviouslyInside) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          geofence.center_latitude,
          geofence.center_longitude
        );

        events.push({
          geofence_id: geofence.id,
          event_type: 'exit',
          latitude,
          longitude,
          distance_from_center: distance
        });

        console.log(`🎯 Exited geofence: ${geofence.name} (${distance.toFixed(0)}m from center)`);
      }

      // Update the state
      this.userGeofenceStates.set(geofence.id, isCurrentlyInside);
    }

    return events;
  }

  // Record geofence events in the database
  async recordGeofenceEvents(events: GeofenceEvent[]) {
    if (!this.companyId || events.length === 0) return;

    try {
      for (const event of events) {
        const { error } = await supabase
          .from('geofence_events')
          .insert({
            geofence_id: event.geofence_id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            company_id: this.companyId,
            event_type: event.event_type,
            latitude: event.latitude,
            longitude: event.longitude,
            distance_from_center: event.distance_from_center
          });

        if (error) throw error;
      }

      console.log('✅ Recorded geofence events:', events.length);
    } catch (error) {
      console.error('❌ Error recording geofence events:', error);
    }
  }

  // Get geofence name by ID
  getGeofenceName(geofenceId: string): string {
    const geofence = this.geofences.find(g => g.id === geofenceId);
    return geofence ? geofence.name : 'Unknown Geofence';
  }

  // Refresh geofences (call this periodically or when settings change)
  async refreshGeofences() {
    await this.loadGeofences();
  }

  // Get current geofence states
  getCurrentStates(): Map<string, boolean> {
    return new Map(this.userGeofenceStates);
  }

  // Check if user is currently inside any geofence
  isInsideAnyGeofence(): boolean {
    return Array.from(this.userGeofenceStates.values()).some(isInside => isInside);
  }

  // Get list of geofences user is currently inside
  getCurrentGeofences(): Geofence[] {
    const insideGeofences: Geofence[] = [];
    
    for (const [geofenceId, isInside] of this.userGeofenceStates.entries()) {
      if (isInside) {
        const geofence = this.geofences.find(g => g.id === geofenceId);
        if (geofence) {
          insideGeofences.push(geofence);
        }
      }
    }
    
    return insideGeofences;
  }
}

// Export singleton instance
export const geofencingService = new GeofencingService();
