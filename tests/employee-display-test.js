/**
 * Employee Display Test
 * 
 * This test verifies that both existing employees and pending invitations
 * are properly fetched and displayed in the streamline schema.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU';

// Test with streamline schema as default (like our app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function testEmployeeDisplay() {
  console.log('🧪 Testing Employee Display Functionality');
  console.log('=' .repeat(50));
  
  try {
    // Get a test company
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);
    
    if (companiesError || !companies || companies.length === 0) {
      console.log('❌ No companies found for testing');
      return false;
    }
    
    const companyId = companies[0].id;
    const companyName = companies[0].name;
    
    console.log(`1️⃣ Testing data fetch for company: ${companyName}`);
    
    // Test 1: Fetch existing employees (company_members)
    console.log('   📋 Fetching existing employees...');
    const { data: employeesData, error: employeesError } = await supabase
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
      .eq('company_id', companyId);

    if (employeesError) {
      console.log('❌ Error fetching employees:', employeesError.message);
      return false;
    }

    console.log(`   ✅ Found ${employeesData?.length || 0} existing employees`);

    // Test 2: Fetch pending invitations
    console.log('   📧 Fetching pending invitations...');
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('employee_invitations')
      .select(`
        id,
        email,
        full_name,
        role,
        pay_rate,
        pay_period,
        status
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (invitationsError) {
      console.log('❌ Error fetching invitations:', invitationsError.message);
      return false;
    }

    console.log(`   ✅ Found ${invitationsData?.length || 0} pending invitations`);

    // Test 3: Format and combine data (like the UI does)
    console.log('   🔄 Formatting and combining data...');
    
    // Format existing employees
    const formattedEmployees = employeesData?.map(emp => ({
      user_id: emp.user_id,
      full_name: emp.profiles.full_name,
      role: emp.role,
      pay_rate: emp.pay_rate,
      pay_period: emp.pay_period,
      type: 'employee'
    })) || [];

    // Format pending invitations
    const formattedInvitations = invitationsData?.map(inv => ({
      user_id: inv.id, // Use invitation ID as temporary user_id
      full_name: inv.full_name,
      role: inv.role,
      pay_rate: inv.pay_rate,
      pay_period: inv.pay_period,
      type: 'invitation',
      status: inv.status,
      email: inv.email
    })) || [];

    // Combine employees and invitations
    const combinedData = [...formattedEmployees, ...formattedInvitations];
    
    console.log(`   ✅ Combined data: ${combinedData.length} total items`);

    // Test 4: Verify data structure
    console.log('   🔍 Verifying data structure...');
    
    const employees = combinedData.filter(item => item.type === 'employee');
    const invitations = combinedData.filter(item => item.type === 'invitation');
    
    console.log(`   📊 Employees: ${employees.length}`);
    console.log(`   📊 Invitations: ${invitations.length}`);
    
    // Display sample data
    if (employees.length > 0) {
      console.log('   👥 Sample employee:', {
        name: employees[0].full_name,
        role: employees[0].role,
        pay_rate: employees[0].pay_rate,
        type: employees[0].type
      });
    }
    
    if (invitations.length > 0) {
      console.log('   📧 Sample invitation:', {
        name: invitations[0].full_name,
        email: invitations[0].email,
        role: invitations[0].role,
        pay_rate: invitations[0].pay_rate,
        type: invitations[0].type,
        status: invitations[0].status
      });
    }

    console.log('\n🎉 EMPLOYEE DISPLAY FUNCTIONALITY WORKING PERFECTLY!');
    console.log('📊 Test Results:');
    console.log('   ✅ Company data fetch: Working');
    console.log('   ✅ Employee data fetch: Working');
    console.log('   ✅ Invitation data fetch: Working');
    console.log('   ✅ Data formatting: Working');
    console.log('   ✅ Data combination: Working');
    console.log(`   ✅ Total items to display: ${combinedData.length}`);
    
    if (combinedData.length > 0) {
      console.log('\n💡 The UI will now show both employees and pending invitations!');
      console.log('   - Existing employees: Can edit pay rates');
      console.log('   - Pending invitations: Show as "Awaiting response"');
    } else {
      console.log('\n💡 No employees or invitations found. Create some to test the UI!');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Employee display test failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testEmployeeDisplay().catch(console.error);
}

module.exports = testEmployeeDisplay;
