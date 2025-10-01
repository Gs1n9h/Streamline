'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Edit, Save, X, TrendingUp } from 'lucide-react'
import { EmployeeDetail, EarningsData } from '@/types/employee'

interface CompensationTabProps {
  employee: EmployeeDetail
  companyId: string
  onUpdate: () => void
}

export default function CompensationTab({ employee, companyId, onUpdate }: CompensationTabProps) {
  const [editing, setEditing] = useState(false)
  const [payRate, setPayRate] = useState(employee.pay_rate.toString())
  const [payPeriod, setPayPeriod] = useState(employee.pay_period)
  const [saving, setSaving] = useState(false)
  const [earningsData, setEarningsData] = useState<EarningsData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEarningsData()
  }, [employee.user_id, companyId])

  const loadEarningsData = async () => {
    try {
      setLoading(true)
      
      // Get earnings for the last 6 months
      const monthsData: EarningsData[] = []
      const now = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const { data: timesheets } = await supabase
          .schema('streamline')
          .from('timesheets')
          .select('clock_in, clock_out')
          .eq('staff_id', employee.user_id)
          .eq('company_id', companyId)
          .gte('clock_in', monthStart.toISOString())
          .lte('clock_in', monthEnd.toISOString())
          .not('clock_out', 'is', null)

        const totalHours = timesheets?.reduce((total, ts) => {
          if (ts.clock_in && ts.clock_out) {
            const hours = (new Date(ts.clock_out).getTime() - new Date(ts.clock_in).getTime()) / (1000 * 60 * 60)
            return total + hours
          }
          return total
        }, 0) || 0

        monthsData.push({
          period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          hours: totalHours,
          amount: totalHours * employee.pay_rate
        })
      }
      
      setEarningsData(monthsData)
    } catch (error) {
      console.error('Error loading earnings data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const { error } = await supabase
        .schema('streamline')
        .from('company_members')
        .update({
          pay_rate: parseFloat(payRate),
          pay_period: payPeriod
        })
        .eq('user_id', employee.user_id)
        .eq('company_id', companyId)

      if (error) throw error

      setEditing(false)
      onUpdate() // Refresh parent data
      
      // Reload earnings data with new pay rate
      await loadEarningsData()
    } catch (error) {
      console.error('Error updating compensation:', error)
      alert('Failed to update compensation')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPayRate(employee.pay_rate.toString())
    setPayPeriod(employee.pay_period)
    setEditing(false)
  }

  // Calculate current period earnings
  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const weeklyEarnings = employee.total_hours_this_week * employee.pay_rate
  const monthlyEarnings = employee.total_hours_this_month * employee.pay_rate
  const yearlyEarnings = employee.total_hours_all_time * employee.pay_rate

  return (
    <div className="space-y-6">
      {/* Compensation Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Compensation Details</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pay Rate
            </label>
            {editing ? (
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="number"
                  step="0.01"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="ml-2 text-gray-500">/hour</span>
              </div>
            ) : (
              <div className="flex items-center text-lg font-semibold text-gray-900">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                {employee.pay_rate.toFixed(2)} /hour
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pay Period
            </label>
            {editing ? (
              <select
                value={payPeriod}
                onChange={(e) => setPayPeriod(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
            ) : (
              <div className="text-lg font-semibold text-gray-900 capitalize">
                {employee.pay_period}
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                ${weeklyEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                ${monthlyEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                ${yearlyEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">All Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Earnings History (Last 6 Months)</h3>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {earningsData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{data.period}</div>
                  <div className="text-sm text-gray-500">{data.hours.toFixed(1)} hours worked</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    ${data.amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    ${employee.pay_rate.toFixed(2)}/hr
                  </div>
                </div>
              </div>
            ))}
            
            {earningsData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No earnings data available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Compensation Notes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Pay rate changes take effect immediately for new time entries</li>
          <li>• Historical earnings are calculated using the pay rate at the time of work</li>
          <li>• Overtime calculations follow company policy (typically 1.5x after 40 hours/week)</li>
          <li>• All amounts shown are gross earnings before taxes and deductions</li>
        </ul>
      </div>
    </div>
  )
}
