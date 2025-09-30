# Streamline - Workforce Management SaaS Platform

A comprehensive multi-tenant workforce management platform built with modern technologies for time tracking, live location monitoring, and automated payroll calculation.

## 🚀 Project Overview

Streamline is designed to solve the chaos of managing mobile workforces. From landscapers to construction crews, cleaning services to field technicians - every small business owner deserves the clarity and control that enterprise companies take for granted.

### Key Features

- **Time Tracking**: Mobile-first clock in/out with GPS location verification
- **Live Location Monitoring**: Real-time tracking of active staff members
- **Automated Payroll**: Calculate wages with precision and generate reports
- **Multi-tenant Architecture**: Secure, scalable database design
- **Daily Reports**: Automated email summaries sent to admins
- **Employee Management**: Set pay rates and manage team members

## 🏗️ Architecture

### Tech Stack

- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Web Dashboard**: Next.js 15 with TypeScript and Tailwind CSS
- **Mobile App**: Expo (React Native) with TypeScript
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Email Service**: Resend for automated reports
- **Monorepo**: pnpm workspaces for code organization

### Project Structure

```
streamline-monorepo/
├── apps/
│   ├── mobile/         # Expo React Native app
│   └── web/            # Next.js admin dashboard
├── packages/
│   ├── db/             # Database schemas and migrations
│   └── shared-types/   # Shared TypeScript types
├── supabase/
│   └── functions/      # Edge functions for automation
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account
- Expo CLI (for mobile development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd Streamline
pnpm install
```

### 2. Environment Setup

Copy the environment template:
```bash
cp env.example .env
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
RESEND_API_KEY=your_resend_api_key_here
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in order:
   - `packages/db/sql/01-schema.sql` - Core tables and indexes
   - `packages/db/sql/02-rls-policies.sql` - Row Level Security policies
   - `packages/db/sql/03-functions.sql` - Database functions and RPCs

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref your-project-ref

# Deploy the daily report function
supabase functions deploy daily-report
```

### 5. Start Development

```bash
# Start web dashboard
cd apps/web
pnpm dev

# Start mobile app (in another terminal)
cd apps/mobile
pnpm start
```

## 📱 User Roles & Features

### 👑 Admin Users (Web Dashboard)

**Live Dashboard**
- Real-time map view of active staff locations
- Live list of clocked-in employees
- Location history for current shifts

**Timesheet & Payroll**
- Date range selection for payroll calculation
- Automated wage calculation based on hours and pay rates
- Export payroll data to CSV

**Employee Management**
- View all team members
- Set and update pay rates
- Manage roles (admin/staff)

**Job Management**
- Create and manage work sites/projects
- Archive completed jobs
- Track job-specific time entries

**Reports**
- Daily summary reports
- Historical data analysis
- Automated email reports

### 👨‍🔧 Staff Users (Mobile App)

**Main Dashboard**
- Large clock in/out button with job selection
- KPI cards showing today's, week's, and month's hours
- Drill-down timesheet history with map views

**Settings**
- Profile management
- Password changes
- Logout functionality

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Multi-tenant Architecture**: Complete data isolation between companies
- **JWT Authentication**: Secure user sessions
- **Location Privacy**: Staff location data only accessible to their company admins

## 📊 Database Schema

### Core Tables

- `companies` - Business/tenant entities
- `profiles` - User profile information
- `company_members` - User-company relationships with roles and pay rates
- `jobs` - Work sites and projects
- `timesheets` - Time tracking entries with GPS coordinates
- `location_pings` - Real-time location updates for live tracking

### Key Functions

- `get_active_shift()` - Find current active timesheet for a user
- `clock_out_user()` - Complete a timesheet entry
- `get_timesheets_for_period()` - Retrieve time entries for date ranges
- `get_latest_locations()` - Get real-time staff locations
- `calculate_payroll_for_period()` - Compute wages for payroll
- `get_daily_summary()` - Generate daily activity summaries

## 🚀 Deployment

### Web Dashboard (Vercel)

```bash
cd apps/web
vercel --prod
```

### Mobile App

```bash
cd apps/mobile
expo build:android
expo build:ios
```

### Database Migrations

```bash
# Run migrations
supabase db push

# Reset database (development only)
supabase db reset
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific app
cd apps/web && pnpm test
cd apps/mobile && pnpm test
```

## 📈 Performance Optimizations

- **Database Indexes**: Optimized queries for location and timesheet data
- **Real-time Subscriptions**: Efficient live updates using Supabase Realtime
- **Background Location**: Minimal battery usage with 5-minute intervals
- **Code Splitting**: Lazy-loaded components for faster initial loads

## 🔧 Development Workflow

1. **Database Changes**: Update SQL files in `packages/db/sql/`
2. **Shared Types**: Modify `packages/shared-types/src/index.ts`
3. **Web Features**: Develop in `apps/web/src/`
4. **Mobile Features**: Develop in `apps/mobile/`

## 📝 API Documentation

### Authentication Endpoints

- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/signout` - User logout

### RPC Functions

- `get_latest_locations(company_id)` - Real-time staff locations
- `calculate_payroll_for_period(company_id, start_date, end_date)` - Payroll calculation
- `get_timesheets_for_period(staff_id, start_date, end_date)` - Staff timesheet history

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

---

**Built with ❤️ for small business owners who deserve enterprise-grade workforce management tools.**

