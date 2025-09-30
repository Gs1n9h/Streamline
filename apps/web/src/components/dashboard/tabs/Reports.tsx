'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Calendar, DollarSign, Clock, Users, Download, RefreshCw, MapPin } from 'lucide-react'

interface DailySummary {
  total_hours: number
  total_cost: number
  staff_count: number
  jobs_worked: string[]
}

interface TimesheetEntry {
  timesheet_id: string
  staff_id: string
  staff_name: string
  job_name: string
  clock_in: string
  clock_out: string | null
  total_hours: number
  pay_rate: number
  total_wage: number
  clock_in_location: string
  clock_out_location: string
}

interface StaffMember {
  staff_id: string
  staff_name: string
  role: string
}

interface ReportsProps {
  companyId: string
}

export default function Reports({ companyId }: ReportsProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [summaryData, setSummaryData] = useState<DailySummary | null>(null)
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_staff', {
        p_company_id: companyId
      })
      if (error) throw error
      setStaffMembers(data || [])
    } catch (err: any) {
      console.error('Error loading staff members:', err.message)
      setError(`Error loading staff: ${err.message}`)
    }
  }

  const fetchDetailedReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('get_detailed_timesheet_report', {
        p_company_id: companyId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_staff_id: selectedStaff || null
      })

      if (error) throw error
      setTimesheetData(data || [])
      
      // Calculate summary from detailed data
      const summary: DailySummary = {
        total_hours: data?.reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0) || 0,
        total_cost: data?.reduce((sum: number, entry: any) => sum + (entry.total_wage || 0), 0) || 0,
        staff_count: new Set(data?.map((entry: any) => entry.staff_id)).size || 0,
        jobs_worked: [...new Set(data?.map((entry: any) => entry.job_name).filter(Boolean))] as string[]
      }
      setSummaryData(summary)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffMembers()
  }, [companyId])

  useEffect(() => {
    if (startDate) {
      fetchDetailedReport()
    }
  }, [startDate, endDate, selectedStaff, companyId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const exportToCSV = () => {
    if (!timesheetData.length) return

    const csvHeaders = [
      'Staff Name', 'Job Name', 'Clock In', 'Clock Out', 'Total Hours', 
      'Pay Rate', 'Total Wage', 'Clock In Location', 'Clock Out Location'
    ]
    
    const csvRows = timesheetData.map(entry => [
      entry.staff_name,
      entry.job_name,
      new Date(entry.clock_in).toLocaleString(),
      entry.clock_out ? new Date(entry.clock_out).toLocaleString() : 'Still clocked in',
      entry.total_hours.toString(),
      `$${entry.pay_rate}`,
      `$${entry.total_wage}`,
      entry.clock_in_location,
      entry.clock_out_location
    ])

    const csvContent = [csvHeaders, ...csvRows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `timesheet-report-${startDate}-to-${endDate}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports</h2>
        <p className="text-gray-600">
          View daily summaries and historical reports
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Report Filters</h3>
          <div className="flex space-x-2">
            <button
              onClick={fetchDetailedReport}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Generate Report
            </button>
            <button
              onClick={exportToCSV}
              disabled={!timesheetData.length || loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
            >
              <option value="">All Staff</option>
              {staffMembers.map((staff) => (
                <option key={staff.staff_id} value={staff.staff_id}>
                  {staff.staff_name} ({staff.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-800">Error loading report: {error}</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Hours
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {(summaryData?.total_hours || 0).toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Cost
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${(summaryData?.total_cost || 0).toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Staff Members
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData?.staff_count || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Jobs Worked
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {summaryData?.jobs_worked?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Timesheet Report */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Detailed Timesheet Report ({formatDate(startDate)} - {formatDate(endDate)})
            </h3>
            
            {timesheetData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staff Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job
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
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Wage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timesheetData.map((entry) => (
                      <tr key={entry.timesheet_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.staff_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.job_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.clock_in).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleString() : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.total_hours.toFixed(2)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${entry.pay_rate}/hr
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${entry.total_wage.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="truncate max-w-xs" title={entry.clock_in_location}>
                              {entry.clock_in_location !== 'Not recorded' ? 'GPS Recorded' : 'Not recorded'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No timesheet data found for the selected criteria</p>
                <p className="text-sm mt-2">
                  Try adjusting your date range or staff filter
                </p>
              </div>
            )}
          </div>

          {/* Historical Reports Placeholder */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Historical Reports
            </h3>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>Historical reports and analytics coming soon</p>
              <p className="text-sm mt-2">
                This section will include weekly/monthly summaries, trends, and exportable reports
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

