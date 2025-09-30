import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://ygaglfjslkhavqzlrday.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWdsZmpzbGtoYXZxemxyZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTg4MTMsImV4cCI6MjA2NjI5NDgxM30.iV2fdzzN165FwsvCaWYb-xbdUyt8whl0y5u6nfpTVkU'

// Initialize the mobile client with streamline schema as default
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'streamline' },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

console.log('🔧 Mobile Supabase Client Created:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  clientExists: !!supabase
});

