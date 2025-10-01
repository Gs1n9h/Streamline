# Database Migration Instructions

## Current Issues Fixed

This migration fixes two critical issues:

1. **403 Forbidden on `job_assignments` table** - RLS policies were using `FOR ALL` which doesn't work properly. Split into separate INSERT, UPDATE, DELETE policies.
2. **400 Bad Request on `update_company_location_settings`** - Function was trying to update `updated_at` column which doesn't exist in the `companies` table.

## How to Apply Fixes

### Option 1: Run the Fix Script (Recommended)
Run this single migration file in your Supabase SQL Editor:

```sql
packages/db/sql/11-fix-rls-and-functions.sql
```

This will:
- Drop and recreate job_assignments RLS policies with proper INSERT/UPDATE/DELETE permissions
- Fix the update_company_location_settings function to remove the updated_at reference

### Option 2: Run Individual Files
If you haven't run the initial migrations, run them in order:

1. `01-schema.sql` - Core tables
2. `02-rls-policies.sql` - Row Level Security
3. `03-functions.sql` - Database functions
4. `04-saas-schema.sql` - SaaS features
5. `05-saas-functions.sql` - SaaS functions
6. `06-job-management.sql` - Job tracking (UPDATED)
7. `07-geofencing.sql` - Geofencing features
8. `08-geofencing-rls.sql` - Geofencing RLS
9. `09-performance-indexes.sql` - Performance indexes
10. `10-location-settings.sql` - Location settings (UPDATED)
11. `11-fix-rls-and-functions.sql` - Fixes (NEW)

## Verification

After running the migration, verify:

1. **Job Assignments**: Try creating/updating job assignments from the Settings tab
2. **Location Settings**: Try updating location settings from the Location Settings component

## Schema Configuration

The Supabase client is already configured to use the `streamline` schema by default in:
- `apps/web/src/lib/supabase.ts` (line 8: `db: { schema: 'streamline' }`)

This means you **DO NOT** need to add `.schema('streamline')` to your queries. The client handles this automatically.

## Troubleshooting

If you still get 403 errors:
1. Verify you're logged in as an admin user
2. Check that your user has a company_members record with role='admin'
3. Run this query to verify:
```sql
SELECT * FROM streamline.company_members WHERE user_id = auth.uid();
```

If you get column errors:
1. Verify the column exists: `\d streamline.companies`
2. Check if you need to run earlier migrations first
