# Schema and RLS Issue Analysis

## The Problem

You're experiencing two errors:
1. **403 Forbidden** on `job_assignments` - RLS is blocking access
2. **400 Bad Request** on `update_company_location_settings` - Column doesn't exist

## Root Cause Analysis

### Issue 1: Schema Configuration Confusion

The Supabase client is configured with `db: { schema: 'streamline' }`, but this **ONLY** sets the PostgreSQL search_path. It does NOT:
- Create tables in that schema automatically
- Change where existing tables are located
- Affect RLS policies on tables in other schemas

**Critical Question**: Where are your tables actually located?

Run this query to find out:
```sql
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('companies', 'job_assignments', 'company_members')
ORDER BY schemaname, tablename;
```

### Issue 2: RLS Policy Problems

The 403 error suggests:
1. Tables exist but RLS is blocking access
2. RLS policies might be checking the wrong conditions
3. User might not have proper company_members record

### Issue 3: Column Doesn't Exist

The `updated_at` column error means the function is trying to update a column that doesn't exist in the actual table.

## Most Likely Scenario

**Your tables are in the `public` schema, not `streamline`!**

This happens when:
- You ran migrations without specifying the schema
- Supabase created tables in the default `public` schema
- The client's `db.schema` setting doesn't move existing tables

## Solution Paths

### Path A: Tables ARE in streamline schema (verify first)

If tables are already in `streamline`, then:
1. RLS policies need to be fixed
2. Function needs to be updated
3. Run the fix migration

### Path B: Tables ARE in public schema (most likely)

You have two options:

#### Option B1: Move tables to streamline schema (RECOMMENDED)
```sql
-- Move all tables from public to streamline
ALTER TABLE public.companies SET SCHEMA streamline;
ALTER TABLE public.profiles SET SCHEMA streamline;
ALTER TABLE public.company_members SET SCHEMA streamline;
ALTER TABLE public.jobs SET SCHEMA streamline;
ALTER TABLE public.timesheets SET SCHEMA streamline;
ALTER TABLE public.job_assignments SET SCHEMA streamline;
-- ... etc for all tables
```

#### Option B2: Change client to use public schema (NOT RECOMMENDED)
Change `apps/web/src/lib/supabase.ts`:
```typescript
db: { schema: 'public' }  // Instead of 'streamline'
```

## Recommended Action Plan

1. **Run diagnostic queries** (see DIAGNOSTIC_QUERIES.sql)
2. **Determine actual table location**
3. **If in public**: Either move tables or change client config
4. **If in streamline**: Fix RLS policies and functions
5. **Verify RLS policies match table schema**
6. **Test access**

## Why This Matters

PostgreSQL RLS policies are schema-specific. If your:
- Tables are in `public` schema
- RLS policies reference `streamline.company_members`
- The policy will FAIL because it's looking in the wrong schema

The policy must use the same schema as the table it's protecting.
