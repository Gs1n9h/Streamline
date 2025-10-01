'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { 
  INDUSTRIES, 
  COMPANY_SIZES, 
  PAY_PERIODS, 
  COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  getTimezoneForLocation,
  getCurrencyForCountry
} from '@/lib/constants'
import { Settings, Building2, Clock, DollarSign, MapPin, Save, Briefcase, Users, ToggleLeft, ToggleRight, Navigation } from 'lucide-react'
import GeofenceManagement from '../GeofenceManagement'
import LocationSettings from '../LocationSettings'

interface CompanyData {
  id: string
  name: string
  industry: string
  size: string
  address: string
  phone: string
  website: string
  time_zone: string
  currency: string
  default_pay_rate: number
  job_tracking_enabled: boolean
  job_selection_required: boolean
  default_job_id: string | null
}

interface Job {
  id: string
  name: string
  address: string
  is_archived: boolean
  is_system_default?: boolean
}

interface Employee {
  id: string
  full_name: string
  email: string
  role: string
}

interface JobAssignment {
  id: string
  job_id: string
  user_id: string
  is_active: boolean
}

interface SettingsTabProps {
  companyId: string
  onSettingsUpdate?: () => void
}

interface LocationSettingsData {
  location_tracking_enabled: boolean
  location_ping_interval_seconds: number
  location_ping_distance_meters: number
  geofencing_enabled: boolean
}

type SettingsSection = 'company' | 'jobs' | 'location' | 'geofencing'

export default function SettingsTab({ companyId, onSettingsUpdate }: SettingsTabProps) {
  const { user, loading: authLoading } = useAuth()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [jobAssignments, setJobAssignments] = useState<JobAssignment[]>([])
  const [locationSettings, setLocationSettings] = useState<LocationSettingsData>({
    location_tracking_enabled: false,
    location_ping_interval_seconds: 30,
    location_ping_distance_meters: 50,
    geofencing_enabled: false
  })
  const [activeSection, setActiveSection] = useState<SettingsSection>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (companyId && user && !authLoading) {
      loadCompanyData()
    }
  }, [companyId, user, authLoading])

  const loadCompanyData = async () => {
    try {
      // Get company data
      const { data: company, error: companyError } = await supabase
        .schema('streamline')
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) throw companyError
      setCompanyData(company)

      // Load jobs using the active jobs view
      const { data: jobsData } = await supabase
        .schema('streamline')
        .from('v_active_jobs')
        .select('id, name, address, is_archived, is_system_default, created_at, should_display_in_ui, job_type_label')
        .eq('company_id', companyId)
        .eq('should_display_in_ui', true)
        .order('name')

      setJobs(jobsData || [])

      // Load employees
      const { data: employeesData } = await supabase
        .schema('streamline')
        .from('company_members')
        .select(`
          user_id,
          role,
          profiles!inner (id, full_name, email)
        `)
        .eq('company_id', companyId)

      const formattedEmployees = employeesData?.map((emp: any) => ({
        id: emp.profiles.id,
        full_name: emp.profiles.full_name || 'Unknown',
        email: emp.profiles.email || '',
        role: emp.role
      })) || []

      setEmployees(formattedEmployees)

      // Load job assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .select('*')
        .eq('company_id', companyId)

      if (assignmentsError) throw assignmentsError
      setJobAssignments(assignmentsData || [])

      // Load location settings
      await loadLocationSettings()
    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLocationSettings = async () => {
    try {
      console.log('Loading location settings for company:', companyId, 'user:', user?.id)
      const { data, error } = await supabase.rpc('get_company_location_settings', {
        p_company_id: companyId
      })

      if (error) {
        console.error('Location settings RPC error:', error)
        throw error
      }
      
      console.log('Location settings data received:', data)
      if (data && data.length > 0) {
        console.log('Setting location settings to:', data[0])
        setLocationSettings(data[0])
      } else {
        console.log('No location settings data received')
      }
    } catch (error) {
      console.error('Error loading location settings:', error)
    }
  }

  const handleSave = async () => {
    if (!companyData) return

    setSaving(true)
    try {
      // Save company data
      const { error: companyError } = await supabase
        .schema('streamline')
        .from('companies')
        .update({
          name: companyData.name,
          industry: companyData.industry,
          size: companyData.size,
          address: companyData.address,
          phone: companyData.phone,
          website: companyData.website,
          time_zone: companyData.time_zone,
          currency: companyData.currency,
          default_pay_rate: companyData.default_pay_rate,
          job_tracking_enabled: companyData.job_tracking_enabled,
          job_selection_required: companyData.job_selection_required,
          default_job_id: companyData.default_job_id
        })
        .eq('id', companyData.id)

      if (companyError) throw companyError

      // Save location settings
      console.log('Saving location settings:', locationSettings)
      const { error: locationError } = await supabase.rpc('update_company_location_settings', {
        p_company_id: companyId,
        p_location_tracking_enabled: locationSettings.location_tracking_enabled,
        p_location_ping_interval_seconds: locationSettings.location_ping_interval_seconds,
        p_location_ping_distance_meters: locationSettings.location_ping_distance_meters,
        p_geofencing_enabled: locationSettings.geofencing_enabled
      })

      if (locationError) {
        console.error('Location settings save error:', locationError)
        throw locationError
      }
      console.log('Location settings saved successfully')

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
      
      // Notify parent component that settings were updated
      if (onSettingsUpdate) {
        onSettingsUpdate()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateCompanyData = async (field: keyof CompanyData, value: any) => {
    if (!companyData) return

    // Special handling for job_tracking_enabled toggle
    if (field === 'job_tracking_enabled' && value === false) {
      try {
        // Ensure company has a default job before disabling job tracking
        const { data: defaultJobId, error } = await supabase.rpc(
          'ensure_company_has_default_job',
          { p_company_id: companyData.id }
        )

        if (error) throw error

        // Update both job_tracking_enabled and default_job_id
        setCompanyData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            job_tracking_enabled: false,
            default_job_id: defaultJobId
          }
        })
        return
      } catch (error) {
        console.error('Error ensuring default job:', error)
        alert('Failed to disable job tracking. Please try again.')
        return
      }
    }

    // Regular field update
    setCompanyData(prev => {
      if (!prev) return prev
      
      const newData = {
        ...prev,
        [field]: value
      }
      
      return newData
    })
  }

  const updateLocationSettings = (field: keyof LocationSettingsData, value: any) => {
    setLocationSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleJobAssignment = async (jobId: string, userId: string) => {
    if (!companyData) return

    try {
      const existingAssignment = jobAssignments.find(
        assignment => assignment.job_id === jobId && assignment.user_id === userId
      )

      if (existingAssignment) {
        // Toggle assignment
        const { error } = await supabase
          .schema('streamline')
          .from('job_assignments')
          .update({ is_active: !existingAssignment.is_active })
          .eq('id', existingAssignment.id)

        if (error) throw error

        setJobAssignments(prev => 
          prev.map(assignment => 
            assignment.id === existingAssignment.id 
              ? { ...assignment, is_active: !assignment.is_active }
              : assignment
          )
        )
      } else {
        // Create new assignment
        const { data, error } = await supabase
          .schema('streamline')
          .from('job_assignments')
          .insert({
            job_id: jobId,
            user_id: userId,
            company_id: companyData.id,
            assigned_by: user?.id
          })
          .select()
          .single()

        if (error) throw error

        setJobAssignments(prev => [...prev, data])
      }
    } catch (error) {
      console.error('Error updating job assignment:', error)
      setMessage('Failed to update job assignment. Please try again.')
    }
  }

  const isJobAssignedToUser = (jobId: string, userId: string) => {
    return jobAssignments.some(
      assignment => assignment.job_id === jobId && assignment.user_id === userId && assignment.is_active
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!companyData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
          <p className="text-gray-600">Unable to load company settings.</p>
        </div>
      </div>
    )
  }

  const settingsSections = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'jobs', label: 'Job Management', icon: Briefcase },
    { id: 'location', label: 'Location Tracking', icon: MapPin },
    { id: 'geofencing', label: 'Geofencing', icon: Navigation }
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'company':
        return renderCompanySection()
      case 'jobs':
        return renderJobsSection()
      case 'location':
        return renderLocationSection()
      case 'geofencing':
        return renderGeofencingSection()
      default:
        return renderCompanySection()
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
              <p className="text-gray-600 mt-1">Manage your company information and preferences</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="flex gap-8">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-2">
            {settingsSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as SettingsSection)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )

  function renderCompanySection() {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Building2 className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyData?.name || ''}
              onChange={(e) => updateCompanyData('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry *
            </label>
            <select
              value={companyData?.industry || ''}
              onChange={(e) => updateCompanyData('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size *
            </label>
            <select
              value={companyData?.size || ''}
              onChange={(e) => updateCompanyData('size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Size</option>
              {COMPANY_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  function renderJobsSection() {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Briefcase className="w-6 h-6 text-purple-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Job Management</h2>
        </div>

        {/* Job Tracking Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Enable Job Tracking</h3>
            <p className="text-sm text-gray-600">Allow employees to track time against specific jobs</p>
          </div>
          <button
            onClick={() => updateCompanyData('job_tracking_enabled', !companyData?.job_tracking_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              companyData?.job_tracking_enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                companyData?.job_tracking_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Job Selection Requirement */}
        {companyData?.job_tracking_enabled && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Require Job Selection</h3>
              <p className="text-sm text-gray-600">Employees must select a job when clocking in</p>
            </div>
            <button
              onClick={() => updateCompanyData('job_selection_required', !companyData?.job_selection_required)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                companyData?.job_selection_required ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  companyData?.job_selection_required ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Default Job Selection */}
        {companyData?.job_tracking_enabled && !companyData?.job_selection_required && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Job
            </label>
            <select
              value={companyData?.default_job_id || ''}
              onChange={(e) => updateCompanyData('default_job_id', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Default Job</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This job will be used when employees don't select a specific job
            </p>
          </div>
        )}

        {/* Job Assignment Matrix */}
        {companyData?.job_tracking_enabled && jobs.length > 0 && employees.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Job Assignments</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Assign specific jobs to specific employees. If no assignments are made, all jobs are available to all employees.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    {jobs.map(job => (
                      <th key={job.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {job.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.filter(emp => emp.role === 'staff').map(employee => (
                    <tr key={employee.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {employee.full_name}
                      </td>
                      {jobs.map(job => (
                        <td key={job.id} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleJobAssignment(job.id, employee.id)}
                            className={`w-6 h-6 rounded-full border-2 transition-colors ${
                              isJobAssignedToUser(job.id, employee.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {isJobAssignedToUser(job.id, employee.id) && (
                              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderLocationSection() {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <MapPin className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Location Tracking Settings</h2>
        </div>

        {/* Location Tracking Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
            onClick={() => updateLocationSettings('location_tracking_enabled', !locationSettings.location_tracking_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              locationSettings.location_tracking_enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                locationSettings.location_tracking_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Location Tracking Settings */}
        {locationSettings.location_tracking_enabled && (
          <div className="space-y-6">
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
                  value={locationSettings.location_ping_interval_seconds}
                  onChange={(e) => updateLocationSettings('location_ping_interval_seconds', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                  {locationSettings.location_ping_interval_seconds}s
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
                  value={locationSettings.location_ping_distance_meters}
                  onChange={(e) => updateLocationSettings('location_ping_distance_meters', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                  {locationSettings.location_ping_distance_meters}m
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum distance to trigger location ping (10-500 meters)
              </p>
            </div>
          </div>
        )}

        {/* Geofencing Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
            onClick={() => updateLocationSettings('geofencing_enabled', !locationSettings.geofencing_enabled)}
            disabled={!locationSettings.location_tracking_enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              locationSettings.geofencing_enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                locationSettings.geofencing_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {!locationSettings.location_tracking_enabled && (
          <p className="text-xs text-gray-500 mt-2">
            Enable location tracking first to use geofencing
          </p>
        )}

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

  function renderGeofencingSection() {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Navigation className="w-6 h-6 text-green-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Geofencing Management</h2>
        </div>
        <GeofenceManagement companyId={companyId} />
      </div>
    )
  }
}
