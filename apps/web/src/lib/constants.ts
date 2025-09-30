// Global constants for the application

export const INDUSTRIES = [
  'Construction',
  'Landscaping & Lawn Care',
  'Cleaning Services',
  'Field Services',
  'Maintenance & Repair',
  'Security Services',
  'Transportation & Logistics',
  'Healthcare & Medical',
  'Real Estate',
  'Property Management',
  'Retail & Sales',
  'Food & Beverage',
  'Hospitality',
  'Manufacturing',
  'Technology & IT',
  'Consulting',
  'Legal Services',
  'Accounting & Finance',
  'Marketing & Advertising',
  'Education & Training',
  'Fitness & Wellness',
  'Beauty & Personal Care',
  'Automotive Services',
  'Pet Services',
  'Event Planning',
  'Photography & Videography',
  'Graphic Design',
  'Writing & Content',
  'Translation Services',
  'Virtual Assistant',
  'Other'
]

export const COMPANY_SIZES = [
  { value: '1-5', label: '1-5 employees' },
  { value: '6-25', label: '6-25 employees' },
  { value: '26-100', label: '26-100 employees' },
  { value: '101-500', label: '101-500 employees' },
  { value: '500+', label: '500+ employees' }
]

export const PAY_PERIODS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' }
]

export const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Administrator' }
]

export const EMPLOYEE_ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' }
]

// Country and currency mapping
export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', timezone: 'Europe/Brussels' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'AT', name: 'Austria', currency: 'EUR', timezone: 'Europe/Vienna' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm' },
  { code: 'NO', name: 'Norway', currency: 'NOK', timezone: 'Europe/Oslo' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', timezone: 'Europe/Copenhagen' },
  { code: 'FI', name: 'Finland', currency: 'EUR', timezone: 'Europe/Helsinki' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', currency: 'CLP', timezone: 'America/Santiago' },
  { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota' },
  { code: 'PE', name: 'Peru', currency: 'PEN', timezone: 'America/Lima' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', timezone: 'Africa/Casablanca' },
  { code: 'IL', name: 'Israel', currency: 'ILS', timezone: 'Asia/Jerusalem' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland' },
  { code: 'RU', name: 'Russia', currency: 'RUB', timezone: 'Europe/Moscow' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul' },
  { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', timezone: 'Europe/Budapest' },
  { code: 'RO', name: 'Romania', currency: 'RON', timezone: 'Europe/Bucharest' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', timezone: 'Europe/Sofia' },
  { code: 'HR', name: 'Croatia', currency: 'HRK', timezone: 'Europe/Zagreb' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', timezone: 'Europe/Ljubljana' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', timezone: 'Europe/Bratislava' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', timezone: 'Europe/Vilnius' },
  { code: 'LV', name: 'Latvia', currency: 'EUR', timezone: 'Europe/Riga' },
  { code: 'EE', name: 'Estonia', currency: 'EUR', timezone: 'Europe/Tallinn' }
]

// US States for timezone mapping
export const US_STATES = [
  { code: 'AL', name: 'Alabama', timezone: 'America/Chicago' },
  { code: 'AK', name: 'Alaska', timezone: 'America/Anchorage' },
  { code: 'AZ', name: 'Arizona', timezone: 'America/Phoenix' },
  { code: 'AR', name: 'Arkansas', timezone: 'America/Chicago' },
  { code: 'CA', name: 'California', timezone: 'America/Los_Angeles' },
  { code: 'CO', name: 'Colorado', timezone: 'America/Denver' },
  { code: 'CT', name: 'Connecticut', timezone: 'America/New_York' },
  { code: 'DE', name: 'Delaware', timezone: 'America/New_York' },
  { code: 'FL', name: 'Florida', timezone: 'America/New_York' },
  { code: 'GA', name: 'Georgia', timezone: 'America/New_York' },
  { code: 'HI', name: 'Hawaii', timezone: 'Pacific/Honolulu' },
  { code: 'ID', name: 'Idaho', timezone: 'America/Denver' },
  { code: 'IL', name: 'Illinois', timezone: 'America/Chicago' },
  { code: 'IN', name: 'Indiana', timezone: 'America/New_York' },
  { code: 'IA', name: 'Iowa', timezone: 'America/Chicago' },
  { code: 'KS', name: 'Kansas', timezone: 'America/Chicago' },
  { code: 'KY', name: 'Kentucky', timezone: 'America/New_York' },
  { code: 'LA', name: 'Louisiana', timezone: 'America/Chicago' },
  { code: 'ME', name: 'Maine', timezone: 'America/New_York' },
  { code: 'MD', name: 'Maryland', timezone: 'America/New_York' },
  { code: 'MA', name: 'Massachusetts', timezone: 'America/New_York' },
  { code: 'MI', name: 'Michigan', timezone: 'America/New_York' },
  { code: 'MN', name: 'Minnesota', timezone: 'America/Chicago' },
  { code: 'MS', name: 'Mississippi', timezone: 'America/Chicago' },
  { code: 'MO', name: 'Missouri', timezone: 'America/Chicago' },
  { code: 'MT', name: 'Montana', timezone: 'America/Denver' },
  { code: 'NE', name: 'Nebraska', timezone: 'America/Chicago' },
  { code: 'NV', name: 'Nevada', timezone: 'America/Los_Angeles' },
  { code: 'NH', name: 'New Hampshire', timezone: 'America/New_York' },
  { code: 'NJ', name: 'New Jersey', timezone: 'America/New_York' },
  { code: 'NM', name: 'New Mexico', timezone: 'America/Denver' },
  { code: 'NY', name: 'New York', timezone: 'America/New_York' },
  { code: 'NC', name: 'North Carolina', timezone: 'America/New_York' },
  { code: 'ND', name: 'North Dakota', timezone: 'America/Chicago' },
  { code: 'OH', name: 'Ohio', timezone: 'America/New_York' },
  { code: 'OK', name: 'Oklahoma', timezone: 'America/Chicago' },
  { code: 'OR', name: 'Oregon', timezone: 'America/Los_Angeles' },
  { code: 'PA', name: 'Pennsylvania', timezone: 'America/New_York' },
  { code: 'RI', name: 'Rhode Island', timezone: 'America/New_York' },
  { code: 'SC', name: 'South Carolina', timezone: 'America/New_York' },
  { code: 'SD', name: 'South Dakota', timezone: 'America/Chicago' },
  { code: 'TN', name: 'Tennessee', timezone: 'America/Chicago' },
  { code: 'TX', name: 'Texas', timezone: 'America/Chicago' },
  { code: 'UT', name: 'Utah', timezone: 'America/Denver' },
  { code: 'VT', name: 'Vermont', timezone: 'America/New_York' },
  { code: 'VA', name: 'Virginia', timezone: 'America/New_York' },
  { code: 'WA', name: 'Washington', timezone: 'America/Los_Angeles' },
  { code: 'WV', name: 'West Virginia', timezone: 'America/New_York' },
  { code: 'WI', name: 'Wisconsin', timezone: 'America/Chicago' },
  { code: 'WY', name: 'Wyoming', timezone: 'America/Denver' }
]

// Canadian Provinces
export const CA_PROVINCES = [
  { code: 'AB', name: 'Alberta', timezone: 'America/Edmonton' },
  { code: 'BC', name: 'British Columbia', timezone: 'America/Vancouver' },
  { code: 'MB', name: 'Manitoba', timezone: 'America/Winnipeg' },
  { code: 'NB', name: 'New Brunswick', timezone: 'America/Moncton' },
  { code: 'NL', name: 'Newfoundland and Labrador', timezone: 'America/St_Johns' },
  { code: 'NS', name: 'Nova Scotia', timezone: 'America/Halifax' },
  { code: 'ON', name: 'Ontario', timezone: 'America/Toronto' },
  { code: 'PE', name: 'Prince Edward Island', timezone: 'America/Halifax' },
  { code: 'QC', name: 'Quebec', timezone: 'America/Montreal' },
  { code: 'SK', name: 'Saskatchewan', timezone: 'America/Regina' },
  { code: 'NT', name: 'Northwest Territories', timezone: 'America/Yellowknife' },
  { code: 'NU', name: 'Nunavut', timezone: 'America/Iqaluit' },
  { code: 'YT', name: 'Yukon', timezone: 'America/Whitehorse' }
]

// Helper functions
export const getCountryByCode = (code: string) => {
  return COUNTRIES.find(country => country.code === code)
}

export const getUSStateByCode = (code: string) => {
  return US_STATES.find(state => state.code === code)
}

export const getCAProvinceByCode = (code: string) => {
  return CA_PROVINCES.find(province => province.code === code)
}

export const getTimezoneForLocation = (country: string, state?: string) => {
  if (country === 'US' && state) {
    const stateData = getUSStateByCode(state)
    return stateData?.timezone || 'America/New_York'
  } else if (country === 'CA' && state) {
    const provinceData = getCAProvinceByCode(state)
    return provinceData?.timezone || 'America/Toronto'
  } else {
    const countryData = getCountryByCode(country)
    return countryData?.timezone || 'America/New_York'
  }
}

export const getCurrencyForCountry = (countryCode: string) => {
  const country = getCountryByCode(countryCode)
  return country?.currency || 'USD'
}
