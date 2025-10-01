'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, User, Clock, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })

interface LatestLocation {
  user_id: string
  full_name: string
  latitude: number
  longitude: number
  last_updated_at: string
  job_name: string
}

interface Geofence {
  id: string
  name: string
  description?: string
  center_latitude: number
  center_longitude: number
  radius_meters: number
  is_active: boolean
}

interface LiveMapProps {
  locations: LatestLocation[]
  geofences?: Geofence[]
  companyId: string
}

export default function LiveMap({ locations, geofences = [], companyId }: LiveMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [companyLocation, setCompanyLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch company default location
  useEffect(() => {
    const fetchCompanyLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('name, latitude, longitude')
          .eq('id', companyId)
          .single()

        if (error) {
          console.error('Error fetching company location:', error)
          return
        }

        if (data && data.latitude && data.longitude) {
          setCompanyLocation({
            lat: data.latitude,
            lng: data.longitude,
            name: data.name
          })
        }
      } catch (error) {
        console.error('Error fetching company location:', error)
      }
    }

    if (companyId) {
      fetchCompanyLocation()
    }
  }, [companyId])

  // Calculate map center based on locations
  const getMapCenter = () => {
    if (locations.length === 0) {
      // Use company location if available, otherwise default center
      if (companyLocation) {
        return [companyLocation.lat, companyLocation.lng] as [number, number]
      }
      // Default center (San Francisco)
      return [37.7749, -122.4194] as [number, number]
    }

    const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length
    const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length
    
    return [avgLat, avgLng] as [number, number]
  }

  const getMapZoom = () => {
    if (locations.length === 0) return 10
    if (locations.length === 1) return 15
    return 12
  }

  // Custom marker icon
  const createCustomIcon = (isActive: boolean) => {
    if (typeof window === 'undefined') return null
    
    // Use dynamic import to avoid SSR issues
    const L = (window as any).L
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${isActive ? '#10b981' : '#6b7280'};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            color: white;
            font-size: 10px;
            font-weight: bold;
          ">👤</div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }

  if (!isClient) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-200 relative z-10">
      <MapContainer
        center={getMapCenter()}
        zoom={getMapZoom()}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render company location */}
        {companyLocation && (
          <Marker position={[companyLocation.lat, companyLocation.lng]}>
            <Popup>
              <div className="p-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{companyLocation.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">Company Office</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Render geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={[geofence.center_latitude, geofence.center_longitude]}
            radius={geofence.radius_meters}
            pathOptions={{
              color: geofence.is_active ? '#3b82f6' : '#9ca3af',
              fillColor: geofence.is_active ? '#3b82f6' : '#9ca3af',
              fillOpacity: 0.2,
              weight: 2,
              opacity: 0.8
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-gray-900">{geofence.name}</h3>
                {geofence.description && (
                  <p className="text-sm text-gray-600 mt-1">{geofence.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Radius: {geofence.radius_meters}m
                </p>
                <p className="text-xs text-gray-500">
                  Status: {geofence.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Render employee locations */}
        {locations.map((location) => (
          <Marker
            key={location.user_id}
            position={[location.latitude, location.longitude]}
            icon={createCustomIcon(true)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 text-indigo-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">{location.full_name}</h3>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{location.job_name}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      Last seen: {new Date(location.last_updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-2">
                    <div>Lat: {location.latitude.toFixed(6)}</div>
                    <div>Lng: {location.longitude.toFixed(6)}</div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
