'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Clock, User } from 'lucide-react'
import LiveMap from '../LiveMap'
import GeofenceEvents from '../GeofenceEvents'

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

interface LiveDashboardProps {
  companyId: string
}

export default function LiveDashboard({ companyId }: LiveDashboardProps) {
  const [locations, setLocations] = useState<LatestLocation[]>([])
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLatestLocations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_latest_locations', {
        p_company_id: companyId
      })

      if (error) throw error
      setLocations(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGeofences = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_geofences', {
        p_company_id: companyId
      })

      if (error) throw error
      setGeofences(data || [])
    } catch (err: any) {
      console.error('Error fetching geofences:', err)
    }
  }

  useEffect(() => {
    fetchLatestLocations()
    fetchGeofences()

    // Set up real-time subscription for location updates
    const subscription = supabase
      .channel('live_locations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'streamline',
          table: 'location_pings',
        },
        () => {
          // Refetch locations when new pings arrive
          fetchLatestLocations()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error loading live locations: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Live Dashboard</h2>
        <p className="text-gray-600">
          Monitor your team's real-time locations and activity
        </p>
      </div>

      {/* Active Staff List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Active Staff ({locations.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {locations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No staff currently clocked in
            </div>
          ) : (
            locations.map((location) => (
              <div key={location.user_id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {location.full_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {location.job_name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(location.last_updated_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Map */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Live Map</h3>
        <LiveMap 
          locations={locations} 
          geofences={geofences}
          companyId={companyId}
        />
        {locations.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {locations.length} active {locations.length === 1 ? 'employee' : 'employees'}
          </div>
        )}
      </div>

      {/* Geofence Events */}
      <div className="bg-white shadow rounded-lg p-6">
        <GeofenceEvents companyId={companyId} />
      </div>
    </div>
  )
}

