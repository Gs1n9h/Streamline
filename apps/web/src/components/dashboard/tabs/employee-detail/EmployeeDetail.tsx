'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  ArrowLeft, 
  User, 
  Edit, 
  Trash2, 
  Mail, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Activity, 
  Settings 
} from 'lucide-react'
import { EmployeeDetail as EmployeeDetailType, EmployeeDetailTab, EmployeeDetailProps } from '@/types/employee'
import EmployeeHeader from './EmployeeHeader'
import OverviewTab from './OverviewTab'
import CompensationTab from './CompensationTab'
import TimesheetsTab from './TimesheetsTab'
import JobAssignmentsTab from './JobAssignmentsTab'
import ActivityTab from './ActivityTab'
import EmployeeSettingsTab from './EmployeeSettingsTab'

export default function EmployeeDetail({ employeeId, companyId, onBack }: EmployeeDetailProps) {
  const { user } = useAuth()
  const [employee, setEmployee] = useState<EmployeeDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EmployeeDetailTab>('overview')
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'compensation', label: 'Compensation', icon: DollarSign },
    { id: 'timesheets', label: 'Timesheets', icon: Clock },
    { id: 'jobs', label: 'Job Assignments', icon: Briefcase },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  useEffect(() => {
    if (employeeId && companyId) {
      loadEmployeeDetail()
    }
  }, [employeeId, companyId])

  const loadEmployeeDetail = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch employee basic info
      const { data: employeeData, error: employeeError } = await supabase
        .schema('streamline')
        .from('company_members')
        .select(`
          user_id,
          company_id,
          role,
          pay_rate,
          pay_period,
          created_at,
          profiles!inner (
            id,
            full_name
          )
        `)
        .eq('user_id', employeeId)
        .eq('company_id', companyId)
        .single()

      if (employeeError) throw employeeError

      // Get email from auth.users (we'll use a simpler approach since admin API might not be available)
      // For now, we'll leave email empty and can enhance this later
      let userEmail = ''
      try {
        // Try to get email if available, but don't fail if not accessible
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(employeeId)
        userEmail = authUser?.email || ''
      } catch (error) {
        console.log('Could not fetch user email:', error)
        // This is expected in client-side code, we'll handle it gracefully
      }
      
      // Calculate stats (we'll use basic queries for now, can optimize later)
      const now = new Date()
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get total hours this week
      const { data: weekHours } = await supabase
        .schema('streamline')
        .from('timesheets')
        .select('clock_in, clock_out')
        .eq('staff_id', employeeId)
        .eq('company_id', companyId)
        .gte('clock_in', startOfWeek.toISOString())
        .not('clock_out', 'is', null)

      // Get total hours this month
      const { data: monthHours } = await supabase
        .schema('streamline')
        .from('timesheets')
        .select('clock_in, clock_out')
        .eq('staff_id', employeeId)
        .eq('company_id', companyId)
        .gte('clock_in', startOfMonth.toISOString())
        .not('clock_out', 'is', null)

      // Get total hours all time
      const { data: allTimeHours } = await supabase
        .schema('streamline')
        .from('timesheets')
        .select('clock_in, clock_out')
        .eq('staff_id', employeeId)
        .eq('company_id', companyId)
        .not('clock_out', 'is', null)

      // Get job assignments count
      const { data: jobAssignments } = await supabase
        .schema('streamline')
        .from('job_assignments')
        .select('id')
        .eq('user_id', employeeId)
        .eq('company_id', companyId)
        .eq('is_active', true)

      // Calculate hours
      const calculateTotalHours = (timesheets: any[]) => {
        return timesheets?.reduce((total, timesheet) => {
          if (timesheet.clock_in && timesheet.clock_out) {
            const clockIn = new Date(timesheet.clock_in)
            const clockOut = new Date(timesheet.clock_out)
            const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
            return total + hours
          }
          return total
        }, 0) || 0
      }

      // Get last activity
      const { data: lastTimesheet } = await supabase
        .schema('streamline')
        .from('timesheets')
        .select('clock_in, clock_out')
        .eq('staff_id', employeeId)
        .eq('company_id', companyId)
        .order('clock_in', { ascending: false })
        .limit(1)

      const employeeDetail: EmployeeDetailType = {
        user_id: employeeData.user_id,
        full_name: employeeData.profiles.full_name || 'Unknown',
        email: userEmail,
        role: employeeData.role,
        pay_rate: employeeData.pay_rate,
        pay_period: employeeData.pay_period,
        type: 'employee',
        company_id: employeeData.company_id,
        join_date: employeeData.created_at,
        is_active: true, // We can add this field later
        total_hours_this_week: calculateTotalHours(weekHours || []),
        total_hours_this_month: calculateTotalHours(monthHours || []),
        total_hours_all_time: calculateTotalHours(allTimeHours || []),
        assigned_jobs_count: jobAssignments?.length || 0,
        last_clock_in: lastTimesheet?.[0]?.clock_in,
        last_clock_out: lastTimesheet?.[0]?.clock_out,
      }

      setEmployee(employeeDetail)
    } catch (error) {
      console.error('Error loading employee detail:', error)
      setError('Failed to load employee details')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeUpdate = () => {
    // Refresh employee data after updates
    loadEmployeeDetail()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <User className="h-16 w-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Error Loading Employee</h3>
          <p className="text-sm text-gray-500 mt-2">{error || 'Employee not found'}</p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </button>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab employee={employee} companyId={companyId} />
      case 'compensation':
        return <CompensationTab employee={employee} companyId={companyId} onUpdate={handleEmployeeUpdate} />
      case 'timesheets':
        return <TimesheetsTab employee={employee} companyId={companyId} />
      case 'jobs':
        return <JobAssignmentsTab employee={employee} companyId={companyId} onUpdate={handleEmployeeUpdate} />
      case 'activity':
        return <ActivityTab employee={employee} companyId={companyId} />
      case 'settings':
        return <EmployeeSettingsTab employee={employee} companyId={companyId} onUpdate={handleEmployeeUpdate} onBack={onBack} />
      default:
        return <OverviewTab employee={employee} companyId={companyId} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee Header */}
      <EmployeeHeader employee={employee} onBack={onBack} />

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EmployeeDetailTab)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
