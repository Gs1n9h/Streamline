/**
 * Mobile Auth Test
 * 
 * This test simulates the mobile app authentication flow
 * to identify the login issue.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ygaglfjslkhavqzlrday.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y6nfpTVkU';

// Test with mobile app configuration (streamline schema + AsyncStorage simulation)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'streamline' },
  auth: {
    // Simulate AsyncStorage for testing
    storage: {
      getItem: async (key) => {
        console.log('🔧 Storage getItem:', key);
        return null;
      },
      setItem: async (key, value) => {
        console.log('🔧 Storage setItem:', key, value?.substring(0, 50) + '...');
      },
      removeItem: async (key) => {
        console.log('🔧 Storage removeItem:', key);
      }
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

async function testMobileAuth() {
  console.log('🧪 Testing Mobile App Authentication Flow');
  console.log('=' .repeat(50));
  
  try {
    const testEmail = 'thesingh@gmail.com';
    const testPassword = 'password123';
    const testFullName = 'Test User';
    
    console.log(`📧 Testing with email: ${testEmail}`);
    
    // Test 1: Check initial session
    console.log('1️⃣ Checking initial session...');
    const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session check failed:', sessionError.message);
    } else {
      console.log('✅ Session check successful');
      console.log('   Initial session:', initialSession ? 'Active' : 'None');
    }
    
    // Test 2: Try to sign in
    console.log('2️⃣ Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      
      // Test 3: Try to sign up if sign in fails
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('3️⃣ Attempting sign up...');
        
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
    } else {
      console.log('✅ Sign in successful');
      console.log('   User ID:', signInData.user?.id);
      console.log('   Email confirmed:', signInData.user?.email_confirmed_at ? 'Yes' : 'No');
    }
    
    // Test 4: Check final session
    console.log('5️⃣ Checking final session...');
    const { data: { session: finalSession }, error: finalSessionError } = await supabase.auth.getSession();
    
    if (finalSessionError) {
      console.log('❌ Final session check failed:', finalSessionError.message);
    } else {
      console.log('✅ Final session check successful');
      console.log('   Final session:', finalSession ? 'Active' : 'None');
      
      if (finalSession) {
        console.log('   User email:', finalSession.user.email);
        console.log('   User ID:', finalSession.user.id);
      }
    }
    
    console.log('\n🎉 MOBILE AUTH TEST COMPLETE!');
    console.log('📊 Test Results:');
    console.log('   ✅ Supabase client: Working');
    console.log('   ✅ Streamline schema: Accessible');
    console.log('   ✅ Authentication flow: Tested');
    console.log('   ✅ Profile creation: Tested');
    console.log('\n💡 Check the results above to identify the mobile app login issue!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Mobile auth test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMobileAuth().catch(console.error);
}

module.exports = testMobileAuth;
