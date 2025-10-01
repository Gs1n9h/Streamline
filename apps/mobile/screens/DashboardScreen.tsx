import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { RootStackParamList } from '../App';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import ModernClockSlider from '../components/dashboard/ModernClockSlider';
import ModernKPICards from '../components/dashboard/ModernKPICards';
import { Job, Timesheet, TimesheetPeriod } from '../types';
import { geofencingService } from '../services/GeofencingService';
import { backgroundLocationService } from '../services/BackgroundLocationService';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetPeriod[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [jobSelectionRequired, setJobSelectionRequired] = useState(true);
  const [currentGeofences, setCurrentGeofences] = useState<string[]>([]);
  const [backgroundTrackingActive, setBackgroundTrackingActive] = useState(false);
  const [locationSettings, setLocationSettings] = useState<any>(null);

  const fetchJobs = async () => {
    try {
      // Get user's company
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!membership) return;

      // Use the new RPC function to get available jobs for the user
      const { data, error } = await supabase.rpc('get_available_jobs_for_user', {
        p_user_id: user?.id,
        p_company_id: membership.company_id
      });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchActiveTimesheet = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_shift', {
        p_staff_id: user?.id
      });

      if (error) throw error;
      setActiveTimesheet(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching active timesheet:', error);
    }
  };

  const fetchTimesheets = async (period: 'today' | 'week' | 'month', showLoading = false) => {
    try {
      if (showLoading) {
        setPeriodLoading(true);
      }

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const endDate = new Date(now);

      const { data, error } = await supabase.rpc('get_timesheets_for_period', {
        p_staff_id: user?.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) throw error;
      setTimesheets(data || []);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      if (showLoading) {
        setPeriodLoading(false);
      }
    }
  };

  const checkJobSelectionRequired = async () => {
    try {
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase.rpc('is_job_selection_required', {
        p_company_id: membership.company_id
      });

      if (error) throw error;
      setJobSelectionRequired(data || true);
    } catch (error) {
      console.error('Error checking job selection requirement:', error);
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([
        fetchUserProfile().catch(e => console.error('❌ fetchUserProfile error:', e)),
        fetchJobs().catch(e => console.error('❌ fetchJobs error:', e)),
        fetchActiveTimesheet().catch(e => console.error('❌ fetchActiveTimesheet error:', e)),
        fetchTimesheets(selectedPeriod).catch(e => console.error('❌ fetchTimesheets error:', e)),
        checkJobSelectionRequired().catch(e => console.error('❌ checkJobSelectionRequired error:', e)),
        initializeGeofencing().catch(e => console.error('❌ initializeGeofencing error:', e)),
        initializeBackgroundTracking().catch(e => console.error('❌ initializeBackgroundTracking error:', e))
      ]);
    } catch (error) {
      console.error('❌ loadData failed:', error);
    }
  };

  const initializeGeofencing = async () => {
    try {
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (membership) {
        await geofencingService.initialize(membership.company_id);
        console.log('🎯 Geofencing service initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing geofencing:', error);
    }
  };

  const requestLocationPermissions = async () => {
    try {
      console.log('🎯 Checking location permissions...');
      
      // ONLY request foreground permission - background must be enabled manually in Settings
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Streamline needs access to your location to clock in/out and track work hours.\n\nFor background tracking, you can later enable "Always" location access in Settings.',
          [
            {
              text: 'Grant Permission',
              onPress: async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  console.log('✅ Foreground location permission granted');
                  console.log('💡 To enable background tracking: Settings > Streamline > Location > Always');
                } else {
                  Alert.alert(
                    'Permission Denied',
                    'You can enable location permissions later in Settings > Streamline > Location'
                  );
                }
              }
            },
            {
              text: 'Not Now',
              style: 'cancel'
            }
          ]
        );
      } else {
        console.log('✅ Location permission already granted');
      }
    } catch (error: any) {
      console.error('❌ Error requesting permissions:', error);
    }
  };

  const initializeBackgroundTracking = async () => {
    try {
      console.log('🎯 Initializing background location service...');
      await backgroundLocationService.initialize();
      
      console.log('🎯 Updating user in background service...');
      await backgroundLocationService.updateUser(user);
      
      console.log('🎯 Starting location tracking...');
      await backgroundLocationService.startTracking();
      
      // Update tracking status
      const isActive = backgroundLocationService.isActive();
      setBackgroundTrackingActive(isActive);
      
      console.log('🎯 Location tracking initialization complete:', { isActive });
    } catch (error) {
      console.error('❌ Error initializing background tracking:', error);
    }
  };

  const checkBackgroundTrackingStatus = async () => {
    try {
      const isActive = backgroundLocationService.isActive();
      const hasPermission = await backgroundLocationService.hasPermission();
      const isSupported = await backgroundLocationService.isBackgroundLocationSupported();
      const trackingStatus = backgroundLocationService.getTrackingStatus();

      setBackgroundTrackingActive(isActive);
      
      // Also update location settings display
      const settings = backgroundLocationService.getLocationSettings();
      setLocationSettings(settings);
      
      console.log('🎯 Background tracking status:', {
        isActive,
        hasPermission,
        isSupported,
        mode: trackingStatus.mode,
        isClockedIn: !!activeTimesheet,
        locationTrackingEnabled: settings?.location_tracking_enabled,
        pingInterval: settings?.location_ping_interval_seconds
      });
    } catch (error) {
      console.error('❌ Error checking background tracking status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [user, selectedPeriod]);

  // Request location permissions on first load
  useEffect(() => {
    const checkAndRequestPermissions = async () => {
      // Wait a bit for the UI to load
      setTimeout(async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        console.log('📍 Current foreground location permission status:', status);

        if (status !== 'granted') {
          console.log('⚠️ Foreground permission not granted, showing dialog...');
          await requestLocationPermissions();
        } else {
          console.log('✅ Foreground location permission already granted');
          console.log('💡 For background tracking, use: npx expo run:ios (development build)');
        }
      }, 1500);
    };

    if (user) {
      checkAndRequestPermissions();
    }
  }, [user]);

  // Note: Background location tracking is now handled by BackgroundLocationService
  // The setInterval approach doesn't work when app is minimized

  // Check background tracking status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && activeTimesheet) {
        checkBackgroundTrackingStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, activeTimesheet]);

  // Periodic location settings refresh - check for settings changes every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        console.log('🔄 Refreshing location settings...');
        await backgroundLocationService.refreshLocationSettings();
      } catch (error) {
        console.error('❌ Error refreshing location settings:', error);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClockAction = async (jobId: string | null, action: 'in' | 'out') => {
    setClockActionLoading(true);
    
    try {
      console.log(`🕐 Starting ${action} action for job:`, jobId);
      
      // Get location with enhanced logging
      console.log('📍 Requesting location...');
      const { data: location, error: locationError } = await getCurrentLocation();
      
      if (locationError) {
        console.error('📍 Location error:', locationError);
        Alert.alert('Location Error', `Unable to get your location: ${locationError}`);
        return;
      }
      
      if (!location) {
        console.error('📍 No location data received');
        Alert.alert('Error', 'Unable to get your location. Please check your location permissions and try again.');
        return;
      }
      
      console.log('📍 Location obtained:', { 
        latitude: location.latitude, 
        longitude: location.longitude 
      });

      if (action === 'in') {
        console.log('🕐 Processing checkin...');
        
        const { data: membership } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user?.id)
          .single();

        if (!membership) {
          throw new Error('User is not a member of any company');
        }

        // Use the new RPC function that handles optional job selection
        const { data: timesheetId, error } = await supabase.rpc('create_timesheet_with_optional_job', {
          p_staff_id: user?.id,
          p_company_id: membership.company_id,
          p_job_id: jobId || null,
          p_latitude: location.latitude,
          p_longitude: location.longitude
        });

        if (error) throw error;
        console.log('✅ Checkin successful, timesheet ID:', timesheetId);
        
        // Create initial location ping for live tracking
        await createLocationPing(timesheetId, location.latitude, location.longitude);
        
        // Location tracking is always running, no need to start/stop
        console.log('✅ Check-in successful - location tracking continues');
      } else {
        console.log('🕐 Processing checkout...');
        
        const { error } = await supabase.rpc('clock_out_user', {
          p_timesheet_id: activeTimesheet?.id,
          p_latitude: location.latitude,
          p_longitude: location.longitude,
        });

        if (error) throw error;
        console.log('✅ Checkout successful - location tracking continues');
      }

      // Refresh data
      console.log('🔄 Refreshing data...');
      await loadData();
    } catch (error: any) {
      console.error('❌ Clock action error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setClockActionLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<{ data: { latitude: number; longitude: number } | null; error: string | null }> => {
    try {
      console.log('📍 Checking location permissions...');
      
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        const error = 'Location services are disabled. Please enable location services in your device settings.';
        console.error('📍 Location services disabled');
        return { data: null, error };
      }

      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Permission status:', status);
      
      if (status !== 'granted') {
        const error = 'Location permission is required to clock in/out. Please grant location permission in your device settings.';
        console.error('📍 Permission denied');
        return { data: null, error };
      }

      console.log('📍 Getting current position...');
      
      // Get current position with more detailed options
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Changed from High to Balanced for better reliability
      });

      console.log('📍 Location obtained successfully:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString()
      });

      return {
        data: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        error: null
      };
    } catch (error: any) {
      console.error('📍 Location error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      let errorMessage = 'Unable to get your current location. ';
      
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage += 'Location services are disabled. Please enable them in your device settings.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage += 'Location is currently unavailable. Please try again in a moment.';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage += 'Location request timed out. Please try again.';
      } else {
        errorMessage += 'Please check your location permissions and try again.';
      }
      
      return { data: null, error: errorMessage };
    }
  };

  const createLocationPing = async (timesheetId: string, latitude: number, longitude: number) => {
    try {
      console.log('📍 Creating location ping...');
      
      const { error } = await supabase
        .from('location_pings')
        .insert({
          user_id: user?.id,
          timesheet_id: timesheetId,
          latitude,
          longitude
        });

      if (error) throw error;
      console.log('✅ Location ping created successfully');

      // Check geofences and record events
      await checkGeofences(latitude, longitude);
    } catch (error) {
      console.error('❌ Location ping error:', error);
      // Don't throw error - location pings are not critical for check-in
    }
  };

  const checkGeofences = async (latitude: number, longitude: number) => {
    try {
      const events = await geofencingService.checkGeofences(latitude, longitude);
      
      if (events.length > 0) {
        await geofencingService.recordGeofenceEvents(events);
        
        // Update current geofences state
        const currentGeofences = geofencingService.getCurrentGeofences();
        setCurrentGeofences(currentGeofences.map(g => g.name));
        
        // Log geofence events (no user notifications)
        for (const event of events) {
          const geofenceName = geofencingService.getGeofenceName(event.geofence_id);
          console.log(`🎯 Geofence event: ${event.event_type} ${geofenceName}`);
        }
      }
    } catch (error) {
      console.error('❌ Geofence check error:', error);
    }
  };

  const navigateToActivities = () => {
    navigation.navigate('Activities');
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  const handlePeriodChange = async (period: 'today' | 'week' | 'month') => {
    setSelectedPeriod(period);
    await fetchTimesheets(period, true);
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.initialLoadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingTitle}>Loading Dashboard</Text>
            <Text style={styles.loadingSubtitle}>Please wait...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
          <Text style={styles.userName}>
            {userProfile?.full_name || 'User'}
          </Text>
          {locationSettings && !locationSettings.location_tracking_enabled && (
            <View style={[styles.trackingStatus, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
              <Text style={[styles.trackingStatusText, { color: '#92400e' }]}>
                📍 Location tracking disabled by admin
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={navigateToSettings} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Modern KPI Cards */}
      <ModernKPICards
        timesheets={timesheets}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        loading={periodLoading}
      />

      {/* Recent Activities - Only show when clocked out */}
      {!activeTimesheet && (
        <View style={styles.recentActivitySection}>
          <TouchableOpacity
            style={styles.recentActivityButton}
            onPress={navigateToActivities}
          >
            <Text style={styles.actionButtonIcon}>📋</Text>
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonText}>Recent Activities</Text>
              <Text style={styles.actionButtonSubtext}>View timesheet history</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Clock Slider - Fixed position */}
      <View style={styles.sliderSection}>
        <ModernClockSlider
          isClockedIn={!!activeTimesheet}
          jobs={jobs}
          onClockIn={(jobId) => handleClockAction(jobId, 'in')}
          onClockOut={() => handleClockAction('', 'out')}
          currentJob={jobs.find(j => j.id === activeTimesheet?.job_id)}
          loading={clockActionLoading}
          clockInTime={activeTimesheet?.clock_in ? new Date(activeTimesheet.clock_in) : undefined}
          userName={userProfile?.full_name || 'User'}
          jobSelectionRequired={jobSelectionRequired}
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  initialLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },
  loadingContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '600',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'white',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  geofenceStatus: {
    marginTop: 8,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  geofenceStatusText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '600',
  },
  trackingStatus: {
    marginTop: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  trackingStatusText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  recentActivitySection: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  recentActivityButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderSection: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionButtonTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});

