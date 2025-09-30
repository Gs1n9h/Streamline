'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { StripeService } from '@/lib/stripe'
import PricingPlans from '@/components/billing/PricingPlans'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function PricingPlansPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    loadCompanyInfo()
  }, [user, router])

  const loadCompanyInfo = async () => {
    try {
      // Get user's company
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user?.id)
        .single()

      if (!membership) return

      setCompanyId(membership.company_id)

      // Get current subscription
      const { data: subscription } = await supabase
        .from('company_subscriptions')
        .select('plan_id')
        .eq('company_id', membership.company_id)
        .single()

      setCurrentPlanId(subscription?.plan_id || null)
    } catch (error) {
      console.error('Error loading company info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelect = async (planId: string) => {
    if (!companyId) return

    setProcessing(true)
    try {
      const { url } = await StripeService.createCheckoutSession(
        companyId,
        planId,
        'monthly' // Default to monthly for now
      )
      
      // Redirect to Stripe checkout
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Unable to process plan selection. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {processing ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h2>
              <p className="text-gray-600">Redirecting to secure checkout</p>
            </div>
          </div>
        ) : (
          <PricingPlans
            companyId={companyId!}
            currentPlanId={currentPlanId || undefined}
            onPlanSelect={handlePlanSelect}
          />
        )}
      </main>
    </div>
  )
}
