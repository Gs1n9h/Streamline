'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, User, Clock, Filter, Calendar } from 'lucide-react'

interface GeofenceEvent {
  id: number
  geofence_name: string
  user_name: string
  event_type: 'enter' | 'exit'
  latitude: number
  longitude: number
  distance_from_center: number
  created_at: string
}

interface GeofenceEventsProps {
  companyId: string
}

export default function GeofenceEvents({ companyId }: GeofenceEventsProps) {
  const [events, setEvents] = useState<GeofenceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    userId: '',
    geofenceId: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    loadEvents()
  }, [companyId, filters])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.rpc('get_geofence_events', {
        p_company_id: companyId,
        p_user_id: filters.userId || null,
        p_geofence_id: filters.geofenceId || null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null
      })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading geofence events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`
    }
    return `${(distance / 1000).toFixed(1)}km`
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getEventIcon = (eventType: 'enter' | 'exit'): string => {
    return eventType === 'enter' ? '🟢' : '🔴'
  }

  const getEventColor = (eventType: 'enter' | 'exit'): string => {
    return eventType === 'enter' ? 'text-green-600' : 'text-red-600'
  }

  const getEventBgColor = (eventType: 'enter' | 'exit'): string => {
    return eventType === 'enter' ? 'bg-green-50' : 'bg-red-50'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Geofence Events</h3>
          <p className="text-sm text-gray-500">
            Historical record of geofence enter/exit events
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="h-4 w-4 text-gray-500 mr-2" />
          <h4 className="text-sm font-medium text-gray-700">Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Employees</option>
              {/* TODO: Add employee options */}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Geofence</label>
            <select
              value={filters.geofenceId}
              onChange={(e) => setFilters({ ...filters, geofenceId: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Geofences</option>
              {/* TODO: Add geofence options */}
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white shadow rounded-lg">
        {events.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No geofence events found</p>
            <p className="text-sm text-gray-400 mt-2">
              Events will appear here when employees enter or exit geofenced areas
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getEventBgColor(event.event_type)} flex items-center justify-center`}>
                      <span className="text-lg">{getEventIcon(event.event_type)}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-medium text-gray-900">
                          {event.user_name}
                        </h5>
                        <span className={`text-xs font-medium ${getEventColor(event.event_type)}`}>
                          {event.event_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{event.geofence_name}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatDateTime(event.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-1 text-xs text-gray-400">
                          Distance: {formatDistance(event.distance_from_center)} from center
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
