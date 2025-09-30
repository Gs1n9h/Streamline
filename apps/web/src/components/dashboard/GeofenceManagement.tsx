'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

interface Geofence {
  id: string
  name: string
  description?: string
  center_latitude: number
  center_longitude: number
  radius_meters: number
  is_active: boolean
  created_by_name: string
  created_at: string
}

interface GeofenceManagementProps {
  companyId: string
}

export default function GeofenceManagement({ companyId }: GeofenceManagementProps) {
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    center_latitude: 0,
    center_longitude: 0,
    radius_meters: 100
  })

  useEffect(() => {
    loadGeofences()
  }, [companyId])

  const loadGeofences = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_geofences', {
        p_company_id: companyId
      })

      if (error) throw error
      setGeofences(data || [])
    } catch (error) {
      console.error('Error loading geofences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.rpc('create_geofence', {
        p_company_id: companyId,
        p_name: formData.name,
        p_center_latitude: formData.center_latitude,
        p_center_longitude: formData.center_longitude,
        p_radius_meters: formData.radius_meters,
        p_description: formData.description || null
      })

      if (error) throw error
      
      setShowCreateForm(false)
      setFormData({ name: '', description: '', center_latitude: 0, center_longitude: 0, radius_meters: 100 })
      await loadGeofences()
    } catch (error) {
      console.error('Error creating geofence:', error)
      alert('Failed to create geofence')
    }
  }

  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingGeofence) return

    try {
      const { error } = await supabase.rpc('update_geofence', {
        p_geofence_id: editingGeofence.id,
        p_name: formData.name,
        p_description: formData.description,
        p_center_latitude: formData.center_latitude,
        p_center_longitude: formData.center_longitude,
        p_radius_meters: formData.radius_meters
      })

      if (error) throw error
      
      setEditingGeofence(null)
      setFormData({ name: '', description: '', center_latitude: 0, center_longitude: 0, radius_meters: 100 })
      await loadGeofences()
    } catch (error) {
      console.error('Error updating geofence:', error)
      alert('Failed to update geofence')
    }
  }

  const handleDeleteGeofence = async (geofenceId: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return

    try {
      const { error } = await supabase.rpc('delete_geofence', {
        p_geofence_id: geofenceId
      })

      if (error) throw error
      await loadGeofences()
    } catch (error) {
      console.error('Error deleting geofence:', error)
      alert('Failed to delete geofence')
    }
  }

  const toggleGeofenceStatus = async (geofenceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('update_geofence', {
        p_geofence_id: geofenceId,
        p_is_active: !currentStatus
      })

      if (error) throw error
      await loadGeofences()
    } catch (error) {
      console.error('Error toggling geofence status:', error)
      alert('Failed to update geofence status')
    }
  }

  const startEdit = (geofence: Geofence) => {
    setEditingGeofence(geofence)
    setFormData({
      name: geofence.name,
      description: geofence.description || '',
      center_latitude: geofence.center_latitude,
      center_longitude: geofence.center_longitude,
      radius_meters: geofence.radius_meters
    })
  }

  const cancelEdit = () => {
    setEditingGeofence(null)
    setShowCreateForm(false)
    setFormData({ name: '', description: '', center_latitude: 0, center_longitude: 0, radius_meters: 100 })
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
          <h3 className="text-lg font-medium text-gray-900">Geofence Management</h3>
          <p className="text-sm text-gray-500">
            Create and manage geofenced areas for location tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Geofence
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingGeofence) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingGeofence ? 'Edit Geofence' : 'Create New Geofence'}
          </h4>
          
          <form onSubmit={editingGeofence ? handleUpdateGeofence : handleCreateGeofence} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="10000"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Center Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.center_latitude}
                  onChange={(e) => setFormData({ ...formData, center_latitude: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Center Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.center_longitude}
                  onChange={(e) => setFormData({ ...formData, center_longitude: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {editingGeofence ? 'Update' : 'Create'} Geofence
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Geofences List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Geofences ({geofences.length})</h4>
        </div>
        
        {geofences.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No geofences created yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Create your first geofence to start tracking employee locations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {geofences.map((geofence) => (
              <div key={geofence.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="text-sm font-medium text-gray-900">{geofence.name}</h5>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        geofence.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {geofence.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {geofence.description && (
                      <p className="text-sm text-gray-500 mt-1">{geofence.description}</p>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400">
                      <div>Center: {geofence.center_latitude.toFixed(6)}, {geofence.center_longitude.toFixed(6)}</div>
                      <div>Radius: {geofence.radius_meters}m • Created by {geofence.created_by_name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleGeofenceStatus(geofence.id, geofence.is_active)}
                      className={`p-2 rounded-md ${
                        geofence.is_active 
                          ? 'text-gray-400 hover:text-gray-600' 
                          : 'text-green-400 hover:text-green-600'
                      }`}
                      title={geofence.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {geofence.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => startEdit(geofence)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteGeofence(geofence.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
