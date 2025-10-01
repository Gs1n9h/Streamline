'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, MapPin, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { EmployeeDetail, TimesheetEntry, TimesheetFilters } from '@/types/employee'

interface TimesheetsTabProps {
  employee: EmployeeDetail
  companyId: string
}

export default function TimesheetsTab({ employee, companyId }: TimesheetsTabProps) {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TimesheetFilters>({
    dateRange: 'last_30_days'
  })
  const [jobs, setJobs] = useState<any[]>([])
  const [expandedTimesheet, setExpandedTimesheet] = useState<string | null>(null)
  const [totalHours, setTotalHours] = useState(0)
  const [totalWages, setTotalWages] = useState(0)

  useEffect(() => {
    loadJobs()
    loadTimesheets()
  }, [employee.user_id, companyId, filters])

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .schema('streamline')
        .from('jobs')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_archived', false)

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  const loadTimesheets = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const now = new Date()
      let startDate: Date
      
      switch (filters.dateRange) {
        case 'last_7_days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'last_30_days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'last_3_months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          startDate = filters.startDate ? new Date(filters.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      let query = supabase
        .schema('streamline')
        .from('timesheets')
        .select(`
          id,
          staff_id,
          job_id,
          clock_in,
          clock_out,
          clock_in_latitude,
          clock_in_longitude,
          clock_out_latitude,
          clock_out_longitude,
          created_at,
          jobs!inner (
            id,
            name,
            address
          )
        `)
        .eq('staff_id', employee.user_id)
        .eq('company_id', companyId)
        .gte('clock_in', startDate.toISOString())
        .order('clock_in', { ascending: false })

      // Add job filter if specified
      if (filters.jobId) {
        query = query.eq('job_id', filters.jobId)
      }

      // Add end date filter for custom range
      if (filters.dateRange === 'custom' && filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999) // End of day
        query = query.lte('clock_in', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      const formattedTimesheets: TimesheetEntry[] = data?.map(ts => {
        const duration = ts.clock_out ? 
          (new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60) : 
          undefined
        
        return {
          id: ts.id,
          staff_id: ts.staff_id,
          job_id: ts.job_id,
          job_name: ts.jobs.name,
          job_address: ts.jobs.address,
          clock_in: ts.clock_in,
          clock_out: ts.clock_out,
          duration_hours: duration,
          wages: duration ? duration * employee.pay_rate : undefined,
          clock_in_latitude: ts.clock_in_latitude,
          clock_in_longitude: ts.clock_in_longitude,
          clock_out_latitude: ts.clock_out_latitude,
          clock_out_longitude: ts.clock_out_longitude,
          created_at: ts.created_at
        }
      }) || []

      setTimesheets(formattedTimesheets)
      
      // Calculate totals
      const completedTimesheets = formattedTimesheets.filter(ts => ts.duration_hours)
      const totalHrs = completedTimesheets.reduce((sum, ts) => sum + (ts.duration_hours || 0), 0)
      const totalWgs = completedTimesheets.reduce((sum, ts) => sum + (ts.wages || 0), 0)
      
      setTotalHours(totalHrs)
      setTotalWages(totalWgs)
    } catch (error) {
      console.error('Error loading timesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Job', 'Clock In', 'Clock Out', 'Hours', 'Wages', 'Status'].join(','),
      ...timesheets.map(ts => [
        formatDate(ts.clock_in),
        `"${ts.job_name}"`,
        formatTime(ts.clock_in),
        ts.clock_out ? formatTime(ts.clock_out) : 'In Progress',
        ts.duration_hours ? ts.duration_hours.toFixed(2) : 'N/A',
        ts.wages ? `$${ts.wages.toFixed(2)}` : 'N/A',
        ts.clock_out ? 'Completed' : 'Active'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${employee.full_name}_timesheets_${filters.dateRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const toggleExpanded = (timesheetId: string) => {
    setExpandedTimesheet(expandedTimesheet === timesheetId ? null : timesheetId)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filters.dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job</label>
            <select
              value={filters.jobId || ''}
              onChange={(e) => setFilters({ ...filters, jobId: e.target.value || undefined })}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{timesheets.length}</div>
          <div className="text-sm text-gray-600">Total Entries</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Total Hours</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">${totalWages.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Wages</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {timesheets.filter(ts => !ts.clock_out).length}
          </div>
          <div className="text-sm text-gray-600">Active Shifts</div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Timesheet Entries</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No timesheet entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.map((timesheet) => (
                  <React.Fragment key={timesheet.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(timesheet.clock_in)}
                          </div>
                          <div className="text-sm text-gray-500">{timesheet.job_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(timesheet.clock_in)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {timesheet.clock_out ? formatTime(timesheet.clock_out) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {timesheet.duration_hours ? timesheet.duration_hours.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {timesheet.wages ? `$${timesheet.wages.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          timesheet.clock_out 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {timesheet.clock_out ? 'Completed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleExpanded(timesheet.id)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          {expandedTimesheet === timesheet.id ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              View Details
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedTimesheet === timesheet.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Timesheet Details</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Full Clock In Time:</span>
                                <div className="text-gray-900">{formatDateTime(timesheet.clock_in)}</div>
                              </div>
                              
                              {timesheet.clock_out && (
                                <div>
                                  <span className="font-medium text-gray-700">Full Clock Out Time:</span>
                                  <div className="text-gray-900">{formatDateTime(timesheet.clock_out)}</div>
                                </div>
                              )}
                              
                              {timesheet.job_address && (
                                <div>
                                  <span className="font-medium text-gray-700">Job Location:</span>
                                  <div className="text-gray-900 flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {timesheet.job_address}
                                  </div>
                                </div>
                              )}
                              
                              {(timesheet.clock_in_latitude && timesheet.clock_in_longitude) && (
                                <div>
                                  <span className="font-medium text-gray-700">Clock In GPS:</span>
                                  <div className="text-gray-900">
                                    {timesheet.clock_in_latitude.toFixed(6)}, {timesheet.clock_in_longitude.toFixed(6)}
                                  </div>
                                </div>
                              )}
                              
                              {(timesheet.clock_out_latitude && timesheet.clock_out_longitude) && (
                                <div>
                                  <span className="font-medium text-gray-700">Clock Out GPS:</span>
                                  <div className="text-gray-900">
                                    {timesheet.clock_out_latitude.toFixed(6)}, {timesheet.clock_out_longitude.toFixed(6)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
