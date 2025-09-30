'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StripeService } from '@/lib/stripe'
import { CreditCard, Calendar, Users, Building, AlertCircle, CheckCircle } from 'lucide-react'

interface SubscriptionInfo {
  plan_name: string
  plan_description: string
  status: string
  max_employees: number
  max_jobs: number
  current_employees: number
  current_jobs: number
  features: any
  current_period_end: string
  trial_end: string | null
}

interface BillingDashboardProps {
  companyId: string
}

export default function BillingDashboard({ companyId }: BillingDashboardProps) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_subscription', {
        p_company_id: companyId
      })

      if (error) throw error
      setSubscription(data?.[0] || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [companyId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'trialing': return 'text-blue-600 bg-blue-100'
      case 'past_due': return 'text-red-600 bg-red-100'
      case 'canceled': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'trialing': return <Calendar className="h-4 w-4" />
      case 'past_due': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleManageBilling = async () => {
    try {
      const { url } = await StripeService.createPortalSession(companyId)
      window.location.href = url
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert('Unable to open billing portal. Please try again.')
    }
  }

  const isUnlimited = (value: number) => value === -1

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error loading subscription: {error}</div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No subscription found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
            {getStatusIcon(subscription.status)}
            <span className="ml-2 capitalize">{subscription.status}</span>
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{subscription.plan_name}</h3>
            <p className="text-gray-600 mt-1">{subscription.plan_description}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Billing Period:</span>
              <span className="font-medium">
                {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}
              </span>
            </div>
            {subscription.trial_end && subscription.status === 'trialing' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Trial Ends:</span>
                <span className="font-medium text-blue-600">
                  {formatDate(subscription.trial_end)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Current:</span>
              <span className="font-medium">{subscription.current_employees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Limit:</span>
              <span className="font-medium">
                {isUnlimited(subscription.max_employees) ? 'Unlimited' : subscription.max_employees}
              </span>
            </div>
            
            {/* Progress bar */}
            {!isUnlimited(subscription.max_employees) && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((subscription.current_employees / subscription.max_employees) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {subscription.current_employees} of {subscription.max_employees} employees
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Building className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Jobs</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Current:</span>
              <span className="font-medium">{subscription.current_jobs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Limit:</span>
              <span className="font-medium">
                {isUnlimited(subscription.max_jobs) ? 'Unlimited' : subscription.max_jobs}
              </span>
            </div>
            
            {/* Progress bar */}
            {!isUnlimited(subscription.max_jobs) && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((subscription.current_jobs / subscription.max_jobs) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {subscription.current_jobs} of {subscription.max_jobs} jobs
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Features */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(subscription.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center">
              <div className={`h-4 w-4 rounded-full mr-3 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Plan Management</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleManageBilling}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Billing
          </button>
          <button 
            onClick={() => window.location.href = '/billing/plans'}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Change Plan
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            View Invoices
          </button>
        </div>
      </div>
    </div>
  )
}
