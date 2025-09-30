'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Clock, Navigation, ToggleLeft, ToggleRight, Save } from 'lucide-react'

interface LocationSettingsProps {
  companyId: string
}

interface LocationSettingsData {
  location_tracking_enabled: boolean
  location_ping_interval_seconds: number
  location_ping_distance_meters: number
  geofencing_enabled: boolean
}

export default function LocationSettings({ companyId }: LocationSettingsProps) {
  const [settings, setSettings] = useState<LocationSettingsData>({
    location_tracking_enabled: true,
    location_ping_interval_seconds: 30,
    location_ping_distance_meters: 50,
    geofencing_enabled: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [companyId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.rpc('get_company_location_settings', {
        p_company_id: companyId
      })

      if (error) throw error
      
      if (data && data.length > 0) {
        setSettings(data[0])
      }
    } catch (error) {
      console.error('Error loading location settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const { error } = await supabase.rpc('update_company_location_settings', {
        p_company_id: companyId,
        p_location_tracking_enabled: settings.location_tracking_enabled,
        p_location_ping_interval_seconds: settings.location_ping_interval_seconds,
        p_location_ping_distance_meters: settings.location_ping_distance_meters,
        p_geofencing_enabled: settings.geofencing_enabled
      })

      if (error) throw error
      
      // Show success message
      alert('Location settings saved successfully!')
    } catch (error) {
      console.error('Error saving location settings:', error)
      alert('Error saving location settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (field: keyof LocationSettingsData) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleInputChange = (field: keyof LocationSettingsData, value: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Location Tracking Settings</h3>
          <p className="text-sm text-gray-500">
            Configure location tracking and geofencing preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Location Tracking Toggle */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Location Tracking</h4>
              <p className="text-sm text-gray-500">
                Enable background location tracking for employees
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('location_tracking_enabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.location_tracking_enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.location_tracking_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Location Tracking Settings */}
      {settings.location_tracking_enabled && (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <h4 className="text-sm font-medium text-gray-900">Tracking Configuration</h4>
          
          {/* Ping Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Location Ping Interval
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={settings.location_ping_interval_seconds}
                onChange={(e) => handleInputChange('location_ping_interval_seconds', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                {settings.location_ping_interval_seconds}s
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              How often to ping location (10-300 seconds)
            </p>
          </div>

          {/* Distance Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Navigation className="h-4 w-4 inline mr-2" />
              Distance Threshold
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={settings.location_ping_distance_meters}
                onChange={(e) => handleInputChange('location_ping_distance_meters', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                {settings.location_ping_distance_meters}m
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum distance to trigger location ping (10-500 meters)
            </p>
          </div>
        </div>
      )}

      {/* Geofencing Toggle */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Geofencing</h4>
              <p className="text-sm text-gray-500">
                Enable automatic geofence enter/exit detection
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('geofencing_enabled')}
            disabled={!settings.location_tracking_enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              settings.geofencing_enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.geofencing_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {!settings.location_tracking_enabled && (
          <p className="text-xs text-gray-500 mt-2">
            Enable location tracking first to use geofencing
          </p>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How It Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Location tracking only works when employees are clocked in</li>
          <li>• Tracking stops automatically when employees clock out</li>
          <li>• Background tracking works when app is minimized (not killed)</li>
          <li>• Geofencing detects when employees enter/exit defined areas</li>
          <li>• All location data is stored securely and privately</li>
        </ul>
      </div>
    </div>
  )
}
