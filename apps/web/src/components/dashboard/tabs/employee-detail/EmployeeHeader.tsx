'use client'

import { ArrowLeft, User, Mail, Calendar, Clock } from 'lucide-react'
import { EmployeeDetail } from '@/types/employee'

interface EmployeeHeaderProps {
  employee: EmployeeDetail
  onBack: () => void
}

export default function EmployeeHeader({ employee, onBack }: EmployeeHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatLastActive = () => {
    if (employee.last_clock_out) {
      return `Last clocked out: ${formatDate(employee.last_clock_out)}`
    } else if (employee.last_clock_in) {
      return `Currently clocked in since: ${formatDate(employee.last_clock_in)}`
    }
    return 'No recent activity'
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Employees
      </button>

      {/* Employee Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {/* Avatar */}
          <div className="flex-shrink-0 h-20 w-20">
            <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-10 w-10 text-indigo-600" />
            </div>
          </div>

          {/* Employee Details */}
          <div className="ml-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">{employee.full_name}</h1>
              <span className={`ml-4 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                employee.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
              </span>
            </div>

            <div className="mt-2 flex items-center text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span>{employee.email}</span>
            </div>

            <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Joined {formatDate(employee.join_date)}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatLastActive()}</span>
              </div>

              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  employee.is_active ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                <span>{employee.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {employee.total_hours_this_week.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Hours This Week</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {employee.total_hours_this_month.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Hours This Month</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {employee.assigned_jobs_count}
            </div>
            <div className="text-sm text-gray-500">Assigned Jobs</div>
          </div>
        </div>
      </div>
    </div>
  )
}
