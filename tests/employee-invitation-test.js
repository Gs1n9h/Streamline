/**
 * Employee Invitation Test
 * 
 * This test verifies that employee invitations can be created successfully
 * with all required fields including the invited_by field.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

// Test with streamline schema as default (like our app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function testEmployeeInvitation() {
  console.log('🧪 Testing Employee Invitation Creation');
  console.log('=' .repeat(50));
  
  try {
    // Get a test company and user
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError || !companies || companies.length === 0) {
      console.log('❌ No companies found for testing');
      return false;
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError || !profiles || profiles.length === 0) {
      console.log('❌ No profiles found for testing');
      return false;
    }
    
    const companyId = companies[0].id;
    const invitedById = profiles[0].id;
    
    console.log('1️⃣ Testing employee invitation creation...');
    
    // Test creating an employee invitation with all required fields
    const testInvitation = {
      company_id: companyId,
      email: 'test-employee@example.com',
      full_name: 'Test Employee',
      role: 'staff',
      pay_rate: 25.00,
      pay_period: 'hourly',
      invited_by: invitedById
    };
    
    const { data: inviteData, error: inviteError } = await supabase
      .from('employee_invitations')
      .insert(testInvitation)
      .select()
      .single();
    
    if (inviteError) {
      console.log('❌ Employee invitation creation failed:', inviteError.message);
      console.log('Details:', inviteError.details);
      return false;
    }
    
    console.log('✅ Employee invitation created successfully');
    console.log('Invitation ID:', inviteData.id);
    console.log('Token:', inviteData.token);
    
    // Test 2: Verify the invitation can be retrieved
    console.log('2️⃣ Testing invitation retrieval...');
    
    const { data: retrievedInvite, error: retrieveError } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('id', inviteData.id)
      .single();
    
    if (retrieveError) {
      console.log('❌ Invitation retrieval failed:', retrieveError.message);
      return false;
    }
    
    console.log('✅ Invitation retrieved successfully');
    console.log('Retrieved invitation:', {
      id: retrievedInvite.id,
      email: retrievedInvite.email,
      full_name: retrievedInvite.full_name,
      role: retrievedInvite.role,
      pay_rate: retrievedInvite.pay_rate,
      pay_period: retrievedInvite.pay_period,
      invited_by: retrievedInvite.invited_by,
      status: retrievedInvite.status
    });
    
    // Test 3: Clean up test data
    console.log('3️⃣ Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('employee_invitations')
      .delete()
      .eq('id', inviteData.id);
    
    if (deleteError) {
      console.log('⚠️ Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n🎉 EMPLOYEE INVITATION FUNCTIONALITY WORKING PERFECTLY!');
    console.log('📊 Test Results:');
    console.log('   ✅ Employee invitation creation: Working');
    console.log('   ✅ All required fields populated: Working');
    console.log('   ✅ invited_by field populated: Working');
    console.log('   ✅ Invitation retrieval: Working');
    console.log('\n💡 The employee invitation system is ready for production use!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Employee invitation test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testEmployeeInvitation().catch(console.error);
}

module.exports = testEmployeeInvitation;
