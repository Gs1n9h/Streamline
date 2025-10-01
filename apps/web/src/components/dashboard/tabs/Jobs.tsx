'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building, Plus, Edit, Trash2, MapPin } from 'lucide-react'

interface Job {
  id: string
  name: string
  address: string | null
  is_archived: boolean
  is_system_default?: boolean
  created_at: string
}

interface JobsProps {
  companyId: string
}

export default function Jobs({ companyId }: JobsProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newJobName, setNewJobName] = useState('')
  const [newJobAddress, setNewJobAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .schema('streamline')
        .from('jobs')
        .select('id, name, address, is_archived, is_system_default, created_at')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('is_system_default', { ascending: false }) // System defaults first
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [companyId])

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newJobName.trim()) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .schema('streamline')
        .from('jobs')
        .insert({
          name: newJobName.trim(),
          address: newJobAddress.trim() || null,
          company_id: companyId
        })
        .select()
        .single()

      if (error) throw error

      setJobs(prev => [data, ...prev])
      setNewJobName('')
      setNewJobAddress('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding job:', error)
      alert('Failed to add job')
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveJob = async (jobId: string, isSystemDefault?: boolean) => {
    if (isSystemDefault) {
      alert('Cannot archive system default job. This job is required for when job tracking is disabled.')
      return
    }

    if (!confirm('Are you sure you want to archive this job?')) return

    try {
      const { error } = await supabase
        .schema('streamline')
        .from('jobs')
        .update({ is_archived: true })
        .eq('id', jobId)

      if (error) throw error

      setJobs(prev => prev.filter(job => job.id !== jobId))
    } catch (error) {
      console.error('Error archiving job:', error)
      alert('Failed to archive job')
    }
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Management</h2>
            <p className="text-gray-600">
              Create and manage work sites and projects
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Job</h3>
          <form onSubmit={handleAddJob} className="space-y-4">
            <div>
              <label htmlFor="job-name" className="block text-sm font-medium text-gray-700">
                Job Name *
              </label>
              <input
                type="text"
                id="job-name"
                value={newJobName}
                onChange={(e) => setNewJobName(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Downtown Office Building"
                required
              />
            </div>
            <div>
              <label htmlFor="job-address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="job-address"
                value={newJobAddress}
                onChange={(e) => setNewJobAddress(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., 123 Main St, City, State 12345"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving || !newJobName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Job'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewJobName('')
                  setNewJobAddress('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Active Jobs ({jobs.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {jobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No jobs found. Create your first job to get started.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Building className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {job.name}
                        </div>
                        {job.is_system_default && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            System Default
                          </span>
                        )}
                      </div>
                      {job.address && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.address}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Created {new Date(job.created_at).toLocaleDateString()}
                        {job.is_system_default && (
                          <span className="ml-2 text-blue-600">• Auto-created for job tracking</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    {!job.is_system_default ? (
                      <button
                        onClick={() => handleArchiveJob(job.id, job.is_system_default)}
                        className="text-red-600 hover:text-red-900"
                        title="Archive job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => alert('Cannot delete system default job. This job is required for when job tracking is disabled.')}
                        className="text-gray-400 cursor-not-allowed"
                        title="Cannot delete system default job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

