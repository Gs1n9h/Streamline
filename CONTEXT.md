# Streamline - Project Context File

## 🎯 Project Overview

**Streamline** is a comprehensive multi-tenant workforce management SaaS platform that transforms chaos into cash flow for small business owners. Built as a 5-day intensive sprint MVP that delivers enterprise-grade workforce management tools to small businesses.

### Mission Statement
"Every small business owner deserves the clarity and control that enterprise companies take for granted. We are turning chaos into cash flow."

### Target Market
- Landscapers, construction crews, cleaning services, field technicians
- Small to medium businesses with mobile workforces (5-100+ employees)
- Companies currently using spreadsheets, text messages, and paper timesheets

## 🏗️ Technical Architecture

### Tech Stack
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Web Dashboard**: Next.js 15 with TypeScript and Tailwind CSS
- **Mobile App**: Expo (React Native) with TypeScript
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Email Service**: Resend for automated reports
- **Payment Processing**: Stripe for subscriptions and billing
- **Monorepo**: pnpm workspaces for code organization

### Project Structure
```
streamline-monorepo/
├── apps/
│   ├── mobile/              # Expo React Native app
│   │   ├── components/      # Reusable components
│   │   ├── screens/         # App screens
│   │   ├── lib/            # Supabase client
│   │   └── App.tsx         # Main app component
│   └── web/                # Next.js admin dashboard
│       ├── src/
│       │   ├── components/ # Dashboard components
│       │   ├── app/        # App router pages
│       │   └── lib/        # Supabase client
│       └── package.json
├── packages/
│   ├── db/                 # Database schemas
│   │   └── sql/           # Migration scripts
│   └── shared-types/      # TypeScript definitions
├── supabase/
│   └── functions/         # Edge functions
└── README.md             # Comprehensive documentation
```

## 📊 Database Schema

### Core Tables
- `companies` - Business/tenant entities
- `profiles` - User profile information  
- `company_members` - User-company relationships with roles and pay rates
- `jobs` - Work sites and projects
- `timesheets` - Time tracking entries with GPS coordinates
- `location_pings` - Real-time location updates for live tracking

### SaaS Tables
- `subscription_plans` - Available pricing tiers (Starter, Professional, Enterprise)
- `company_subscriptions` - Active subscriptions with Stripe IDs
- `usage_metrics` - Daily usage tracking for billing
- `billing_invoices` - Payment history and invoice records
- `webhook_events` - Stripe webhook audit trail

### Key Database Functions
- `get_active_shift()` - Find current active timesheet for a user
- `clock_out_user()` - Complete a timesheet entry
- `get_timesheets_for_period()` - Retrieve time entries for date ranges
- `get_latest_locations()` - Get real-time staff locations
- `calculate_payroll_for_period()` - Compute wages for payroll
- `get_daily_summary()` - Generate daily activity summaries
- `can_add_employee()` / `can_add_job()` - Plan limit enforcement
- `get_company_subscription()` - Subscription info with usage

## 💰 SaaS Pricing & Plans

### Subscription Tiers
1. **Starter Plan**: $29/month ($290/year)
   - 5 employees, 10 jobs
   - Basic features: time tracking, GPS, basic reports, email support
   - Perfect for small teams getting started

2. **Professional Plan**: $79/month ($790/year) - MOST POPULAR
   - 25 employees, 50 jobs  
   - Advanced features: payroll export, priority support, custom branding
   - For growing teams that need more features

3. **Enterprise Plan**: $199/month ($1990/year)
   - Unlimited employees and jobs
   - Enterprise features: API access, white label, dedicated support
   - For large organizations with advanced needs

### SaaS Features
- **14-Day Free Trial**: No credit card required
- **Annual Billing Discount**: 17% savings
- **Usage Enforcement**: Automatic limit checking
- **Stripe Integration**: Secure payment processing
- **Customer Portal**: Self-service billing management
- **Real-time Usage Tracking**: Monitor employees, jobs, timesheets

## 👥 User Roles & Features

### 👑 Admin Users (Web Dashboard)
**Live Dashboard Tab**
- Real-time map view of active staff locations
- Live list of clocked-in employees with job assignments
- Location history for current shifts
- Supabase Realtime subscriptions for live updates

**Timesheet & Payroll Tab**
- Date range selection for payroll calculation
- One-click automated wage calculation
- Export payroll data to CSV
- Summary cards showing total hours, costs, staff count

**Employee Management Tab**
- View all team members with roles and pay rates
- Edit pay rates with inline editing
- Role management (admin/staff)
- Usage tracking vs. plan limits

**Job Management Tab**
- Create and manage work sites/projects
- Archive completed jobs
- Track job-specific time entries
- Address and location information

**Reports Tab**
- Daily summary reports with breakdowns
- Historical data analysis
- Total hours, labor costs, jobs worked
- Automated email reports via Edge Functions

**Billing Tab** (NEW)
- Current plan status and usage
- Real-time usage meters for employees/jobs
- Plan features comparison
- Stripe customer portal access
- Plan upgrade/downgrade flows

### 👨‍🔧 Staff Users (Mobile App)
**Main Dashboard Screen**
- Large clock in/out button with job selection
- KPI cards showing today's, week's, and month's hours
- Drill-down timesheet history with map views
- GPS-verified time tracking

**Settings Screen**
- Profile management and password changes
- Logout functionality
- App information

**Map Modal Screen**
- Clock in/out location pins (placeholder for map integration)
- Location history for timesheet entries

## 🔐 Security & Multi-tenancy

### Row Level Security (RLS)
- Complete data isolation between companies
- User-specific access controls
- Admin vs. staff permission levels
- Secure company membership validation

### Authentication
- JWT-based authentication via Supabase Auth
- Secure user sessions with auto-refresh
- Profile creation on signup
- Company membership management

### Data Protection
- Multi-tenant architecture with complete isolation
- Location privacy (staff locations only visible to their company)
- Secure API endpoints with proper authorization
- Stripe webhook verification for payment security

## 📱 Mobile App Features

### Core Functionality
- **Clock In/Out**: GPS-verified with job selection
- **Background Location**: 5-minute intervals while clocked in
- **Timesheet History**: Drill-down view with location pins
- **KPI Dashboard**: Today/week/month hour summaries
- **Offline-ready**: Robust error handling and loading states

### Technical Implementation
- Expo React Native with TypeScript
- Supabase client with AsyncStorage
- React Navigation for screen management
- Background location services
- GPS permission handling

## 🔧 API & Integrations

### Supabase Integration
- Real-time subscriptions for live updates
- Edge Functions for daily email reports
- Database functions for business logic
- Row Level Security for data protection

### Stripe Integration
- Checkout sessions for plan selection
- Customer portal for billing management
- Webhook handling for subscription updates
- Invoice tracking and payment history

### Email Automation
- Daily report generation via Edge Functions
- Resend integration for email delivery
- HTML email templates with company branding
- Automated scheduling with cron jobs

## 🚀 Deployment & Setup

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service
RESEND_API_KEY=your_resend_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
1. Create Supabase project
2. Run SQL scripts in order:
   - `packages/db/sql/01-schema.sql` - Core tables
   - `packages/db/sql/02-rls-policies.sql` - Security policies
   - `packages/db/sql/03-functions.sql` - Business logic
   - `packages/db/sql/04-saas-schema.sql` - SaaS tables
   - `packages/db/sql/05-saas-functions.sql` - SaaS logic

### Development Commands
```bash
# Setup
./setup.sh

# Development
pnpm dev                    # Start all apps
pnpm dev:web               # Web dashboard only
pnpm dev:mobile            # Mobile app only

# Building
pnpm build                 # Build all apps
pnpm build:types          # Build shared types

# Database
pnpm db:migrate           # Run migrations
pnpm db:reset            # Reset database (dev only)
```

## 📈 Business Model & Monetization

### Revenue Streams
- **Subscription Revenue**: Monthly/annual recurring revenue
- **Usage-based Pricing**: Potential for overage charges
- **Enterprise Features**: White-label and API access
- **Professional Services**: Implementation and training

### Customer Acquisition
- **Free Trial**: 14-day trial with no credit card required
- **Freemium Model**: Starter plan for small teams
- **Referral Program**: Potential for growth incentives
- **Content Marketing**: Workforce management best practices

### Key Metrics
- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**
- **Churn Rate**
- **Usage Analytics**: Employees, jobs, timesheets per company

## 🎯 Competitive Advantages

### Technical Advantages
- **Modern Stack**: Built on latest technologies (Next.js 15, Expo, Supabase)
- **Real-time Features**: Live location tracking and updates
- **Mobile-first Design**: Optimized for field workers
- **Scalable Architecture**: Multi-tenant ready for thousands of companies

### Business Advantages
- **Feature Parity**: Matches established players like Sinc
- **Better UX**: Modern, intuitive interface
- **Faster Development**: Supabase eliminates months of backend work
- **Cost-effective**: Lower operational costs with serverless architecture

### Market Positioning
- **Premium Product**: Enterprise features for small businesses
- **Pricing Advantage**: Competitive pricing with better features
- **Customer Support**: Priority support and dedicated account management
- **Industry Focus**: Specialized for mobile workforce industries

## 🔮 Future Roadmap

### Short Term (Month 1)
- Map integration (Google Maps/Mapbox)
- Enhanced reporting and analytics
- Mobile app store optimization
- Performance optimization and load testing

### Medium Term (Quarter 1)
- Advanced features: overtime calculation, job costing
- Third-party integrations: QuickBooks, payroll services
- Mobile enhancements: offline mode, photo attachments
- Enterprise features: advanced permissions, custom fields

### Long Term (Year 1)
- White-label solutions for resellers
- API marketplace for integrations
- AI-powered insights and recommendations
- International expansion and localization

## 📝 Development Notes

### Code Quality
- TypeScript throughout for type safety
- Shared types package for consistency
- Comprehensive error handling
- Detailed documentation and comments

### Performance
- Database indexes for fast queries
- Real-time subscriptions for live updates
- Efficient background location tracking
- Lazy-loaded components for faster loads

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for user flows
- Performance testing for scalability

## 🎉 Success Metrics

### Technical Goals ✅
- Multi-tenant architecture implemented
- Real-time location tracking functional
- Automated payroll calculation working
- Mobile-first staff interface complete
- Admin dashboard fully functional
- Daily email reports automated
- SaaS billing and subscriptions working

### Business Goals ✅
- Feature parity with market leaders
- Mobile workforce management solved
- Payroll automation implemented
- Real-time operational visibility
- Scalable multi-tenant foundation
- Revenue-generating SaaS platform

## 📞 Support & Contact

### Development Team
- **Architecture**: System design and scalability
- **Database**: PostgreSQL and Supabase expertise
- **Frontend**: Next.js and React Native development
- **Backend**: API development and integrations

### Key Files to Reference
- `README.md` - Complete setup and deployment guide
- `SAAS_SETUP.md` - SaaS infrastructure setup
- `PROJECT_SUMMARY.md` - Detailed project completion summary
- `packages/shared-types/src/index.ts` - Type definitions
- `packages/db/sql/` - Database schema and functions

---

**Last Updated**: September 28, 2025  
**Version**: 1.0.0  
**Status**: Production Ready MVP with Complete SaaS Infrastructure

This context file contains all essential information about the Streamline project for future development, maintenance, and scaling efforts.
