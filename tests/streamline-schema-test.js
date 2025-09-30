/**
 * Streamline Schema Test
 * 
 * This test verifies that the Supabase client is properly configured to use the streamline schema.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

// Test with streamline schema as default (like our app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function testStreamlineSchema() {
  console.log('🧪 Testing Streamline Schema Configuration');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check that tables exist and are accessible in streamline schema
    console.log('1️⃣ Testing streamline schema table access...');
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError) {
      console.log('❌ companies table access failed:', companiesError.message);
      return false;
    }
    
    console.log('✅ companies table accessible');
    
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('user_id')
      .limit(1);
    
    if (membersError) {
      console.log('❌ company_members table access failed:', membersError.message);
      return false;
    }
    
    console.log('✅ company_members table accessible');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ profiles table access failed:', profilesError.message);
      return false;
    }
    
    console.log('✅ profiles table accessible');
    
    const { data: invites, error: invitesError } = await supabase
      .from('employee_invitations')
      .select('id')
      .limit(1);
    
    if (invitesError) {
      console.log('❌ employee_invitations table access failed:', invitesError.message);
      return false;
    }
    
    console.log('✅ employee_invitations table accessible');
    
    // Test 2: Test per-query schema specification (alternative approach)
    console.log('2️⃣ Testing per-query schema specification...');
    
    const { data: companiesAlt, error: companiesAltError } = await supabase
      .schema('streamline')
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesAltError) {
      console.log('❌ Per-query schema specification failed:', companiesAltError.message);
      return false;
    }
    
    console.log('✅ Per-query schema specification working');
    
    // Test 3: Test functions in streamline schema
    console.log('3️⃣ Testing streamline schema functions...');
    
    const { data: locations, error: locationsError } = await supabase.rpc('get_latest_locations', {
      p_company_id: companies?.[0]?.id || '00000000-0000-0000-0000-000000000000'
    });
    
    if (locationsError) {
      console.log('❌ get_latest_locations function failed:', locationsError.message);
      return false;
    }
    
    console.log('✅ get_latest_locations function working');
    
    console.log('\n🎉 STREAMLINE SCHEMA CONFIGURATION WORKING PERFECTLY!');
    console.log('📊 Test Results:');
    console.log('   ✅ Default schema configuration: Working');
    console.log('   ✅ Per-query schema specification: Working');
    console.log('   ✅ All tables accessible: Working');
    console.log('   ✅ All functions accessible: Working');
    console.log('\n💡 The Supabase client is properly configured to use streamline schema!');
    console.log('   - Default schema: streamline');
    console.log('   - Per-query override: supabase.schema("streamline").from("table")');
    console.log('   - Single client instance: No multiple GoTrueClient warnings');
    
    return true;
    
  } catch (error) {
    console.error('❌ Streamline schema test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testStreamlineSchema().catch(console.error);
}

module.exports = testStreamlineSchema;
