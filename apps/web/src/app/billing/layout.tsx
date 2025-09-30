'use client'

import { AuthProvider } from '@/components/auth/AuthProvider'

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
