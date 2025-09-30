'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sendEmployeeInvitation, sendWelcomeEmail } from '@/lib/email'
import { 
  INDUSTRIES, 
  COMPANY_SIZES, 
  PAY_PERIODS, 
  ROLES, 
  EMPLOYEE_ROLES,
  COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  getTimezoneForLocation,
  getCurrencyForCountry
} from '@/lib/constants'
import { CheckCircle, Building2, Users, Mail, Settings, ArrowRight, ArrowLeft } from 'lucide-react'

interface OnboardingData {
  // Step 1: Company Information
  companyName: string
  industry: string
  companySize: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  companyPhone: string
  website: string
  
  // Step 2: Admin Profile
  fullName: string
  email: string
  role: string
  adminPhone: string
  
  // Step 3: Company Settings
  timeZone: string
  currency: string
  defaultPayRate: number
  
  // Step 4: Employee Invites (Optional)
  employees: Array<{
    email: string
    fullName: string
    role: 'admin' | 'staff'
    payRate: number
    payPeriod: string
  }>
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    industry: '',
    companySize: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    companyPhone: '',
    website: '',
    fullName: '',
    email: '',
    role: '',
    adminPhone: '',
    timeZone: 'America/New_York',
    currency: 'USD',
    defaultPayRate: 15.00,
    employees: []
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      
      // Pre-populate company name from signup
      const companyName = searchParams.get('company')
      if (companyName) {
        setFormData(prev => ({
          ...prev,
          companyName: decodeURIComponent(companyName)
        }))
      }
      
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || ''
      }))
    }
    getUser()
  }, [router, searchParams])

  const updateFormData = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Auto-update timezone and currency when country/state changes
      if (field === 'country' || field === 'state') {
        const timezone = getTimezoneForLocation(newData.country, newData.state)
        const currency = getCurrencyForCountry(newData.country)
        newData.timeZone = timezone
        newData.currency = currency
      }
      
      return newData
    })
  }

  const addEmployee = () => {
    setFormData(prev => ({
      ...prev,
      employees: [...prev.employees, {
        email: '',
        fullName: '',
        role: 'staff' as const,
        payRate: prev.defaultPayRate,
        payPeriod: 'hourly'
      }]
    }))
  }

  const updateEmployee = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }))
  }

  const removeEmployee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }))
  }

  const handleComplete = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.adminPhone,
          role: formData.role
        })

      if (profileError) throw profileError

      // Create company with full address
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`
      
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          industry: formData.industry,
          size: formData.companySize,
          address: fullAddress,
          phone: formData.companyPhone,
          website: formData.website,
          time_zone: formData.timeZone,
          currency: formData.currency,
          default_pay_rate: formData.defaultPayRate
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Add admin as company member
      const { error: adminError } = await supabase
        .from('company_members')
        .insert({
          user_id: user.id,
          company_id: companyData.id,
          role: 'admin',
          pay_rate: formData.defaultPayRate,
          pay_period: 'hourly' // Default for admin
        })

      if (adminError) throw adminError

      // Send employee invitations (optional - only if employees were added)
      if (formData.employees.length > 0) {
        for (const employee of formData.employees) {
          if (employee.email && employee.fullName) {
                  // Create pending employee record
                  const { data: inviteData, error: inviteError } = await supabase
                    .from('employee_invitations')
                    .insert({
                      company_id: companyData.id,
                      email: employee.email,
                      full_name: employee.fullName,
                      role: employee.role,
                      pay_rate: employee.payRate,
                      pay_period: employee.payPeriod,
                      invited_by: user.id
                    })
                    .select()
                    .single()

            if (inviteError) {
              console.error('Failed to create invitation:', inviteError)
              continue
            }

            // Send email invitation
            const inviteUrl = `${window.location.origin}/invite/${inviteData.token}`
            await sendEmployeeInvitation({
              to: employee.email,
              fullName: employee.fullName,
              companyName: formData.companyName,
              role: employee.role,
              inviteUrl,
              invitedBy: formData.fullName
            })
          }
        }
      }

      // Send welcome email to admin
      await sendWelcomeEmail(user.email || '', formData.companyName)

      router.push('/dashboard?welcome=true')
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('Failed to complete setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatesForCountry = () => {
    if (formData.country === 'US') return US_STATES
    if (formData.country === 'CA') return CA_PROVINCES
    return []
  }

  const steps = [
    { id: 1, title: 'Company Info', icon: Building2 },
    { id: 2, title: 'Your Profile', icon: Users },
    { id: 3, title: 'Settings', icon: Settings },
    { id: 4, title: 'Invite Team', icon: Mail }
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Tell us about your company</h2>
            <p className="text-gray-600">Help us customize your experience</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Construction Co."
                />
                {searchParams.get('company') && (
                  <p className="text-sm text-gray-500 mt-1">
                    Pre-filled from signup - you can change this if needed
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size *
                </label>
                <select
                  value={formData.companySize}
                  onChange={(e) => updateFormData('companySize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Size</option>
                  {COMPANY_SIZES.map(size => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New York"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              
              {getStatesForCountry().length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => updateFormData('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select State/Province</option>
                    {getStatesForCountry().map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.companyPhone}
                  onChange={(e) => updateFormData('companyPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateFormData('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete your profile</h2>
            <p className="text-gray-600">Tell us about yourself as the admin</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => updateFormData('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Role</option>
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => updateFormData('adminPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Configure your settings</h2>
            <p className="text-gray-600">Set up your default preferences. These can be changed later in your settings.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  value={formData.timeZone}
                  onChange={(e) => updateFormData('timeZone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  <option value="America/Toronto">Canada Eastern Time</option>
                  <option value="America/Vancouver">Canada Pacific Time</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Central European Time</option>
                  <option value="Asia/Tokyo">Japan Standard Time</option>
                  <option value="Asia/Shanghai">China Standard Time</option>
                  <option value="Australia/Sydney">Australian Eastern Time</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-detected from your location: {formData.country} {formData.state}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => updateFormData('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (CHF)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-detected from your country: {formData.country}
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Pay Rate ({formData.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultPayRate}
                  onChange={(e) => updateFormData('defaultPayRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used as the default rate for new employees. Individual rates can be set for each employee.
                </p>
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Invite your team</h2>
            <p className="text-gray-600">Add your employees to get started (optional - you can add them later)</p>
            
            <div className="space-y-4">
              {formData.employees.map((employee, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-900">Employee {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeEmployee(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={employee.fullName}
                        onChange={(e) => updateEmployee(index, 'fullName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jane Doe"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={employee.email}
                        onChange={(e) => updateEmployee(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="jane@company.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={employee.role}
                        onChange={(e) => updateEmployee(index, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {EMPLOYEE_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pay Period
                      </label>
                      <select
                        value={employee.payPeriod}
                        onChange={(e) => updateEmployee(index, 'payPeriod', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {PAY_PERIODS.map(period => (
                          <option key={period.value} value={period.value}>{period.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pay Rate ({formData.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={employee.payRate}
                      onChange={(e) => updateEmployee(index, 'payRate', parseFloat(e.target.value))}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="15.00"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addEmployee}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + Add Employee
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Skip for now - I'll add employees later
                </button>
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName.trim() !== '' && formData.industry !== '' && formData.companySize !== ''
      case 2:
        return formData.fullName.trim() !== '' && formData.role !== ''
      case 3:
        return true
      case 4:
        return true // Always allow proceeding from step 4 (employee invites are optional)
      default:
        return false
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Icon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderStep()}
          
          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading || !canProceed()}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
                <CheckCircle className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}