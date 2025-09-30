/**
 * Create Test Invitation
 * 
 * This script creates a test employee invitation to verify
 * that it shows up in the UI properly.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

// Test with streamline schema as default (like our app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function createTestInvitation() {
  console.log('🧪 Creating Test Employee Invitation');
  console.log('=' .repeat(40));
  
  try {
    // Get a test company and user
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
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
    const companyName = companies[0].name;
    const invitedById = profiles[0].id;
    
    console.log(`📋 Creating invitation for company: ${companyName}`);
    
    // Create test invitation
    const testInvitation = {
      company_id: companyId,
      email: 'test-employee-ui@example.com',
      full_name: 'Test UI Employee',
      role: 'staff',
      pay_rate: 30.00,
      pay_period: 'hourly',
      invited_by: invitedById
    };
    
    const { data: inviteData, error: inviteError } = await supabase
      .from('employee_invitations')
      .insert(testInvitation)
      .select()
      .single();
    
    if (inviteError) {
      console.log('❌ Failed to create invitation:', inviteError.message);
      return false;
    }
    
    console.log('✅ Test invitation created successfully!');
    console.log('📧 Invitation details:', {
      id: inviteData.id,
      email: inviteData.email,
      full_name: inviteData.full_name,
      role: inviteData.role,
      pay_rate: inviteData.pay_rate,
      status: inviteData.status
    });
    
    console.log('\n🎉 Test invitation ready!');
    console.log('📱 Now refresh your dashboard to see the invitation in the UI!');
    console.log('   - It should appear with a yellow background');
    console.log('   - Show "Pending" status');
    console.log('   - Display email and pay rate information');
    console.log('   - Have "Awaiting response" in the actions column');
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create test invitation:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  createTestInvitation().catch(console.error);
}

module.exports = createTestInvitation;
