import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { companyId, planId, billingCycle } = await request.json()

    // Get plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get company details
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get current subscription
    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single()

    // For now, return a mock checkout session
    // In production, you would integrate with Stripe here
    const mockCheckoutSession = {
      id: `cs_test_${Date.now()}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id=cs_test_${Date.now()}`,
    }

    // Store the pending subscription update
    if (subscription) {
      await supabaseAdmin
        .from('company_subscriptions')
        .update({
          plan_id: planId,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
    } else {
      await supabaseAdmin
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: planId,
          status: 'incomplete',
        })
    }

    return NextResponse.json(mockCheckoutSession)
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
