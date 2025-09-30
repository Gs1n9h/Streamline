-- Performance indexes for date-based aggregations and queries
-- This migration adds indexes to improve query performance for timesheet aggregations,
-- location tracking, and geofence events

-- Timesheet indexes for date-based aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_staff_clock_in_date 
ON streamline.timesheets (staff_id, DATE(clock_in));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_company_clock_in_date 
ON streamline.timesheets (company_id, DATE(clock_in));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_clock_in_month 
ON streamline.timesheets (DATE_TRUNC('month', clock_in));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_clock_in_week 
ON streamline.timesheets (DATE_TRUNC('week', clock_in));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_clock_in_day 
ON streamline.timesheets (DATE_TRUNC('day', clock_in));

-- Composite index for staff timesheet queries with date range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_staff_company_date_range 
ON streamline.timesheets (staff_id, company_id, clock_in) 
WHERE clock_out IS NOT NULL;

-- Index for active timesheets (clocked in)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_active 
ON streamline.timesheets (staff_id, company_id) 
WHERE clock_out IS NULL;

-- Location pings indexes for live tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_pings_user_timestamp 
ON streamline.location_pings (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_pings_timesheet_timestamp 
ON streamline.location_pings (timesheet_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_pings_recent 
ON streamline.location_pings (created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Geofence events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofence_events_user_timestamp 
ON streamline.geofence_events (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofence_events_company_timestamp 
ON streamline.geofence_events (company_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geofence_events_geofence_timestamp 
ON streamline.geofence_events (geofence_id, created_at DESC);

-- Company members indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_user_id 
ON streamline.company_members (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_company_id 
ON streamline.company_members (company_id);

-- Jobs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_active 
ON streamline.jobs (company_id) 
WHERE is_active = true;

-- Employee invitations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_invitations_company_status 
ON streamline.employee_invitations (company_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_invitations_email 
ON streamline.employee_invitations (email);

-- Usage metrics indexes for billing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_metrics_company_date 
ON streamline.usage_metrics (company_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_metrics_recent 
ON streamline.usage_metrics (date DESC) 
WHERE date > CURRENT_DATE - INTERVAL '30 days';

-- Billing invoices indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_invoices_company_date 
ON streamline.billing_invoices (company_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_invoices_status 
ON streamline.billing_invoices (status);

-- Analyze tables to update statistics
ANALYZE streamline.timesheets;
ANALYZE streamline.location_pings;
ANALYZE streamline.geofence_events;
ANALYZE streamline.company_members;
ANALYZE streamline.jobs;
ANALYZE streamline.employee_invitations;
ANALYZE streamline.usage_metrics;
ANALYZE streamline.billing_invoices;
