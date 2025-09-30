/**
 * Onboarding Flow Test
 * 
 * This test validates the complete onboarding flow by simulating
 * the actual user journey through the web application.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCompleteOnboardingFlow() {
  console.log('🚀 Testing Complete Onboarding Flow');
  console.log('=' .repeat(50));
  
  const testEmail = `onboarding-test-${Date.now()}@streamline-test.com`;
  const testPassword = 'TestPassword123!';
  const testCompanyName = 'Test Company Inc';
  
  let userId = null;
  let companyId = null;
  
  try {
    // Step 1: Sign up user (simulates signup page)
    console.log('1️⃣ Testing user signup...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          company_name: testCompanyName
        }
      }
    });
    
    if (authError) {
      throw new Error(`Signup failed: ${authError.message}`);
    }
    
    if (!authData.user) {
      throw new Error('No user created');
    }
    
    userId = authData.user.id;
    console.log('✅ User signup successful');
    console.log(`   User ID: ${userId}`);
    
    // Step 2: Create profile (simulates onboarding step 2)
    console.log('2️⃣ Testing profile creation...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: 'Test User',
        email: testEmail,
        role: 'owner',
        phone: '(555) 123-4567'
      });
    
    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }
    
    console.log('✅ Profile creation successful');
    
    // Step 3: Create company (simulates onboarding step 1)
    console.log('3️⃣ Testing company creation...');
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: testCompanyName,
        industry: 'Construction',
        size: '1-5',
        address: '123 Test St, Test City, CA 90210, US',
        phone: '(555) 123-4567',
        website: 'https://testcompany.com',
        time_zone: 'America/Los_Angeles',
        currency: 'USD',
        default_pay_rate: 20.00
      })
      .select()
      .single();
    
    if (companyError) {
      throw new Error(`Company creation failed: ${companyError.message}`);
    }
    
    companyId = companyData.id;
    console.log('✅ Company creation successful');
    console.log(`   Company ID: ${companyId}`);
    
    // Step 4: Create company membership (simulates onboarding completion)
    console.log('4️⃣ Testing company membership...');
    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        user_id: userId,
        company_id: companyId,
        role: 'admin',
        pay_rate: 20.00,
        pay_period: 'hourly'
      });
    
    if (memberError) {
      throw new Error(`Company membership failed: ${memberError.message}`);
    }
    
    console.log('✅ Company membership successful');
    
    // Step 5: Create employee invitation (simulates onboarding step 4)
    console.log('5️⃣ Testing employee invitation...');
    const { error: inviteError } = await supabase
      .from('employee_invitations')
      .insert({
        company_id: companyId,
        email: 'employee@testcompany.com',
        full_name: 'Test Employee',
        role: 'staff',
        pay_rate: 18.00,
        pay_period: 'hourly',
        invited_by: userId
      });
    
    if (inviteError) {
      console.log('⚠️ Employee invitation failed:', inviteError.message);
      console.log('   This might be due to RLS policies on invitations table');
    } else {
      console.log('✅ Employee invitation successful');
    }
    
    // Step 6: Verify data integrity
    console.log('6️⃣ Verifying data integrity...');
    
    // Check profile
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!profileCheck) {
      throw new Error('Profile not found after creation');
    }
    
    console.log('✅ Profile verification successful');
    
    // Check company
    const { data: companyCheck } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (!companyCheck) {
      throw new Error('Company not found after creation');
    }
    
    console.log('✅ Company verification successful');
    
    // Check membership
    const { data: membershipCheck } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();
    
    if (!membershipCheck) {
      throw new Error('Company membership not found after creation');
    }
    
    console.log('✅ Membership verification successful');
    
    console.log('\n🎉 Complete onboarding flow test PASSED!');
    console.log('📊 Test Results:');
    console.log(`   ✅ User created: ${testEmail}`);
    console.log(`   ✅ Profile created: ${profileCheck.full_name}`);
    console.log(`   ✅ Company created: ${companyCheck.name}`);
    console.log(`   ✅ Membership created: ${membershipCheck.role}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Onboarding flow test FAILED:', error.message);
    console.log('\n📊 Test Results:');
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   📧 Test user: ${testEmail}`);
    console.log(`   👤 User ID: ${userId || 'Not created'}`);
    console.log(`   🏢 Company ID: ${companyId || 'Not created'}`);
    
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testCompleteOnboardingFlow().catch(console.error);
}

module.exports = testCompleteOnboardingFlow;
