'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Clock, MapPin, Briefcase, DollarSign, Calendar } from 'lucide-react'
import { EmployeeDetail, ActivityLogEntry } from '@/types/employee'

interface ActivityTabProps {
  employee: EmployeeDetail
  companyId: string
}

export default function ActivityTab({ employee, companyId }: ActivityTabProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'clock_events' | 'assignments' | 'changes'>('all')

  useEffect(() => {
    loadActivityLog()
  }, [employee.user_id, companyId, filter])

  const loadActivityLog = async () => {
    try {
      setLoading(true)
      const activityEntries: ActivityLogEntry[] = []

      // Load timesheet events (clock in/out)
      if (filter === 'all' || filter === 'clock_events') {
        const { data: timesheets } = await supabase
          .schema('streamline')
          .from('timesheets')
          .select(`
            id,
            clock_in,
            clock_out,
            jobs!inner (
              name,
              address
            )
          `)
          .eq('staff_id', employee.user_id)
          .eq('company_id', companyId)
          .order('clock_in', { ascending: false })
          .limit(50)

        timesheets?.forEach(ts => {
          // Clock in event
          activityEntries.push({
            id: `clock_in_${ts.id}`,
            type: 'clock_in',
            description: `Clocked in at ${ts.jobs.name}`,
            timestamp: ts.clock_in,
            job_name: ts.jobs.name,
            location: ts.jobs.address,
            metadata: { timesheet_id: ts.id }
          })

          // Clock out event (if exists)
          if (ts.clock_out) {
            const duration = (new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60)
            activityEntries.push({
              id: `clock_out_${ts.id}`,
              type: 'clock_out',
              description: `Clocked out from ${ts.jobs.name} (${duration.toFixed(1)} hours)`,
              timestamp: ts.clock_out,
              job_name: ts.jobs.name,
              location: ts.jobs.address,
              metadata: { timesheet_id: ts.id, duration_hours: duration }
            })
          }
        })
      }

      // Load job assignment events
      if (filter === 'all' || filter === 'assignments') {
        const { data: assignments } = await supabase
          .schema('streamline')
          .from('job_assignments')
          .select(`
            id,
            created_at,
            is_active,
            jobs!inner (
              name
            )
          `)
          .eq('user_id', employee.user_id)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(20)

        assignments?.forEach(assignment => {
          activityEntries.push({
            id: `job_assigned_${assignment.id}`,
            type: 'job_assigned',
            description: assignment.is_active 
              ? `Assigned to job: ${assignment.jobs.name}`
              : `Removed from job: ${assignment.jobs.name}`,
            timestamp: assignment.created_at,
            job_name: assignment.jobs.name,
            metadata: { assignment_id: assignment.id, is_active: assignment.is_active }
          })
        })
      }

      // Sort all activities by timestamp (most recent first)
      activityEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setActivities(activityEntries)
    } catch (error) {
      console.error('Error loading activity log:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getActivityIcon = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'clock_in':
        return <Clock className="h-5 w-5 text-green-600" />
      case 'clock_out':
        return <Clock className="h-5 w-5 text-red-600" />
      case 'job_assigned':
        return <Briefcase className="h-5 w-5 text-blue-600" />
      case 'pay_rate_updated':
        return <DollarSign className="h-5 w-5 text-purple-600" />
      case 'role_changed':
        return <Activity className="h-5 w-5 text-orange-600" />
      case 'location_ping':
        return <MapPin className="h-5 w-5 text-gray-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getActivityColor = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'clock_in':
        return 'border-green-200 bg-green-50'
      case 'clock_out':
        return 'border-red-200 bg-red-50'
      case 'job_assigned':
        return 'border-blue-200 bg-blue-50'
      case 'pay_rate_updated':
        return 'border-purple-200 bg-purple-50'
      case 'role_changed':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const groupActivitiesByDate = (activities: ActivityLogEntry[]) => {
    const groups: { [key: string]: ActivityLogEntry[] } = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    
    return groups
  }

  const activityGroups = groupActivitiesByDate(activities)

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="all">All Activity</option>
          <option value="clock_events">Clock In/Out</option>
          <option value="assignments">Job Assignments</option>
          <option value="changes">Profile Changes</option>
        </select>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Found</h3>
          <p className="text-gray-500">
            No activity records found for the selected filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity History</h3>
          
          <div className="space-y-8">
            {Object.entries(activityGroups).map(([date, dayActivities]) => (
              <div key={date}>
                <div className="flex items-center mb-4">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                  <div className="flex-1 ml-4 border-t border-gray-200"></div>
                </div>
                
                <div className="space-y-3 ml-6">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start p-4 rounded-lg border ${getActivityColor(activity.type)}`}
                    >
                      <div className="flex-shrink-0 mr-3">
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(activity.timestamp)}
                          </p>
                        </div>
                        
                        {(activity.location || activity.job_name) && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            {activity.location && (
                              <div className="flex items-center mr-4">
                                <MapPin className="h-3 w-3 mr-1" />
                                {activity.location}
                              </div>
                            )}
                            {activity.metadata?.duration_hours && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {activity.metadata.duration_hours.toFixed(1)} hours
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {activities.length >= 50 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Showing the most recent 50 activities. Use filters to see specific types of events.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {activities.filter(a => a.type === 'clock_in').length}
          </div>
          <div className="text-sm text-gray-600">Clock Ins</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {activities.filter(a => a.type === 'clock_out').length}
          </div>
          <div className="text-sm text-gray-600">Clock Outs</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {activities.filter(a => a.type === 'job_assigned').length}
          </div>
          <div className="text-sm text-gray-600">Job Changes</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(activities.map(a => new Date(a.timestamp).toDateString())).size}
          </div>
          <div className="text-sm text-gray-600">Active Days</div>
        </div>
      </div>
    </div>
  )
}
