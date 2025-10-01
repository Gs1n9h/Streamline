import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';
import { geofencingService } from './GeofencingService';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

interface LocationSettings {
  location_tracking_enabled: boolean;
  location_ping_interval_seconds: number;
  location_ping_distance_meters: number;
  geofencing_enabled: boolean;
}

// Define the background task at module level (CRITICAL for proper registration)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  console.log('🎯 Background task triggered:', { data, error });
  
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  if (data && data.locations && data.locations.length > 0) {
    const location = data.locations[0];
    console.log('🎯 BACKGROUND location update received:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp
    });

    // Process the location update through the service
    try {
      await backgroundLocationService.handleLocationUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy
      });
      console.log('✅ Background location update processed successfully');
    } catch (error) {
      console.error('❌ Error processing background location update:', error);
    }
  } else {
    console.log('⚠️ No location data in background task');
  }
});

class BackgroundLocationService {
  private isTracking = false;
  private currentUser: any = null;
  private companyId: string | null = null;
  private locationSettings: LocationSettings | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;

  // Initialize the background location service
  async initialize() {
    try {
      // Test schema access first
      console.log('🔧 Testing schema access...');
      const { data: testData, error: testError } = await supabase
        .from('location_pings')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Schema test failed:', testError);
      } else {
        console.log('✅ Schema access confirmed, streamline.location_pings accessible');
      }

      // Get current user and company
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUser = user;
        await this.getCompanyId();
      }

      console.log('🎯 Background location service initialized');
    } catch (error) {
      console.error('❌ Error initializing background location service:', error);
    }
  }

  // Public method to handle location updates from the background task
  async handleLocationUpdate(locationData: LocationData) {
    await this.processLocationUpdate(locationData);
  }

  private async getCompanyId() {
    try {
      if (!this.currentUser) return;

      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', this.currentUser.id)
        .single();

      if (membership) {
        this.companyId = membership.company_id;
        // Load company location settings
        await this.loadLocationSettings();
        // Initialize geofencing service with company ID
        await geofencingService.initialize(membership.company_id);
      }
    } catch (error) {
      console.error('❌ Error getting company ID:', error);
    }
  }

  // Load company location settings
  private async loadLocationSettings() {
    try {
      if (!this.companyId) return;

      const { data, error } = await supabase.rpc('get_company_location_settings', {
        p_company_id: this.companyId
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const newSettings = data[0];
        const settingsChanged = !this.locationSettings || 
          this.locationSettings.location_tracking_enabled !== newSettings.location_tracking_enabled ||
          this.locationSettings.location_ping_interval_seconds !== newSettings.location_ping_interval_seconds ||
          this.locationSettings.location_ping_distance_meters !== newSettings.location_ping_distance_meters ||
          this.locationSettings.geofencing_enabled !== newSettings.geofencing_enabled;

        this.locationSettings = newSettings;
        console.log('🎯 Location settings loaded:', this.locationSettings);

        // If settings changed and tracking is active, restart tracking with new settings
        if (settingsChanged && this.isTracking) {
          console.log('🎯 Location settings changed, restarting tracking with new settings');
          await this.stopTracking();
          await this.startTracking();
        }
      }
    } catch (error) {
      console.error('❌ Error loading location settings:', error);
      // Use default settings
      this.locationSettings = {
        location_tracking_enabled: true,
        location_ping_interval_seconds: 30,
        location_ping_distance_meters: 50,
        geofencing_enabled: true
      };
    }
  }

  // Public method to refresh location settings
  async refreshLocationSettings() {
    console.log('🎯 Refreshing location settings...');
    await this.loadLocationSettings();
  }

  // Start location tracking (tries background first, falls back to foreground)
  async startTracking() {
    try {
      if (this.isTracking) {
        console.log('🎯 Location tracking already active');
        return;
      }

      if (!this.locationSettings?.location_tracking_enabled) {
        console.log('🎯 Location tracking disabled for company');
        return;
      }

      console.log('🎯 Starting location tracking...');

      // First try background location tracking
      const backgroundSuccess = await this.tryBackgroundTracking();
      
      if (!backgroundSuccess) {
        console.log('⚠️ Background tracking failed, falling back to foreground tracking');
        await this.startForegroundTracking();
      }
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      // Always fall back to foreground tracking
      await this.startForegroundTracking();
    }
  }

  // Try to start background location tracking
  private async tryBackgroundTracking(): Promise<boolean> {
    try {
      // Check if background location is supported
      const isSupported = await this.isBackgroundLocationSupported();
      if (!isSupported) {
        console.log('⚠️ Background location not supported on this device');
        return false;
      }

      // Request background permission
      console.log('🎯 Requesting background location permission...');
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('⚠️ Background location permission denied');
        return false;
      }

      console.log('✅ Background location permission granted');

      // Start background location updates
      const intervalSeconds = this.locationSettings?.location_ping_interval_seconds || 30;
      console.log(`🎯 Starting BACKGROUND location tracking (${intervalSeconds}s intervals)`);

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalSeconds * 1000,
        distanceInterval: this.locationSettings?.location_ping_distance_meters || 50,
        foregroundService: {
          notificationTitle: 'Streamline Location Tracking',
          notificationBody: 'Tracking your location for work hours',
          notificationColor: '#007AFF',
        },
        pausesUpdatesAutomatically: false,
      });

      this.isTracking = true;
      console.log('✅ BACKGROUND location tracking started successfully');
      return true;
    } catch (error) {
      console.error('❌ Error starting background location tracking:', error);
      return false;
    }
  }

  // Fallback method for foreground-only tracking
  private async startForegroundTracking() {
    try {
      const intervalSeconds = this.locationSettings?.location_ping_interval_seconds || 30;
      console.log(`🎯 Starting FOREGROUND-ONLY location tracking (${intervalSeconds}s intervals)`);
      
      // Clear any existing interval
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }
      
      this.trackingInterval = setInterval(async () => {
        try {
          console.log('📍 Getting current location for ping...');
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          console.log('📍 Location obtained:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy
          });

          await this.processLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
          });
        } catch (error) {
          console.error('❌ Error in foreground location tracking:', error);
        }
      }, intervalSeconds * 1000);

      this.isTracking = true;
      console.log('✅ FOREGROUND-ONLY location tracking started');
    } catch (error) {
      console.error('❌ Error starting foreground location tracking:', error);
    }
  }

  // Stop background location tracking
  async stopTracking() {
    try {
      if (!this.isTracking) {
        console.log('🎯 Location tracking not active');
        return;
      }

      // Stop background location updates
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Background location updates stopped');
      } catch (error) {
        console.log('⚠️ Background location updates not running or already stopped');
      }

      // Stop foreground interval if running
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        console.log('✅ Foreground tracking interval stopped');
      }

      this.isTracking = false;
      console.log('✅ Location tracking stopped completely');
    } catch (error) {
      console.error('❌ Error stopping location tracking:', error);
    }
  }

  // Check if user is currently clocked in
  private async isUserClockedIn(): Promise<boolean> {
    try {
      if (!this.currentUser || !this.companyId) return false;

      const { data } = await supabase
        .from('timesheets')
        .select('id')
        .eq('staff_id', this.currentUser.id)
        .eq('company_id', this.companyId)
        .is('clock_out', null)
        .single();

      return !!data;
    } catch (error) {
      console.error('❌ Error checking clock-in status:', error);
      return false;
    }
  }


  // Process location update and check geofences
  private async processLocationUpdate(locationData: LocationData) {
    try {
      console.log('🎯 Processing location update:', {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      });

      // Check geofences if enabled (only when user is clocked in)
      const isClockedIn = await this.isUserClockedIn();
      if (this.locationSettings?.geofencing_enabled && isClockedIn) {
        const events = await geofencingService.checkGeofences(
          locationData.latitude,
          locationData.longitude
        );

        if (events.length > 0) {
          console.log('🎯 Geofence events detected:', events.length);
          
          // Record geofence events
          await geofencingService.recordGeofenceEvents(events);
        }
      }
      
      // Always create location ping for tracking
      await this.createLocationPing(locationData);
    } catch (error) {
      console.error('❌ Error processing location update:', error);
    }
  }

  // Create location ping
  private async createLocationPing(locationData: LocationData) {
    try {
      if (!this.currentUser || !this.companyId) return;

      // Get current active timesheet (if any)
      const { data: timesheet } = await supabase
        .from('timesheets')
        .select('id')
        .eq('staff_id', this.currentUser.id)
        .eq('company_id', this.companyId)
        .is('clock_out', null)
        .single();

      // Create location ping data
      const locationPingData: any = {
        user_id: this.currentUser.id,
        company_id: this.companyId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timesheet_id: timesheet?.id || null  // null when not clocked in
      };

      console.log('📍 Attempting to insert location ping:', locationPingData);
      
      const { error } = await supabase
        .from('location_pings')
        .insert(locationPingData);

      if (error) {
        console.error('❌ Error inserting location ping:', error);
        console.error('📍 Location ping data:', locationPingData);
      } else {
        const status = timesheet ? 'with timesheet' : 'without timesheet';
        console.log(`✅ Location ping created successfully ${status}`);
      }
    } catch (error) {
      console.error('❌ Error creating location ping:', error);
    }
  }

  // Update user info (call this when user changes)
  async updateUser(user: any) {
    console.log('🎯 Updating user in background location service:', user?.id);
    this.currentUser = user;
    if (user) {
      await this.getCompanyId();
      await this.loadLocationSettings();
      console.log('🎯 User updated successfully:', {
        userId: user.id,
        companyId: this.companyId,
        locationTrackingEnabled: this.locationSettings?.location_tracking_enabled,
        pingInterval: this.locationSettings?.location_ping_interval_seconds
      });
    } else {
      this.companyId = null;
      this.locationSettings = null;
    }
  }

  // Check if background tracking is active
  isActive(): boolean {
    return this.isTracking;
  }

  // Check if background location permission is granted
  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  }

  // Check if background location is supported on this device
  async isBackgroundLocationSupported(): Promise<boolean> {
    try {
      // Check if TaskManager is available
      if (!TaskManager.isTaskRegisteredAsync) {
        console.log('⚠️ TaskManager not available - background location not supported');
        return false;
      }

      // For dev client builds, background location is often limited
      // Return false to force foreground tracking for now
      console.log('🔧 Dev client build detected - using foreground tracking only');
      return false;
    } catch (error) {
      console.error('❌ Error checking background location support:', error);
      return false;
    }
  }

  // Get current tracking status
  getTrackingStatus(): { isActive: boolean; mode: 'background' | 'foreground' | 'none' } {
    if (!this.isTracking) {
      return { isActive: false, mode: 'none' };
    }
    
    // If we have an interval, it's foreground-only
    if (this.trackingInterval) {
      return { isActive: true, mode: 'foreground' };
    }
    
    // Otherwise it's background tracking
    return { isActive: true, mode: 'background' };
  }

  // Get current location settings
  getLocationSettings(): LocationSettings | null {
    return this.locationSettings;
  }
}

// Export singleton instance
export const backgroundLocationService = new BackgroundLocationService();
