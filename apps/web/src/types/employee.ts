// Employee Detail Types and Interfaces

export interface Employee {
  user_id: string
  full_name: string
  email?: string
  role: 'admin' | 'staff'
  pay_rate: number
  pay_period: string
  type: 'employee' | 'invitation'
  status?: string
  created_at?: string
  last_active?: string
}

export interface EmployeeDetail extends Employee {
  company_id: string
  join_date: string
  is_active: boolean
  total_hours_all_time: number
  total_hours_this_week: number
  total_hours_this_month: number
  assigned_jobs_count: number
  last_clock_in?: string
  last_clock_out?: string
}

export interface TimesheetEntry {
  id: string
  staff_id: string
  job_id: string
  job_name: string
  job_address?: string
  clock_in: string
  clock_out?: string
  duration_hours?: number
  wages?: number
  clock_in_latitude?: number
  clock_in_longitude?: number
  clock_out_latitude?: number
  clock_out_longitude?: number
  created_at: string
}

export interface JobAssignment {
  id: string
  job_id: string
  job_name: string
  job_address?: string
  user_id: string
  company_id: string
  is_active: boolean
  assigned_date: string
  total_hours_worked: number
  last_worked_date?: string
  created_at: string
}

export interface EmployeeStats {
  hours_this_week: number
  hours_this_month: number
  hours_all_time: number
  earnings_this_week: number
  earnings_this_month: number
  earnings_all_time: number
  average_hours_per_day: number
  days_worked_this_month: number
  total_days_this_month: number
  overtime_hours_this_month: number
  on_time_percentage: number
}

export interface ActivityLogEntry {
  id: string
  type: 'clock_in' | 'clock_out' | 'job_assigned' | 'pay_rate_updated' | 'role_changed' | 'location_ping'
  description: string
  timestamp: string
  job_name?: string
  location?: string
  metadata?: Record<string, any>
}

export interface EarningsData {
  period: string
  amount: number
  hours: number
}

export type EmployeeDetailTab = 'overview' | 'compensation' | 'timesheets' | 'jobs' | 'activity' | 'settings'

export interface EmployeeDetailProps {
  employeeId: string
  companyId: string
  onBack: () => void
}

export interface TimesheetFilters {
  dateRange: 'last_7_days' | 'last_30_days' | 'last_3_months' | 'all_time' | 'custom'
  jobId?: string
  startDate?: string
  endDate?: string
}

export interface CompensationUpdate {
  pay_rate: number
  pay_period: string
}

export interface EmployeeUpdate {
  full_name?: string
  role?: 'admin' | 'staff'
  pay_rate?: number
  pay_period?: string
  is_active?: boolean
}
