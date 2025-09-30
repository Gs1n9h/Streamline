/**
 * Foreign Key Relationship Test
 * 
 * This test verifies that foreign key relationships work correctly in the streamline schema.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

// Test with streamline schema as default (like our app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function testForeignKeyRelationships() {
  console.log('🧪 Testing Foreign Key Relationships in Streamline Schema');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check that we can query company_members with profiles relationship
    console.log('1️⃣ Testing company_members -> profiles relationship...');
    
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select(`
        user_id,
        role,
        pay_rate,
        pay_period,
        profiles!inner(
          full_name
        )
      `)
      .limit(1);
    
    if (membersError) {
      console.log('❌ Foreign key relationship failed:', membersError.message);
      console.log('Details:', membersError.details);
      return false;
    }
    
    console.log('✅ Foreign key relationship working');
    console.log('Sample data:', members);
    
    // Test 2: Check that we can query companies with company_members relationship
    console.log('2️⃣ Testing companies -> company_members relationship...');
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        company_members!inner(
          user_id,
          role
        )
      `)
      .limit(1);
    
    if (companiesError) {
      console.log('❌ Companies relationship failed:', companiesError.message);
      return false;
    }
    
    console.log('✅ Companies relationship working');
    console.log('Sample data:', companies);
    
    // Test 3: Check that we can query employee_invitations with companies relationship
    console.log('3️⃣ Testing employee_invitations -> companies relationship...');
    
    const { data: invites, error: invitesError } = await supabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        full_name,
        companies!inner(
          name
        )
      `)
      .limit(1);
    
    if (invitesError) {
      console.log('❌ Invitations relationship failed:', invitesError.message);
      return false;
    }
    
    console.log('✅ Invitations relationship working');
    console.log('Sample data:', invites);
    
    console.log('\n🎉 ALL FOREIGN KEY RELATIONSHIPS WORKING PERFECTLY!');
    console.log('📊 Test Results:');
    console.log('   ✅ company_members -> profiles: Working');
    console.log('   ✅ companies -> company_members: Working');
    console.log('   ✅ employee_invitations -> companies: Working');
    console.log('\n💡 The foreign key relationships are properly configured in streamline schema!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Foreign key relationship test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testForeignKeyRelationships().catch(console.error);
}

module.exports = testForeignKeyRelationships;
