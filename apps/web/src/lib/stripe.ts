import { StripeCheckoutSession } from '@streamline/shared-types'

export class StripeService {
  private static baseUrl = '/api/stripe'

  static async createCheckoutSession(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<StripeCheckoutSession> {
    const response = await fetch(`${this.baseUrl}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        planId,
        billingCycle,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    return response.json()
  }

  static async createPortalSession(companyId: string): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create portal session')
    }

    return response.json()
  }

  static async getCustomer(companyId: string) {
    const response = await fetch(`${this.baseUrl}/customer/${companyId}`)
    
    if (!response.ok) {
      throw new Error('Failed to get customer')
    }

    return response.json()
  }
}
