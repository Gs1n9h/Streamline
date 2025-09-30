// Database Types
export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
}

export interface CompanyMember {
  user_id: string;
  company_id: string;
  role: 'admin' | 'staff';
  pay_rate: number;
  pay_period: 'hourly';
}

export interface Job {
  id: string;
  name: string;
  address: string | null;
  company_id: string;
  is_archived: boolean;
}

export interface Timesheet {
  id: string;
  staff_id: string;
  job_id: string;
  company_id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
}

export interface LocationPing {
  id: number;
  user_id: string;
  timesheet_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

// Function Return Types
export interface PayrollCalculation {
  staff_id: string;
  full_name: string;
  total_hours: number;
  pay_rate: number;
  total_wage: number;
}

export interface LatestLocation {
  user_id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  last_updated_at: string;
}

export interface TimesheetPeriod {
  id: string;
  job_name: string;
  clock_in: string;
  clock_out: string | null;
  duration: string; // PostgreSQL interval as string
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
}

// API Types
export interface ClockInRequest {
  job_id: string;
  latitude: number;
  longitude: number;
}

export interface ClockOutRequest {
  timesheet_id: string;
  latitude: number;
  longitude: number;
}

export interface LocationUpdateRequest {
  timesheet_id: string;
  latitude: number;
  longitude: number;
}

// UI State Types
export interface UserContext {
  user: Profile;
  companies: Company[];
  currentCompany: Company | null;
  role: 'admin' | 'staff' | null;
}

export interface ClockState {
  isClockedIn: boolean;
  currentTimesheet: Timesheet | null;
  currentJob: Job | null;
}

// Navigation Types
export type StaffTab = 'dashboard' | 'settings';
export type AdminTab = 'live-dashboard' | 'timesheet-payroll' | 'reports' | 'employees' | 'jobs';

// SaaS Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_employees: number;
  max_jobs: number;
  features: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
}

export interface UsageMetric {
  id: number;
  company_id: string;
  metric_type: 'employees' | 'timesheets' | 'jobs' | 'storage';
  metric_value: number;
  recorded_date: string;
}

export interface BillingInvoice {
  id: string;
  company_id: string;
  subscription_id: string;
  stripe_invoice_id?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  invoice_date: string;
  due_date?: string;
  paid_at?: string;
}

// Stripe Integration Types
export interface StripeCheckoutSession {
  id: string;
  url: string;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
}

// Constants
export const PAY_PERIODS = ['hourly'] as const;
export const ROLES = ['admin', 'staff'] as const;
export const DEFAULT_PAY_RATE = 0.00;
export const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// SaaS Constants
export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'past_due', 'incomplete', 'trialing'] as const;
export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export const PLAN_FEATURES = [
  'time_tracking',
  'basic_reports', 
  'advanced_reports',
  'gps_tracking',
  'payroll_export',
  'email_support',
  'priority_support',
  'custom_branding',
  'api_access',
  'white_label',
  'dedicated_support'
] as const;

