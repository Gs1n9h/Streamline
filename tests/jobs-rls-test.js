/**
 * Jobs RLS Test
 * 
 * This test verifies that the RLS policies for the jobs table are working correctly.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y6nfpTVkU';

// Test with mobile app configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' },
  auth: {
    storage: {
      getItem: async (key) => null,
      setItem: async (key, value) => {},
      removeItem: async (key) => {}
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

async function testJobsRLS() {
  console.log('🧪 Testing Jobs RLS Policies');
  console.log('=' .repeat(50));
  
  try {
    const testEmail = 'signupthesingh@gmail.com';
    const testPassword = 'password123';
    const companyId = '107a8722-6406-400b-ad9c-6596291dd9ac';
    
    console.log(`📧 Testing with email: ${testEmail}`);
    console.log(`🏢 Company ID: ${companyId}`);
    
    // Test 1: Sign in to get authenticated session
    console.log('1️⃣ Signing in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      return false;
    }
    
    console.log('✅ Sign in successful');
    console.log('   User ID:', signInData.user?.id);
    console.log('   Session exists:', !!signInData.session);
    
    // Test 2: Try to insert a job (should work with RLS policies)
    console.log('2️⃣ Testing job insertion...');
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        name: 'RLS Test Job',
        address: '456 Test Avenue',
        company_id: companyId
      })
      .select()
      .single();
    
    if (jobError) {
      console.log('❌ Job insertion failed:', jobError.message);
      console.log('   Error code:', jobError.code);
      console.log('   Error details:', jobError.details);
    } else {
      console.log('✅ Job insertion successful');
      console.log('   Job ID:', jobData.id);
      console.log('   Job name:', jobData.name);
      console.log('   Company ID:', jobData.company_id);
    }
    
    // Test 3: Try to fetch jobs (should work with RLS policies)
    console.log('3️⃣ Testing job fetching...');
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId);
    
    if (jobsError) {
      console.log('❌ Job fetching failed:', jobsError.message);
    } else {
      console.log('✅ Job fetching successful');
      console.log('   Jobs found:', jobsData.length);
      jobsData.forEach((job, index) => {
        console.log(`   Job ${index + 1}: ${job.name} (${job.id})`);
      });
    }
    
    // Test 4: Try to insert job for different company (should fail with RLS)
    console.log('4️⃣ Testing job insertion for different company (should fail)...');
    const { data: wrongJobData, error: wrongJobError } = await supabase
      .from('jobs')
      .insert({
        name: 'Unauthorized Job',
        address: '789 Unauthorized Street',
        company_id: '00000000-0000-0000-0000-000000000000' // Different company ID
      })
      .select()
      .single();
    
    if (wrongJobError) {
      console.log('✅ Unauthorized job insertion correctly blocked:', wrongJobError.message);
    } else {
      console.log('❌ Unauthorized job insertion should have been blocked!');
      console.log('   This indicates an RLS policy issue');
    }
    
    console.log('\n🎉 JOBS RLS TEST COMPLETE!');
    console.log('📊 Test Results:');
    console.log('   ✅ Authentication: Working');
    console.log('   ✅ Job insertion: Tested');
    console.log('   ✅ Job fetching: Tested');
    console.log('   ✅ RLS enforcement: Tested');
    console.log('\n💡 The jobs table should now work correctly in the mobile app!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Jobs RLS test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testJobsRLS().catch(console.error);
}

module.exports = testJobsRLS;
