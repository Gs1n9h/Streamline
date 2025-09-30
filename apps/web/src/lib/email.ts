// Email service for sending invitations
// In production, this would integrate with Resend, SendGrid, or similar

export interface EmailInvitation {
  to: string
  fullName: string
  companyName: string
  role: string
  inviteUrl: string
  invitedBy: string
}

export const sendEmployeeInvitation = async (invitation: EmailInvitation) => {
  // Mock implementation - in production, this would send actual emails
  console.log('📧 Sending invitation email:', {
    to: invitation.to,
    subject: `You're invited to join ${invitation.companyName} on Streamline`,
    body: `
      Hi ${invitation.fullName},
      
      ${invitation.invitedBy} has invited you to join ${invitation.companyName} on Streamline, 
      a workforce management platform.
      
      Your role: ${invitation.role}
      
      Click here to accept your invitation: ${invitation.inviteUrl}
      
      This invitation will expire in 7 days.
      
      Best regards,
      The Streamline Team
    `
  })
  
  // In production, you would use:
  // const response = await fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     to: invitation.to,
  //     subject: `You're invited to join ${invitation.companyName} on Streamline`,
  //     template: 'employee-invitation',
  //     data: invitation
  //   })
  // })
  
  return { success: true, messageId: 'mock-message-id' }
}

export const sendWelcomeEmail = async (email: string, companyName: string) => {
  console.log('📧 Sending welcome email:', {
    to: email,
    subject: `Welcome to Streamline - Your ${companyName} account is ready!`,
    body: `
      Welcome to Streamline!
      
      Your ${companyName} account has been successfully created and you're ready to start 
      managing your workforce more efficiently.
      
      Your 14-day free trial has started. During this time, you can:
      - Track employee time with GPS verification
      - Monitor live locations of your team
      - Generate automated payroll reports
      - Invite your employees to join
      
      Get started by logging into your dashboard.
      
      Best regards,
      The Streamline Team
    `
  })
  
  return { success: true, messageId: 'mock-welcome-message-id' }
}
