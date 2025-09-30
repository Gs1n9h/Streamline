/**
 * Quick Validation Script
 * 
 * This script performs a quick validation of the database schema and
 * tests the onboarding flow with a simple HTTP request.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function validateSchema() {
  console.log('🔍 Validating database schema...');
  
  try {
    // Test 1: Check if we can read from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError.message);
      return false;
    }
    console.log('✅ Profiles table accessible');
    
    // Test 2: Check if we can access companies table (will be empty for new users due to RLS)
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, industry')
      .limit(1);
    
    if (companiesError) {
      console.log('❌ Companies table error:', companiesError.message);
      return false;
    }
    console.log('✅ Companies table accessible (RLS working correctly)');
    
    // Test 3: Check if we can read from company_members table
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('user_id, company_id, role')
      .limit(1);
    
    if (membersError) {
      console.log('❌ Company members table error:', membersError.message);
      return false;
    }
    console.log('✅ Company members table accessible');
    
    // Test 4: Check if we can read from employee_invitations table
    const { data: invitations, error: invitationsError } = await supabase
      .from('employee_invitations')
      .select('id, email, status')
      .limit(1);
    
    if (invitationsError) {
      console.log('❌ Employee invitations table error:', invitationsError.message);
      return false;
    }
    console.log('✅ Employee invitations table accessible');
    
    console.log('✅ All database tables accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    return false;
  }
}

async function testOnboardingFlow() {
  console.log('\n🧪 Testing onboarding flow...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Test 1: Try to sign up a user
    console.log('📝 Testing user signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (authError) {
      console.log('❌ Signup error:', authError.message);
      return false;
    }
    
    if (!authData.user) {
      console.log('❌ No user created');
      return false;
    }
    
    console.log('✅ User signup successful');
    
    // Test 2: Try to create a profile
    console.log('👤 Testing profile creation...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: 'Test User',
        email: testEmail,
        role: 'owner',
        phone: '(555) 123-4567'
      });
    
    if (profileError) {
      console.log('❌ Profile creation error:', profileError.message);
      return false;
    }
    
    console.log('✅ Profile creation successful');
    
    // Test 3: Try to create a company
    console.log('🏢 Testing company creation...');
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Company',
        industry: 'Construction',
        size: '1-5',
        address: '123 Test St, Test City, CA 90210, US',
        phone: '(555) 123-4567',
        website: 'https://test.com',
        time_zone: 'America/Los_Angeles',
        currency: 'USD',
        default_pay_rate: 20.00
      })
      .select()
      .single();
    
    if (companyError) {
      console.log('❌ Company creation error:', companyError.message);
      return false;
    }
    
    console.log('✅ Company creation successful');
    
    // Test 4: Try to create company membership
    console.log('👥 Testing company membership...');
    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        user_id: authData.user.id,
        company_id: companyData.id,
        role: 'admin',
        pay_rate: 20.00,
        pay_period: 'hourly'
      });
    
    if (memberError) {
      console.log('❌ Company membership error:', memberError.message);
      return false;
    }
    
    console.log('✅ Company membership successful');
    
    // Test 5: Try to create employee invitation
    console.log('📧 Testing employee invitation...');
    const { error: inviteError } = await supabase
      .from('employee_invitations')
      .insert({
        company_id: companyData.id,
        email: 'employee@test.com',
        full_name: 'Test Employee',
        role: 'staff',
        pay_rate: 18.00,
        pay_period: 'hourly',
        invited_by: authData.user.id
      });
    
    if (inviteError) {
      console.log('❌ Employee invitation error:', inviteError.message);
      return false;
    }
    
    console.log('✅ Employee invitation successful');
    
    console.log('✅ All onboarding operations successful!');
    return true;
    
  } catch (error) {
    console.error('❌ Onboarding test failed:', error.message);
    return false;
  }
}

async function runQuickValidation() {
  console.log('🚀 Starting Quick Validation');
  console.log('=' .repeat(50));
  
  const schemaValid = await validateSchema();
  const onboardingValid = await testOnboardingFlow();
  
  console.log('\n📊 Validation Results:');
  console.log('=' .repeat(50));
  console.log(`Database Schema: ${schemaValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Onboarding Flow: ${onboardingValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  const overallSuccess = schemaValid && onboardingValid;
  console.log(`\nOverall Result: ${overallSuccess ? '🎉 ALL TESTS PASSED' : '💥 SOME TESTS FAILED'}`);
  
  return overallSuccess;
}

// Run validation if this file is executed directly
if (require.main === module) {
  runQuickValidation().catch(console.error);
}

module.exports = { runQuickValidation, validateSchema, testOnboardingFlow };
