import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()

    // Get company subscription
    const { data: subscription, error } = await supabaseAdmin
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // For now, return a mock portal session
    // In production, you would create a Stripe Customer Portal session here
    const mockPortalSession = {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/portal?customer=${subscription.stripe_customer_id || 'mock_customer'}`,
    }

    return NextResponse.json(mockPortalSession)
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
