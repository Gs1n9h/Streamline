'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Check, Star, ArrowRight } from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_employees: number
  max_jobs: number
  features: any
  sort_order: number
}

interface PricingPlansProps {
  companyId: string
  currentPlanId?: string
  onPlanSelect?: (planId: string) => void
}

export default function PricingPlans({ companyId, currentPlanId, onPlanSelect }: PricingPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    if (onPlanSelect) {
      onPlanSelect(planId)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getSavingsPercentage = (monthly: number, yearly: number) => {
    const monthlyTotal = monthly * 12
    const savings = ((monthlyTotal - yearly) / monthlyTotal) * 100
    return Math.round(savings)
  }

  const isUnlimited = (value: number) => value === -1

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-600 mb-8">
          Select the perfect plan for your team size and needs
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-8">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="mx-3 relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Yearly
          </span>
          {billingCycle === 'yearly' && (
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Save up to 17%
            </span>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isPopular = plan.name === 'Professional'
          const isCurrentPlan = plan.id === currentPlanId
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
          const monthlyPrice = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 p-8 ${
                isPopular ? 'ring-2 ring-indigo-500' : ''
              } ${isCurrentPlan ? 'bg-indigo-50' : ''}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-indigo-500 px-3 py-1 text-sm font-medium text-white">
                    <Star className="h-4 w-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white">
                    <Check className="h-4 w-4 mr-1" />
                    Current Plan
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(monthlyPrice)}
                  </span>
                  <span className="text-gray-500">/month</span>
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-green-600 mt-1">
                      Billed annually ({formatPrice(price)})
                    </div>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="mb-8 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Employees</span>
                  <span className="font-semibold">
                    {isUnlimited(plan.max_employees) ? 'Unlimited' : plan.max_employees}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Jobs</span>
                  <span className="font-semibold">
                    {isUnlimited(plan.max_jobs) ? 'Unlimited' : plan.max_jobs}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Features included:</h4>
                <ul className="space-y-3">
                  {Object.entries(plan.features).map(([feature, enabled]) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isCurrentPlan}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : isPopular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  <>
                    Select Plan
                    <ArrowRight className="inline-block h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
        <p className="text-sm text-gray-500">
          Need a custom plan for your enterprise?{' '}
          <a href="mailto:sales@streamline.app" className="text-indigo-600 hover:text-indigo-500">
            Contact our sales team
          </a>
        </p>
      </div>
    </div>
  )
}
