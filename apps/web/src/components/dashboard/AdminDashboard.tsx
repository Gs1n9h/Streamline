'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Clock, 
  Map, 
  FileText, 
  Building,
  CreditCard,
  Settings,
  LogOut
} from 'lucide-react'
import LiveDashboard from './tabs/LiveDashboard'
import TimesheetPayroll from './tabs/TimesheetPayroll'
import Reports from './tabs/Reports'
import Employees from './tabs/Employees'
import Jobs from './tabs/Jobs'
import BillingDashboard from '../billing/BillingDashboard'
import SettingsTab from './tabs/SettingsTab'

interface AdminDashboardProps {
  companyId: string
  companies: any[]
  onCompanyChange: (companyId: string) => void
}

interface CompanySettings {
  job_tracking_enabled: boolean
}

type AdminTab = 'live-dashboard' | 'timesheet-payroll' | 'reports' | 'employees' | 'jobs' | 'billing' | 'settings'

export default function AdminDashboard({ companyId, companies, onCompanyChange }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('live-dashboard')
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ job_tracking_enabled: true })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const { signOut } = useAuth()

  // Load company settings when companyId changes
  useEffect(() => {
    if (companyId) {
      loadCompanySettings()
    }
  }, [companyId])

  const loadCompanySettings = async () => {
    try {
      setSettingsLoading(true)
      const { data, error } = await supabase
        .schema('streamline')
        .from('companies')
        .select('job_tracking_enabled')
        .eq('id', companyId)
        .single()

      if (error) throw error
      
      setCompanySettings({
        job_tracking_enabled: data?.job_tracking_enabled ?? true
      })

      // If jobs tab is active but job tracking is disabled, switch to live dashboard
      if (activeTab === 'jobs' && !data?.job_tracking_enabled) {
        setActiveTab('live-dashboard')
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
      // Default to enabled if there's an error
      setCompanySettings({ job_tracking_enabled: true })
    } finally {
      setSettingsLoading(false)
    }
  }

  const allTabs = [
    { id: 'live-dashboard', label: 'Live Dashboard', icon: Map },
    { id: 'timesheet-payroll', label: 'Timesheet & Payroll', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'jobs', label: 'Jobs', icon: Building, condition: () => companySettings.job_tracking_enabled },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  // Filter tabs based on conditions
  const tabs = allTabs.filter(tab => !tab.condition || tab.condition())

  const handleSignOut = async () => {
    await signOut()
  }

  const handleTabChange = (tabId: AdminTab) => {
    // Prevent switching to jobs tab if job tracking is disabled
    if (tabId === 'jobs' && !companySettings.job_tracking_enabled) {
      return
    }
    setActiveTab(tabId)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'live-dashboard':
        return <LiveDashboard companyId={companyId} />
      case 'timesheet-payroll':
        return <TimesheetPayroll companyId={companyId} />
      case 'reports':
        return <Reports companyId={companyId} />
      case 'employees':
        return <Employees companyId={companyId} />
      case 'jobs':
        return <Jobs companyId={companyId} />
      case 'billing':
        return <BillingDashboard companyId={companyId} />
      case 'settings':
        return <SettingsTab companyId={companyId} onSettingsUpdate={loadCompanySettings} />
      default:
        return <LiveDashboard companyId={companyId} />
    }
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
                <select
                  value={companyId}
                  onChange={(e) => onCompanyChange(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
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

      {/* Navigation Tabs */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as AdminTab)}
                  className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderTabContent()}
      </main>
    </div>
  )
}

