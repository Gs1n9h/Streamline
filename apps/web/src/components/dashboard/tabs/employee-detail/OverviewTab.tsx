'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, MapPin, Briefcase, TrendingUp } from 'lucide-react'
import { EmployeeDetail, TimesheetEntry } from '@/types/employee'

interface OverviewTabProps {
  employee: EmployeeDetail
  companyId: string
}

export default function OverviewTab({ employee, companyId }: OverviewTabProps) {
  const [recentTimesheets, setRecentTimesheets] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [employee.user_id, companyId])

  const loadRecentActivity = async () => {
    try {
      setLoading(true)
      
      // Get recent timesheets (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: timesheets, error } = await supabase
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
            name,
            address
          )
        `)
        .eq('staff_id', employee.user_id)
        .eq('company_id', companyId)
        .gte('clock_in', sevenDaysAgo.toISOString())
        .order('clock_in', { ascending: false })
        .limit(10)

      if (error) throw error

      const formattedTimesheets: TimesheetEntry[] = timesheets?.map(ts => ({
        id: ts.id,
        staff_id: ts.staff_id,
        job_id: ts.job_id,
        job_name: ts.jobs.name,
        job_address: ts.jobs.address,
        clock_in: ts.clock_in,
        clock_out: ts.clock_out,
        duration_hours: ts.clock_out ? 
          (new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60) : 
          undefined,
        wages: ts.clock_out ? 
          ((new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60)) * employee.pay_rate : 
          undefined,
        clock_in_latitude: ts.clock_in_latitude,
        clock_in_longitude: ts.clock_in_longitude,
        clock_out_latitude: ts.clock_out_latitude,
        clock_out_longitude: ts.clock_out_longitude,
        created_at: ts.created_at
      })) || []

      setRecentTimesheets(formattedTimesheets)
    } catch (error) {
      console.error('Error loading recent activity:', error)
    } finally {
      setLoading(false)
    }
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
      day: 'numeric'
    })
  }

  // Calculate performance metrics
  const calculateMetrics = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    
    const averageHoursPerDay = employee.total_hours_this_month / currentDay
    const onTimePercentage = 95 // This would need to be calculated based on expected start times
    const overtimeHours = Math.max(0, employee.total_hours_this_month - (currentDay * 8))

    return {
      averageHoursPerDay: averageHoursPerDay.toFixed(1),
      onTimePercentage,
      overtimeHours: overtimeHours.toFixed(1),
      daysWorked: recentTimesheets.length,
      totalDaysInMonth: daysInMonth
    }
  }

  const metrics = calculateMetrics()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {employee.total_hours_this_week.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Hours This Week</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {employee.total_hours_this_month.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Hours This Month</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {employee.total_hours_all_time.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center">
            <Briefcase className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {employee.assigned_jobs_count}
              </div>
              <div className="text-sm text-gray-600">Assigned Jobs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary (This Month)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Average Hours/Day</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.averageHoursPerDay}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">On-time Clock-ins</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.onTimePercentage}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Overtime Hours</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.overtimeHours}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Days Worked</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.daysWorked}/{metrics.totalDaysInMonth}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h3>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : recentTimesheets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`h-3 w-3 rounded-full ${
                    timesheet.clock_out ? 'bg-green-400' : 'bg-blue-400'
                  }`} />
                  
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatDate(timesheet.clock_in)} - {timesheet.job_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(timesheet.clock_in)} - {timesheet.clock_out ? formatTime(timesheet.clock_out) : 'In Progress'}
                      {timesheet.job_address && (
                        <>
                          <MapPin className="h-4 w-4 ml-3 mr-1" />
                          {timesheet.job_address}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {timesheet.duration_hours ? `${timesheet.duration_hours.toFixed(1)} hrs` : 'Active'}
                  </div>
                  {timesheet.wages && (
                    <div className="text-sm text-gray-500">
                      ${timesheet.wages.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
