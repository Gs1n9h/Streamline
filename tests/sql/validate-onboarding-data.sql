-- SQL Validation Script for Onboarding Flow
-- This script validates that all data was created correctly during the onboarding process

-- Function to validate onboarding data for a specific user
CREATE OR REPLACE FUNCTION validate_onboarding_data(user_email TEXT)
RETURNS TABLE (
    validation_type TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    user_id UUID;
    profile_record RECORD;
    company_record RECORD;
    membership_record RECORD;
    invitation_records RECORD[];
    invitation_count INTEGER;
BEGIN
    -- Get user ID from email
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN QUERY SELECT 'USER_LOOKUP'::TEXT, 'FAILED'::TEXT, 'User not found with email: ' || user_email;
        RETURN;
    END IF;

    -- Validate profile exists
    SELECT * INTO profile_record FROM profiles WHERE id = user_id;
    
    IF profile_record IS NULL THEN
        RETURN QUERY SELECT 'PROFILE'::TEXT, 'FAILED'::TEXT, 'No profile found for user';
    ELSE
        RETURN QUERY SELECT 'PROFILE'::TEXT, 'PASSED'::TEXT, 
            'Profile found: ' || COALESCE(profile_record.full_name, 'NULL') || 
            ', Role: ' || COALESCE(profile_record.role, 'NULL') ||
            ', Phone: ' || COALESCE(profile_record.phone, 'NULL');
    END IF;

    -- Validate company membership
    SELECT * INTO membership_record 
    FROM streamline.company_members 
    WHERE user_id = validate_onboarding_data.user_id AND role = 'admin';
    
    IF membership_record IS NULL THEN
        RETURN QUERY SELECT 'MEMBERSHIP'::TEXT, 'FAILED'::TEXT, 'No admin membership found for user';
    ELSE
        RETURN QUERY SELECT 'MEMBERSHIP'::TEXT, 'PASSED'::TEXT, 
            'Admin membership found for company: ' || membership_record.company_id;
    END IF;

    -- Validate company exists and has correct data
    SELECT * INTO company_record 
    FROM streamline.companies 
    WHERE id = membership_record.company_id;
    
    IF company_record IS NULL THEN
        RETURN QUERY SELECT 'COMPANY'::TEXT, 'FAILED'::TEXT, 'Company not found for membership';
    ELSE
        RETURN QUERY SELECT 'COMPANY'::TEXT, 'PASSED'::TEXT, 
            'Company: ' || company_record.name || 
            ', Industry: ' || COALESCE(company_record.industry, 'NULL') ||
            ', Size: ' || COALESCE(company_record.size, 'NULL') ||
            ', Currency: ' || COALESCE(company_record.currency, 'NULL') ||
            ', Timezone: ' || COALESCE(company_record.time_zone, 'NULL');
    END IF;

    -- Validate employee invitations (if any)
    SELECT COUNT(*) INTO invitation_count
    FROM streamline.employee_invitations 
    WHERE company_id = company_record.id;
    
    RETURN QUERY SELECT 'INVITATIONS'::TEXT, 'PASSED'::TEXT, 
        'Employee invitations count: ' || invitation_count;

    -- Get detailed invitation data
    FOR invitation_records IN 
        SELECT * FROM streamline.employee_invitations 
        WHERE company_id = company_record.id
    LOOP
        RETURN QUERY SELECT 'INVITATION_DETAIL'::TEXT, 'PASSED'::TEXT, 
            'Invitation: ' || invitation_records.email || 
            ', Name: ' || invitation_records.full_name ||
            ', Role: ' || invitation_records.role ||
            ', Pay Rate: ' || invitation_records.pay_rate ||
            ', Status: ' || invitation_records.status;
    END LOOP;

END;
$$ LANGUAGE plpgsql;

-- Quick validation query for a specific user
-- Usage: SELECT * FROM validate_onboarding_data('test-user@streamline-test.com');

-- Validation queries for manual testing:

-- 1. Check if user exists in auth.users
-- SELECT id, email, created_at FROM auth.users WHERE email = 'test-user@streamline-test.com';

-- 2. Check if profile was created
-- SELECT * FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'test-user@streamline-test.com');

-- 3. Check if company was created
-- SELECT c.* FROM streamline.companies c
-- JOIN streamline.company_members cm ON c.id = cm.company_id
-- JOIN auth.users u ON cm.user_id = u.id
-- WHERE u.email = 'test-user@streamline-test.com';

-- 4. Check if admin membership was created
-- SELECT cm.* FROM streamline.company_members cm
-- JOIN auth.users u ON cm.user_id = u.id
-- WHERE u.email = 'test-user@streamline-test.com' AND cm.role = 'admin';

-- 5. Check if employee invitations were created
-- SELECT ei.* FROM streamline.employee_invitations ei
-- JOIN streamline.companies c ON ei.company_id = c.id
-- JOIN streamline.company_members cm ON c.id = cm.company_id
-- JOIN auth.users u ON cm.user_id = u.id
-- WHERE u.email = 'test-user@streamline-test.com';

-- 6. Get complete onboarding summary
-- SELECT 
--     u.email,
--     p.full_name,
--     p.role as user_role,
--     c.name as company_name,
--     c.industry,
--     c.size,
--     c.currency,
--     c.time_zone,
--     c.default_pay_rate,
--     cm.role as membership_role,
--     COUNT(ei.id) as invitation_count
-- FROM auth.users u
-- LEFT JOIN profiles p ON u.id = p.id
-- LEFT JOIN streamline.company_members cm ON u.id = cm.user_id
-- LEFT JOIN streamline.companies c ON cm.company_id = c.id
-- LEFT JOIN streamline.employee_invitations ei ON c.id = ei.company_id
-- WHERE u.email = 'test-user@streamline-test.com'
-- GROUP BY u.email, p.full_name, p.role, c.name, c.industry, c.size, c.currency, c.time_zone, c.default_pay_rate, cm.role;

-- Cleanup function for test data
CREATE OR REPLACE FUNCTION cleanup_test_data(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
    company_id UUID;
    cleanup_result TEXT := '';
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;

    -- Get company ID
    SELECT company_id INTO company_id 
    FROM streamline.company_members 
    WHERE user_id = cleanup_test_data.user_id AND role = 'admin';
    
    IF company_id IS NOT NULL THEN
        -- Delete employee invitations
        DELETE FROM streamline.employee_invitations WHERE company_id = cleanup_test_data.company_id;
        cleanup_result := cleanup_result || 'Deleted employee invitations. ';
        
        -- Delete company memberships
        DELETE FROM streamline.company_members WHERE company_id = cleanup_test_data.company_id;
        cleanup_result := cleanup_result || 'Deleted company memberships. ';
        
        -- Delete company
        DELETE FROM streamline.companies WHERE id = cleanup_test_data.company_id;
        cleanup_result := cleanup_result || 'Deleted company. ';
    END IF;
    
    -- Delete profile
    DELETE FROM profiles WHERE id = user_id;
    cleanup_result := cleanup_result || 'Deleted profile. ';
    
    -- Note: We cannot delete from auth.users as we don't have admin access
    cleanup_result := cleanup_result || 'Note: auth.users record must be deleted manually.';
    
    RETURN cleanup_result;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT cleanup_test_data('test-user@streamline-test.com');
