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
import { Settings, Building2, Clock, DollarSign, MapPin, Save, ArrowLeft, Briefcase, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [jobAssignments, setJobAssignments] = useState<JobAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      loadCompanyData()
    }
  }, [user, authLoading, router])

  const loadCompanyData = async () => {
    try {
      // Get user's company
      const { data: memberships } = await supabase
        .from('company_members')
        .select(`
          company_id,
          companies!inner (*)
        `)
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single()

      if (memberships?.companies) {
        const company = memberships.companies as CompanyData
        setCompanyData(company)

        // Load jobs
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', company.id)
          .eq('is_archived', false)
          .order('name')

        setJobs(jobsData || [])

        // Load employees
        const { data: employeesData } = await supabase
          .from('company_members')
          .select(`
            user_id,
            role,
            profiles!inner (id, full_name, email)
          `)
          .eq('company_id', company.id)

        const formattedEmployees = employeesData?.map(emp => ({
          id: emp.profiles.id,
          full_name: emp.profiles.full_name || 'Unknown',
          email: emp.profiles.email || '',
          role: emp.role
        })) || []

        setEmployees(formattedEmployees)

        // Load job assignments
        const { data: assignmentsData } = await supabase
          .from('job_assignments')
          .select('*')
          .eq('company_id', company.id)

        setJobAssignments(assignmentsData || [])
      }
    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!companyData) return

    setSaving(true)
    try {
      const { error } = await supabase
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

      if (error) throw error

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateCompanyData = (field: keyof CompanyData, value: any) => {
    setCompanyData(prev => {
      if (!prev) return prev
      
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Auto-update timezone and currency when country/state changes
      if (field === 'address') {
        // Parse address for country/state if needed
        // This is a simplified version - in production you'd want more sophisticated parsing
      }
      
      return newData
    })
  }

  const getStatesForCountry = () => {
    // Extract country from address (simplified)
    if (companyData?.address.includes('USA') || companyData?.address.includes('United States')) {
      return US_STATES
    }
    if (companyData?.address.includes('Canada')) {
      return CA_PROVINCES
    }
    return []
  }

  const toggleJobAssignment = async (jobId: string, userId: string) => {
    if (!companyData) return

    try {
      const existingAssignment = jobAssignments.find(
        assignment => assignment.job_id === jobId && assignment.user_id === userId
      )

      if (existingAssignment) {
        // Remove assignment
        const { error } = await supabase
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
          <p className="text-gray-600 mb-6">You don't have admin access to any companies.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          </div>
          <p className="text-gray-600 mt-2">Manage your company information and default settings</p>
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

        <div className="space-y-8">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
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
                  value={companyData.name}
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
                  value={companyData.industry || ''}
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
                  value={companyData.size || ''}
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
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={companyData.address || ''}
                  onChange={(e) => updateCompanyData('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="123 Main St, City, State, Country"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={companyData.phone || ''}
                  onChange={(e) => updateCompanyData('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={companyData.website || ''}
                  onChange={(e) => updateCompanyData('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>
          </div>

          {/* Default Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Clock className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Default Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  value={companyData.time_zone || 'America/New_York'}
                  onChange={(e) => updateCompanyData('time_zone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  <option value="America/Toronto">Canada Eastern Time</option>
                  <option value="America/Vancouver">Canada Pacific Time</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Central European Time</option>
                  <option value="Asia/Tokyo">Japan Standard Time</option>
                  <option value="Asia/Shanghai">China Standard Time</option>
                  <option value="Australia/Sydney">Australian Eastern Time</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={companyData.currency || 'USD'}
                  onChange={(e) => updateCompanyData('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (CHF)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Pay Rate ({companyData.currency || 'USD'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={companyData.default_pay_rate || 0}
                  onChange={(e) => updateCompanyData('default_pay_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used as the default rate for new employees
                </p>
              </div>
            </div>
          </div>

          {/* Job Management Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Briefcase className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Job Management</h2>
            </div>
            
            <div className="space-y-6">
              {/* Job Tracking Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Enable Job Tracking</h3>
                  <p className="text-sm text-gray-600">Allow employees to track time against specific jobs</p>
                </div>
                <button
                  onClick={() => updateCompanyData('job_tracking_enabled', !companyData.job_tracking_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    companyData.job_tracking_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      companyData.job_tracking_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Job Selection Requirement */}
              {companyData.job_tracking_enabled && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Require Job Selection</h3>
                    <p className="text-sm text-gray-600">Employees must select a job when clocking in</p>
                  </div>
                  <button
                    onClick={() => updateCompanyData('job_selection_required', !companyData.job_selection_required)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      companyData.job_selection_required ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        companyData.job_selection_required ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Default Job Selection */}
              {companyData.job_tracking_enabled && !companyData.job_selection_required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Job
                  </label>
                  <select
                    value={companyData.default_job_id || ''}
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
              {companyData.job_tracking_enabled && jobs.length > 0 && employees.length > 0 && (
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
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
