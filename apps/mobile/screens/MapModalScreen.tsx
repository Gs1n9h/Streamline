import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { RootStackParamList } from '../App';

type MapModalScreenRouteProp = RouteProp<RootStackParamList, 'MapModal'>;

interface MapModalScreenProps {
  route: MapModalScreenRouteProp;
}

export default function MapModalScreen({ route }: MapModalScreenProps) {
  const navigation = useNavigation();
  const { timesheetId, clockInLocation, clockOutLocation } = route.params;
  const [mapRegion, setMapRegion] = useState({
    latitude: clockInLocation.latitude,
    longitude: clockInLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // Calculate region to fit both locations if checkout location exists
    if (clockOutLocation) {
      const minLat = Math.min(clockInLocation.latitude, clockOutLocation.latitude);
      const maxLat = Math.max(clockInLocation.latitude, clockOutLocation.latitude);
      const minLng = Math.min(clockInLocation.longitude, clockOutLocation.longitude);
      const maxLng = Math.max(clockInLocation.longitude, clockOutLocation.longitude);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.2; // Add padding
      const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.2; // Add padding
      
      setMapRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: deltaLat,
        longitudeDelta: deltaLng,
      });
    }
  }, [clockInLocation, clockOutLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = clockOutLocation 
    ? calculateDistance(
        clockInLocation.latitude, 
        clockInLocation.longitude, 
        clockOutLocation.latitude, 
        clockOutLocation.longitude
      )
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Location History</Text>
          <Text style={styles.headerSubtitle}>
            {clockOutLocation ? 'Check-in & Check-out' : 'Check-in Only'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Clock In Marker */}
          <Marker
            coordinate={clockInLocation}
            title="Check In"
            description={`${clockInLocation.latitude.toFixed(6)}, ${clockInLocation.longitude.toFixed(6)}`}
            pinColor="green"
          />
          
          {/* Clock Out Marker */}
          {clockOutLocation && (
            <Marker
              coordinate={clockOutLocation}
              title="Check Out"
              description={`${clockOutLocation.latitude.toFixed(6)}, ${clockOutLocation.longitude.toFixed(6)}`}
              pinColor="red"
            />
          )}
          
          {/* Line connecting check-in and check-out */}
          {clockOutLocation && (
            <Polyline
              coordinates={[clockInLocation, clockOutLocation]}
              strokeColor="#3b82f6"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      </View>

      {/* Location Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
            <Text style={styles.locationTitle}>Check In</Text>
          </View>
          <Text style={styles.coordinates}>
            {clockInLocation.latitude.toFixed(6)}, {clockInLocation.longitude.toFixed(6)}
          </Text>
        </View>

        {clockOutLocation && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={[styles.statusIndicator, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.locationTitle}>Check Out</Text>
            </View>
            <Text style={styles.coordinates}>
              {clockOutLocation.latitude.toFixed(6)}, {clockOutLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {clockOutLocation && (
          <View style={styles.distanceCard}>
            <Text style={styles.distanceTitle}>Distance Traveled</Text>
            <Text style={styles.distanceValue}>
              {distance < 1000 
                ? `${Math.round(distance)}m` 
                : `${(distance / 1000).toFixed(2)}km`
              }
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  locationCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  coordinates: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  distanceCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  distanceTitle: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 20,
    color: '#1e40af',
    fontWeight: '700',
  },
});

