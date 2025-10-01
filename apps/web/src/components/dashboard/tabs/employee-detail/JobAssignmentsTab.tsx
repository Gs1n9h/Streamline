'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Briefcase, MapPin, Plus, Trash2, Calendar, Clock } from 'lucide-react'
import { EmployeeDetail, JobAssignment } from '@/types/employee'

interface JobAssignmentsTabProps {
  employee: EmployeeDetail
  companyId: string
  onUpdate: () => void
}

export default function JobAssignmentsTab({ employee, companyId, onUpdate }: JobAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<JobAssignment[]>([])
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    loadJobAssignments()
    loadAvailableJobs()
  }, [employee.user_id, companyId])

  const loadJobAssignments = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .select(`
          id,
          job_id,
          user_id,
          company_id,
          is_active,
          created_at,
          jobs!inner (
            id,
            name,
            address
          )
        `)
        .eq('user_id', employee.user_id)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (error) throw error

      // Get stats for each job assignment
      const assignmentsWithStats = await Promise.all(
        (data || []).map(async (assignment) => {
          // Get total hours worked on this job
          const { data: timesheets } = await supabase
            .schema('streamline')
            .from('timesheets')
            .select('clock_in, clock_out')
            .eq('staff_id', employee.user_id)
            .eq('job_id', assignment.job_id)
            .eq('company_id', companyId)
            .not('clock_out', 'is', null)

          const totalHours = timesheets?.reduce((total, ts) => {
            if (ts.clock_in && ts.clock_out) {
              const hours = (new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60)
              return total + hours
            }
            return total
          }, 0) || 0

          // Get last worked date
          const { data: lastTimesheet } = await supabase
            .schema('streamline')
            .from('timesheets')
            .select('clock_in')
            .eq('staff_id', employee.user_id)
            .eq('job_id', assignment.job_id)
            .eq('company_id', companyId)
            .order('clock_in', { ascending: false })
            .limit(1)

          return {
            id: assignment.id,
            job_id: assignment.job_id,
            job_name: assignment.jobs.name,
            job_address: assignment.jobs.address,
            user_id: assignment.user_id,
            company_id: assignment.company_id,
            is_active: assignment.is_active,
            assigned_date: assignment.created_at,
            total_hours_worked: totalHours,
            last_worked_date: lastTimesheet?.[0]?.clock_in,
            created_at: assignment.created_at
          }
        })
      )

      setAssignments(assignmentsWithStats)
    } catch (error) {
      console.error('Error loading job assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableJobs = async () => {
    try {
      // Get all jobs that are not assigned to this employee
      const { data: allJobs, error: jobsError } = await supabase
        .schema('streamline')
        .from('jobs')
        .select('id, name, address')
        .eq('company_id', companyId)
        .eq('is_archived', false)

      if (jobsError) throw jobsError

      // Get currently assigned job IDs
      const { data: currentAssignments, error: assignmentsError } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', employee.user_id)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      const assignedJobIds = new Set(currentAssignments?.map(a => a.job_id) || [])
      const available = allJobs?.filter(job => !assignedJobIds.has(job.id)) || []
      
      setAvailableJobs(available)
    } catch (error) {
      console.error('Error loading available jobs:', error)
    }
  }

  const handleAssignJob = async () => {
    if (!selectedJobId) return

    try {
      setAssigning(true)
      
      const { error } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .insert({
          job_id: selectedJobId,
          user_id: employee.user_id,
          company_id: companyId,
          is_active: true
        })

      if (error) throw error

      setShowAssignModal(false)
      setSelectedJobId('')
      await loadJobAssignments()
      await loadAvailableJobs()
      onUpdate() // Refresh parent data
    } catch (error) {
      console.error('Error assigning job:', error)
      alert('Failed to assign job')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this job assignment?')) return

    try {
      const { error } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId)

      if (error) throw error

      await loadJobAssignments()
      await loadAvailableJobs()
      onUpdate() // Refresh parent data
    } catch (error) {
      console.error('Error removing job assignment:', error)
      alert('Failed to remove job assignment')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Job Assignments</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage which jobs {employee.full_name} can work on
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          disabled={availableJobs.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign Job
        </button>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Assignments</h3>
          <p className="text-gray-500 mb-4">
            {employee.full_name} is not assigned to any jobs yet.
          </p>
          {availableJobs.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign First Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Briefcase className="h-8 w-8 text-indigo-600 mr-3" />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {assignment.job_name}
                    </h4>
                    {assignment.job_address && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {assignment.job_address}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAssignment(assignment.id)}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Remove assignment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Assigned: {formatDate(assignment.assigned_date)}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Total hours: {assignment.total_hours_worked.toFixed(1)}</span>
                </div>

                {assignment.last_worked_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Last worked: {formatDate(assignment.last_worked_date)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Total earnings: ${(assignment.total_hours_worked * employee.pay_rate).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Job Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Job to {employee.full_name}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose a job...</option>
                  {availableJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.name} {job.address && `- ${job.address}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedJobId('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignJob}
                  disabled={!selectedJobId || assigning}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {assigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Assigning...
                    </>
                  ) : (
                    'Assign Job'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Job Assignment Notes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Employees can only clock in to jobs they are assigned to</li>
          <li>• Removing an assignment doesn't delete historical timesheet data</li>
          <li>• Job assignments can be reactivated at any time</li>
          <li>• If no jobs are assigned, the employee can work on any job (if company allows)</li>
        </ul>
      </div>
    </div>
  )
}
