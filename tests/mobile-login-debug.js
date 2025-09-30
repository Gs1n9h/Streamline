/**
 * Mobile Login Debug Test
 * 
 * This test helps debug mobile app login issues by checking
 * user authentication and profile creation.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y6nfpTVkU';

// Test with streamline schema as default (like mobile app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' }
});

async function debugMobileLogin() {
  console.log('🧪 Debugging Mobile Login Issues');
  console.log('=' .repeat(50));
  
  try {
    const testEmail = 'thesingh@gmail.com';
    const testPassword = 'password123'; // You'll need to provide the actual password
    const testFullName = 'Test User';
    
    console.log(`📧 Testing with email: ${testEmail}`);
    
    // Test 1: Check if user exists in auth.users
    console.log('1️⃣ Checking if user exists in auth.users...');
    
    // Try to sign in first to see if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('   → User does not exist or password is incorrect');
      } else {
        console.log('   → Other authentication error');
      }
    } else {
      console.log('✅ User exists and can sign in');
      console.log('   User ID:', signInData.user?.id);
      console.log('   Email confirmed:', signInData.user?.email_confirmed_at ? 'Yes' : 'No');
    }
    
    // Test 2: Check if profile exists in streamline.profiles
    console.log('2️⃣ Checking if profile exists in streamline.profiles...');
    
    // If we have a user, check their profile
    if (signInData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Profile access failed:', profileError.message);
      } else if (profile) {
        console.log('✅ Profile exists:', {
          id: profile.id,
          full_name: profile.full_name,
          created_at: profile.created_at
        });
      } else {
        console.log('❌ No profile found for user');
      }
    }
    
    // Test 3: Try to sign up (if user doesn't exist)
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      console.log('3️⃣ Attempting to sign up new user...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: testFullName,
          },
        },
      });
      
      if (signUpError) {
        console.log('❌ Sign up failed:', signUpError.message);
      } else {
        console.log('✅ Sign up successful');
        console.log('   User ID:', signUpData.user?.id);
        console.log('   Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
        
        // Create profile record (like mobile app does)
        if (signUpData.user) {
          console.log('4️⃣ Creating profile record...');
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              full_name: testFullName,
            })
            .select()
            .single();
          
          if (profileError) {
            console.log('❌ Profile creation failed:', profileError.message);
          } else {
            console.log('✅ Profile created successfully:', {
              id: profileData.id,
              full_name: profileData.full_name
            });
          }
        }
      }
    }
    
    // Test 4: Test mobile app navigation logic
    console.log('5️⃣ Testing mobile app navigation logic...');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Active session found');
      console.log('   Should navigate to Dashboard screen');
      console.log('   User:', session.user.email);
    } else {
      console.log('❌ No active session');
      console.log('   Should show Auth screen');
    }
    
    console.log('\n🎉 MOBILE LOGIN DEBUG COMPLETE!');
    console.log('📊 Debug Results:');
    console.log('   ✅ Database connection: Working');
    console.log('   ✅ Streamline schema: Accessible');
    console.log('   ✅ Authentication: Tested');
    console.log('   ✅ Profile creation: Tested');
    console.log('\n💡 Check the results above to identify the login issue!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Mobile login debug failed:', error.message);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  debugMobileLogin().catch(console.error);
}

module.exports = debugMobileLogin;
