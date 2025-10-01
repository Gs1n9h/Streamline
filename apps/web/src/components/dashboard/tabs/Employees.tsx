'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { User, Edit, Save, X, DollarSign, UserPlus, Mail } from 'lucide-react'
import EmployeeDetail from './employee-detail/EmployeeDetail'
import { Employee } from '@/types/employee'

// Employee interface moved to types/employee.ts

interface EmployeesProps {
  companyId: string
}

export default function Employees({ companyId }: EmployeesProps) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editPayRate, setEditPayRate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'staff' as 'admin' | 'staff',
    payRate: '',
    payPeriod: 'hourly'
  })
  const [inviting, setInviting] = useState(false)

  // Navigation handlers
  const handleEmployeeClick = (employeeId: string, employeeType: string) => {
    // Only allow navigation for actual employees, not invitations
    if (employeeType === 'employee') {
      setSelectedEmployeeId(employeeId)
      setViewMode('detail')
    }
  }

  const handleBackToList = () => {
    setSelectedEmployeeId(null)
    setViewMode('list')
  }

  const fetchEmployees = async () => {
    try {
      // Fetch existing employees
      const { data: employeesData, error: employeesError } = await supabase
        .schema('streamline')
        .from('company_members')
        .select(`
          user_id,
          role,
          pay_rate,
          pay_period,
          profiles!inner(
            full_name
          )
        `)
        .eq('company_id', companyId)

      if (employeesError) throw employeesError

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .schema('streamline')
        .from('employee_invitations')
        .select(`
          id,
          email,
          full_name,
          role,
          pay_rate,
          pay_period,
          status
        `)
        .eq('company_id', companyId)
        .eq('status', 'pending')

      if (invitationsError) throw invitationsError

      // Format existing employees
      const formattedEmployees = employeesData?.map(emp => ({
        user_id: emp.user_id,
        full_name: emp.profiles.full_name,
        role: emp.role,
        pay_rate: emp.pay_rate,
        pay_period: emp.pay_period,
        type: 'employee' as const,
        status: 'active' as const // All existing employees are active
      })) || []

      // Format pending invitations
      const formattedInvitations = invitationsData?.map(inv => ({
        user_id: inv.id, // Use invitation ID as temporary user_id
        full_name: inv.full_name,
        role: inv.role,
        pay_rate: inv.pay_rate,
        pay_period: inv.pay_period,
        type: 'invitation' as const,
        status: inv.status,
        email: inv.email
      })) || []

      // Combine employees and invitations
      const allEmployees = [...formattedEmployees, ...formattedInvitations]
      
      // Apply filter
      let filteredEmployees = allEmployees
      switch (filter) {
        case 'active':
          filteredEmployees = allEmployees.filter(emp => emp.type === 'employee')
          break
        case 'inactive':
          // For now, we don't have inactive employees, but this is where they would be filtered
          filteredEmployees = allEmployees.filter(emp => emp.status === 'inactive')
          break
        case 'pending':
          filteredEmployees = allEmployees.filter(emp => emp.type === 'invitation')
          break
        case 'all':
        default:
          filteredEmployees = allEmployees
          break
      }
      
      setEmployees(filteredEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId && filter) {
      fetchEmployees()
    }
  }, [companyId, filter])

  const startEdit = (employee: Employee) => {
    if (employee.type === 'invitation') {
      return // Don't allow editing invitations
    }
    setEditingEmployee(employee.user_id)
    setEditPayRate(employee.pay_rate.toString())
  }

  const cancelEdit = () => {
    setEditingEmployee(null)
    setEditPayRate('')
  }

  const savePayRate = async (userId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .schema('streamline')
        .from('company_members')
        .update({ pay_rate: parseFloat(editPayRate) })
        .eq('user_id', userId)
        .eq('company_id', companyId)

      if (error) throw error

      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.user_id === userId 
          ? { ...emp, pay_rate: parseFloat(editPayRate) }
          : emp
      ))

      setEditingEmployee(null)
      setEditPayRate('')
    } catch (error) {
      console.error('Error updating pay rate:', error)
      alert('Failed to update pay rate')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteEmployee = async () => {
    if (!inviteForm.email || !inviteForm.fullName || !inviteForm.payRate) {
      alert('Please fill in all required fields')
      return
    }

    if (!user?.id) {
      return
    }

    setInviting(true)
    try {
      // Create employee invitation
      const { data: inviteData, error: inviteError } = await supabase
        .schema('streamline')
        .from('employee_invitations')
        .insert({
          company_id: companyId,
          email: inviteForm.email,
          full_name: inviteForm.fullName,
          role: inviteForm.role,
          pay_rate: parseFloat(inviteForm.payRate),
          pay_period: inviteForm.payPeriod,
          status: 'pending',
          invited_by: user.id
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      alert('Employee invitation sent successfully!')
      
      // Reset form
      setInviteForm({
        email: '',
        fullName: '',
        role: 'staff',
        payRate: '',
        payPeriod: 'hourly'
      })
      setShowInviteForm(false)
      
      // Refresh employee list
      fetchEmployees()
      
    } catch (error) {
      console.error('Error inviting employee:', error)
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
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
      {/* Show employee list only when not in detail view */}
      {viewMode === 'list' && (
        <>
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
            <p className="text-gray-600 mt-1">
              Manage your team members and their pay rates
            </p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Employee
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Team Members ({employees.length})
            </h3>
            
            {/* Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive' | 'pending')}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="all">All Members</option>
                <option value="active">Active Employees</option>
                <option value="inactive">Inactive Employees</option>
                <option value="pending">Pending Invitations</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr 
                    key={employee.user_id} 
                    className={`${employee.type === 'invitation' ? 'bg-yellow-50' : ''} ${
                      employee.type === 'employee' ? 'hover:bg-gray-50 cursor-pointer' : ''
                    }`}
                    onClick={() => handleEmployeeClick(employee.user_id, employee.type)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            employee.type === 'invitation' 
                              ? 'bg-yellow-100' 
                              : 'bg-indigo-100'
                          }`}>
                            {employee.type === 'invitation' ? (
                              <Mail className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <User className="h-5 w-5 text-indigo-600" />
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.full_name}
                            {employee.type === 'invitation' && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.email && `${employee.email} • `}{employee.pay_period}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingEmployee === employee.user_id ? (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={editPayRate}
                            onChange={(e) => setEditPayRate(e.target.value)}
                            className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                          {employee.pay_rate.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {employee.type === 'invitation' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600 text-xs">
                            Awaiting response
                          </span>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this invitation?')) {
                                // TODO: Implement cancel invitation
                                console.log('Cancel invitation:', employee.user_id)
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : editingEmployee === employee.user_id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => savePayRate(employee.user_id)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(employee)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Employee Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite New Employee</h3>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleInviteEmployee(); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="employee@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.fullName}
                      onChange={(e) => setInviteForm({...inviteForm, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({...inviteForm, role: e.target.value as 'admin' | 'staff'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Rate *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={inviteForm.payRate}
                        onChange={(e) => setInviteForm({...inviteForm, payRate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="15.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Period
                      </label>
                      <select
                        value={inviteForm.payPeriod}
                        onChange={(e) => setInviteForm({...inviteForm, payPeriod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {inviting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Conditional rendering based on view mode */}
      {viewMode === 'detail' && selectedEmployeeId && (
        <EmployeeDetail
          employeeId={selectedEmployeeId}
          companyId={companyId}
          onBack={handleBackToList}
        />
      )}
    </div>
  )
}

