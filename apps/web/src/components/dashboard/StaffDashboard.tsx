'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Clock, LogOut } from 'lucide-react'

interface StaffDashboardProps {
  companyId: string
}

export default function StaffDashboard({ companyId }: StaffDashboardProps) {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Streamline</h1>
              <div className="ml-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Staff Portal
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Staff Dashboard
          </h2>
          <p className="text-gray-600 mb-8">
            For the best experience, please use the mobile app to track your time and view your schedule.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Download the Mobile App
            </h3>
            <p className="text-blue-700 text-sm">
              Use your phone to clock in/out, track location, and view your timesheets on the go.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

