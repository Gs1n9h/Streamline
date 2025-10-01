'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import StaffDashboard from '@/components/dashboard/StaffDashboard'
import { CheckCircle, Users, Building2, Clock } from 'lucide-react'

interface CompanyMember {
  role: 'admin' | 'staff'
  company_id: string
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null)
  const [currentCompany, setCurrentCompany] = useState<string | null>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }

    if (user) {
      loadUserCompanies()
      
      // Check if this is a welcome redirect
      if (searchParams.get('welcome') === 'true') {
        setShowWelcome(true)
        // Clear the welcome parameter from URL to prevent showing on refresh
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('welcome')
        window.history.replaceState({}, '', newUrl.toString())
      }
    }
  }, [user, loading, router, searchParams])

  const loadUserCompanies = async () => {
    try {
      const { data: memberships } = await supabase
        .from('company_members')
        .select(`
          role,
          company_id,
          companies!inner (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)

      if (memberships && memberships.length > 0) {
        setCompanies(memberships.map(m => m.companies))
        
        // For now, use the first company (in a real app, you'd have company selection)
        const firstMembership = memberships[0]
        setCurrentCompany(firstMembership.company_id)
        setUserRole(firstMembership.role)
      }
    } catch (error) {
      console.error('Error loading user companies:', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  if (loading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Companies Found</h1>
          <p className="text-gray-600">You are not a member of any companies yet.</p>
        </div>
      </div>
    )
  }

  const WelcomeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Streamline!
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Your 14-day free trial has started. Let's get you set up for success.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <Building2 className="mx-auto h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Company Setup</h3>
              <p className="text-sm text-gray-600">Complete your company profile</p>
            </div>
            <div className="text-center">
              <Users className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Invite Team</h3>
              <p className="text-sm text-gray-600">Add your employees</p>
            </div>
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Start Tracking</h3>
              <p className="text-sm text-gray-600">Begin time tracking</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowWelcome(false)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Explore Dashboard
            </button>
            <button
              onClick={() => {
                setShowWelcome(false)
                // Navigate to billing or help
                window.open('/billing/plans', '_blank')
              }}
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50"
            >
              View Pricing Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {showWelcome && <WelcomeModal />}
      {userRole === 'admin' ? (
        <AdminDashboard 
          companyId={currentCompany!}
          companies={companies}
          onCompanyChange={setCurrentCompany}
        />
      ) : (
        <StaffDashboard 
          companyId={currentCompany!}
        />
      )}
    </div>
  )
}

