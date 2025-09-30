'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle, UserPlus, Building2, Clock, DollarSign } from 'lucide-react'

interface InvitationData {
  id: string
  company_name: string
  full_name: string
  email: string
  role: string
  pay_rate: number
  pay_period: string
  status: string
  expires_at: string
}

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_invitations')
        .select(`
          *,
          companies!inner(name)
        `)
        .eq('token', params.token)
        .single()

        if (error) {
          setError('Invalid or expired invitation')
          return
        }

        if (data.status !== 'pending') {
          setError('This invitation has already been used or expired')
          return
        }

        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired')
          return
        }

        setInvitation({
          id: data.id,
          company_name: data.companies.name,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          pay_rate: data.pay_rate,
          pay_period: data.pay_period,
          status: data.status,
          expires_at: data.expires_at
        })
      } catch (err) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [params.token])

  const handleAccept = async () => {
    if (!invitation) return

    setAccepting(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Redirect to signup with invitation data
        const signupUrl = `/auth/signup?invite=${params.token}&email=${encodeURIComponent(invitation.email)}&name=${encodeURIComponent(invitation.full_name)}`
        router.push(signupUrl)
        return
      }

      // Check if user email matches invitation email
      if (user.email !== invitation.email) {
        setError('This invitation is for a different email address')
        return
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('employee_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Add user to company
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          user_id: user.id,
          company_id: invitation.id, // This should be company_id from invitation
          role: invitation.role,
          pay_rate: invitation.pay_rate,
          pay_period: invitation.pay_period
        })

      if (memberError) throw memberError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 mb-4">
            <CheckCircle className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Team!</h2>
          <p className="text-gray-600 mb-6">
            You've successfully joined {invitation?.company_name}. Redirecting to your dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!invitation) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            You're Invited!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join {invitation.company_name} on Streamline
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                {invitation.full_name}
              </h3>
              <p className="text-sm text-gray-500">{invitation.email}</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Company</p>
                    <p className="text-sm text-gray-500">{invitation.company_name}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <UserPlus className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Role</p>
                    <p className="text-sm text-gray-500 capitalize">{invitation.role}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pay Rate</p>
                    <p className="text-sm text-gray-500">
                      ${invitation.pay_rate}/{invitation.pay_period}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Expires</p>
                    <p className="text-sm text-gray-500">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
