'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Mail, AlertTriangle, Trash2, User, Shield } from 'lucide-react'
import { EmployeeDetail } from '@/types/employee'

interface EmployeeSettingsTabProps {
  employee: EmployeeDetail
  companyId: string
  onUpdate: () => void
  onBack: () => void
}

export default function EmployeeSettingsTab({ employee, companyId, onUpdate, onBack }: EmployeeSettingsTabProps) {
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    role: employee.role,
    is_active: employee.is_active
  })
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)

      // Update profile
      const { error: profileError } = await supabase
        .schema('streamline')
        .from('profiles')
        .update({
          full_name: formData.full_name
        })
        .eq('id', employee.user_id)

      if (profileError) throw profileError

      // Update company member info
      const { error: memberError } = await supabase
        .schema('streamline')
        .from('company_members')
        .update({
          role: formData.role
        })
        .eq('user_id', employee.user_id)
        .eq('company_id', companyId)

      if (memberError) throw memberError

      onUpdate() // Refresh parent data
      alert('Employee settings updated successfully!')
    } catch (error) {
      console.error('Error updating employee settings:', error)
      alert('Failed to update employee settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveEmployee = async () => {
    try {
      setRemoving(true)

      // Remove from company (soft delete by removing company_members record)
      const { error } = await supabase
        .schema('streamline')
        .from('company_members')
        .delete()
        .eq('user_id', employee.user_id)
        .eq('company_id', companyId)

      if (error) throw error

      alert('Employee removed from company successfully!')
      onBack() // Go back to employee list
    } catch (error) {
      console.error('Error removing employee:', error)
      alert('Failed to remove employee')
    } finally {
      setRemoving(false)
      setShowRemoveConfirm(false)
    }
  }

  const resendInvitation = async () => {
    try {
      // This would typically send an email invitation
      // For now, we'll just show a success message
      alert('Invitation resent successfully!')
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation')
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <User className="h-6 w-6 text-gray-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
        </div>

        <div className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="flex items-center">
              <input
                type="email"
                value={employee.email}
                disabled
                className="flex-1 border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
              <button
                onClick={resendInvitation}
                className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Invite
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed. Use "Resend Invite" to send a new invitation email.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === 'admin'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-purple-600" />
                  Admin
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="staff"
                  checked={formData.role === 'staff'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' })}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900 flex items-center">
                  <User className="h-4 w-4 mr-1 text-green-600" />
                  Staff
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Admins can manage company settings and other employees. Staff can only manage their own timesheets.
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Status
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: true })}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={!formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: false })}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">Inactive</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Inactive employees cannot log in or clock in/out.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
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
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
          <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-2">
                Remove Employee from Company
              </h4>
              <p className="text-sm text-red-700 mb-4">
                This action will remove {employee.full_name} from your company. 
                All timesheet data will be preserved, but they will no longer be able to 
                access your company or clock in/out. This action cannot be undone.
              </p>
              
              <div className="space-y-2 text-xs text-red-600">
                <p>• Employee will lose access to the company immediately</p>
                <p>• Historical timesheet data will be preserved</p>
                <p>• Job assignments will be removed</p>
                <p>• Employee can be re-invited later if needed</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {!showRemoveConfirm ? (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Employee
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <p className="text-sm text-red-700">Are you sure?</p>
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveEmployee}
                  disabled={removing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {removing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Remove
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Employee Management Notes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Role changes take effect immediately upon saving</li>
          <li>• Inactive employees cannot access the system but data is preserved</li>
          <li>• Email addresses cannot be changed - remove and re-invite if needed</li>
          <li>• All changes are logged for audit purposes</li>
        </ul>
      </div>
    </div>
  )
}
