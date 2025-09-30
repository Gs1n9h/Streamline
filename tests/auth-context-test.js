/**
 * Authentication Context Test
 * 
 * This test verifies that the Supabase client properly maintains
 * authentication context after signup.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

async function testAuthContext() {
  console.log('🔐 Testing Authentication Context');
  console.log('=' .repeat(40));
  
  const testEmail = `auth-test-${Date.now()}@streamline-test.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Step 2: Check initial auth state
    console.log('1️⃣ Checking initial auth state...');
    const { data: initialAuth } = await supabase.auth.getUser();
    console.log(`   Initial auth state: ${initialAuth.user ? 'Authenticated' : 'Not authenticated'}`);
    
    // Step 3: Sign up user
    console.log('2️⃣ Signing up user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      throw new Error(`Signup failed: ${authError.message}`);
    }
    
    if (!authData.user) {
      throw new Error('No user created');
    }
    
    console.log('✅ User signup successful');
    console.log(`   User ID: ${authData.user.id}`);
    
    // Step 4: Check auth state after signup
    console.log('3️⃣ Checking auth state after signup...');
    const { data: postSignupAuth } = await supabase.auth.getUser();
    console.log(`   Post-signup auth state: ${postSignupAuth.user ? 'Authenticated' : 'Not authenticated'}`);
    
    if (postSignupAuth.user) {
      console.log(`   Authenticated user ID: ${postSignupAuth.user.id}`);
      console.log(`   User email: ${postSignupAuth.user.email}`);
    }
    
    // Step 5: Try to create a profile (should work if auth context is correct)
    console.log('4️⃣ Testing profile creation with auth context...');
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
      console.log('❌ Profile creation failed:', profileError.message);
      console.log('   This suggests auth context is not working properly');
    } else {
      console.log('✅ Profile creation successful');
    }
    
    // Step 6: Try to create a company (this is where we're having issues)
    console.log('5️⃣ Testing company creation with auth context...');
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
      console.log('❌ Company creation failed:', companyError.message);
      console.log('   This confirms the auth context issue');
    } else {
      console.log('✅ Company creation successful');
      console.log(`   Company ID: ${companyData.id}`);
    }
    
    // Step 7: Check what auth.uid() returns in RLS context
    console.log('6️⃣ Testing RLS context...');
    const { data: rlsTest, error: rlsError } = await supabase
      .rpc('auth.uid')
      .single();
    
    if (rlsError) {
      console.log('❌ RLS test failed:', rlsError.message);
    } else {
      console.log('✅ RLS test successful');
      console.log(`   RLS auth.uid(): ${rlsTest}`);
    }
    
    console.log('\n📊 Authentication Context Test Results:');
    console.log(`   ✅ User signup: Working`);
    console.log(`   ${profileError ? '❌' : '✅'} Profile creation: ${profileError ? 'Failed' : 'Working'}`);
    console.log(`   ${companyError ? '❌' : '✅'} Company creation: ${companyError ? 'Failed' : 'Working'}`);
    
    return !profileError && !companyError;
    
  } catch (error) {
    console.error('❌ Auth context test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAuthContext().catch(console.error);
}

module.exports = testAuthContext;
